'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import admin from '@/lib/firebase/admin';
import { updateFirestoreArticle } from '@/lib/firebase/firestore-admin';
import { uploadFile, deleteFileByUrl } from '@/lib/firebase/storage';
import { getArticleById } from '@/lib/firebase/firestore';

const UpdateArticleSchema = z.object({
  articleId: z.string().min(1, 'Article ID is required.'),
  idToken: z.string().min(1, 'Authentication token is required.'),
  publicationType: z.enum(['markdown', 'standard', 'pdf', 'sequence']),
  title: z.string().min(5, 'Title must be at least 5 characters long.'),
  categoryId: z.string().min(1, 'Category is required.'),
  excerpt: z.string().optional(),
  content: z.string().optional(),
  coverImage: z.instanceof(File).optional(),
  pdfFile: z.instanceof(File).optional(),
  // Para secciones de secuencia
  sections: z.array(z.object({
    image: z.instanceof(File).optional(),
    text: z.string().min(10, 'Text must be at least 10 characters.'),
  })).optional(),
});

export type UpdateArticleFormState = {
  message: string;
  errors?: {
    articleId?: string[];
    title?: string[];
    excerpt?: string[];
    content?: string[];
    categoryId?: string[];
    coverImage?: string[];
    pdfFile?: string[];
    sections?: string[];
    idToken?: string[];
    _form?: string[];
  };
  success: boolean;
  updatedArticleSlug?: string;
};

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

export async function updateArticleAction(
  prevState: UpdateArticleFormState,
  formData: FormData
): Promise<UpdateArticleFormState> {
  
  if (!admin.apps.length) {
    return {
      message: 'Firebase Admin SDK not initialized.',
      success: false,
      errors: { _form: ['Server configuration error.'] }
    };
  }

  // Extraer el token de autenticación
  const idToken = formData.get('idToken') as string;
  if (!idToken) {
    return { 
      message: 'Authentication token missing.', 
      success: false, 
      errors: { _form: ['Authentication required.'] } 
    };
  }

  // Verificar el token
  let decodedToken;
  try {
    decodedToken = await admin.auth().verifyIdToken(idToken);
  } catch (error) {
    console.error("Error verifying ID token:", error);
    return { 
      message: 'Invalid authentication session.', 
      success: false, 
      errors: { _form: ['Your session is invalid. Please log in again.'] } 
    };
  }

  const authenticatedUserUid = decodedToken.uid;
  const userRole = decodedToken.role as string || 'user';

  // Obtener el artículo existente para verificar permisos
  const articleId = formData.get('articleId') as string;
  const existingArticle = await getArticleById(articleId);
  
  if (!existingArticle) {
    return { 
      message: 'Article not found.', 
      success: false, 
      errors: { _form: ['Article does not exist.'] } 
    };
  }

  // Verificar permisos: admin o propietario del artículo
  if (userRole !== 'admin' && existingArticle.authorId !== authenticatedUserUid) {
    return { 
      message: 'Permission denied.', 
      success: false, 
      errors: { _form: ['You do not have permission to edit this article.'] } 
    };
  }

  // Construir los datos del formulario
  const rawFormData: any = {
    articleId,
    idToken,
    publicationType: formData.get('publicationType'),
    title: formData.get('title'),
    categoryId: formData.get('categoryId'),
  };

  const publicationType = formData.get('publicationType') as string;

  // Agregar campos específicos según el tipo
  if (publicationType === 'markdown' || publicationType === 'standard') {
    rawFormData.excerpt = formData.get('excerpt');
    rawFormData.content = formData.get('content');
  } else if (publicationType === 'pdf') {
    rawFormData.pdfFile = formData.get('pdfFile');
  } else if (publicationType === 'sequence') {
    const sections = [];
    let i = 0;
    while (formData.has(`sections[${i}][text]`)) {
      sections.push({
        image: formData.get(`sections[${i}][image]`),
        text: formData.get(`sections[${i}][text]`),
      });
      i++;
    }
    rawFormData.sections = sections;
  }

  rawFormData.coverImage = formData.get('coverImage');

  // Validar los datos
  const validatedFields = UpdateArticleSchema.safeParse(rawFormData);

  if (!validatedFields.success) {
    return {
      message: 'Validation failed. Please check the form fields.',
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }

  const { title, categoryId, coverImage, excerpt, content, pdfFile, sections } = validatedFields.data;
  const slug = generateSlug(title);

  try {
    // Preparar los datos de actualización
    const updateData: any = {
      title,
      slug,
      categoryId,
    };

    // Manejar imagen de portada si se proporciona una nueva
    if (coverImage && coverImage.size > 0) {
      // Eliminar imagen anterior si existe
      if ((existingArticle as any).coverImageUrl) {
        await deleteFileByUrl((existingArticle as any).coverImageUrl);
      }
      
      const imageFileName = `${slug}-${Date.now()}-${coverImage.name}`;
      const imagePath = `articles/${imageFileName}`;
      // SUBIR imagen a Storage y guardar solo la URL
      const coverImageUrl = await uploadFile(coverImage, imagePath);
      updateData.coverImageUrl = coverImageUrl; // Solo la URL
    }

    // Campos específicos según el tipo
    switch (publicationType) {
      case 'markdown':
      case 'standard':
        if (excerpt !== undefined) updateData.excerpt = excerpt;
        if (content !== undefined) updateData.content = content;
        break;
      
      case 'pdf':
        if (pdfFile && pdfFile.size > 0) {
          // Eliminar PDF anterior si existe
          if ((existingArticle as any).pdfUrl) {
            await deleteFileByUrl((existingArticle as any).pdfUrl);
          }
          
          const pdfFileName = `${slug}-${Date.now()}-${pdfFile.name}`;
          const pdfPath = `publications/pdf/${pdfFileName}`;
          const pdfUrl = await uploadFile(pdfFile, pdfPath);
          updateData.pdfUrl = pdfUrl;
        }
        break;
      
      case 'sequence':
        if (sections && sections.length > 0) {
          const uploadedSections = await Promise.all(
            sections.map(async (section, index) => {
              if (section.image && section.image.size > 0) {
                const imageFileName = `${slug}-section-${index}-${Date.now()}-${section.image.name}`;
                const imagePath = `publications/sequence/${imageFileName}`;
                const imageUrl = await uploadFile(section.image, imagePath);
                return {
                  image: imageUrl,
                  text: section.text,
                };
              } else {
                // Mantener imagen existente si no se proporciona nueva
                const existingSections = (existingArticle as any).sections || [];
                return {
                  image: existingSections[index]?.image || '',
                  text: section.text,
                };
              }
            })
          );
          updateData.sections = uploadedSections;
        }
        break;
    }

    // Actualizar el artículo en Firestore
    await updateFirestoreArticle(articleId, updateData);

    // Revalidar las rutas relevantes
    revalidatePath('/dashboard');
    revalidatePath('/');
    revalidatePath(`/articles/${slug}`);

    return { 
      message: 'Article updated successfully!', 
      success: true,
      updatedArticleSlug: slug
    };

  } catch (error) {
    console.error('Error updating article:', error);
    let errorMessage = 'An unexpected error occurred while updating the article.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return {
      message: errorMessage,
      errors: { _form: [errorMessage] },
      success: false,
    };
  }
}
