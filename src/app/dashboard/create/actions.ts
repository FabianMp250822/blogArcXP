'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import admin from '@/lib/firebase/admin';
// --- CORRECCIÓN: Importa desde los archivos de admin ---
import { createFirestoreArticle, createCategory } from '@/lib/firebase/firestore-admin';
import { uploadFile } from '@/lib/firebase/storage';
// --- MODIFICADO: Importa todos los tipos de Artículos usando una ruta relativa ---
import type { Article, MarkdownArticle, PdfPublication, SequencePublication } from '../../../types';


const CREATE_NEW_CATEGORY_VALUE = '__CREATE_NEW__';

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

// --- MODIFICADO: Esquema Zod para entorno Node (sin FileList/File) ---
const PublicationSchema = z.object({
  publicationType: z.enum(['markdown', 'pdf', 'sequence']),
  title: z.string().min(5, 'El título debe tener al menos 5 caracteres.'),
  authorId: z.string().min(1, 'Se requiere el ID del autor.'),
  categoryId: z.string().min(1, 'Se requiere seleccionar o crear una categoría.'),
  newCategoryName: z.string().optional(),
  idToken: z.string().min(1, 'Se requiere el token de autenticación.'),
  // Añadido: Validar archivos como opcionales (no se valida tipo aquí)
  coverImage: z.any().optional(),
  pdfFile: z.any().optional(),
  excerpt: z.string()
    .min(10, 'El extracto debe tener al menos 10 caracteres.')
    .max(300, 'Máximo 300 caracteres.'),
  content: z.string().optional(),
  sections: z
    .array(
      z.object({
        image: z.any(), // No se valida el tipo File aquí
        text: z.string().nullable(),
      })
    )
    .optional(),
}).superRefine<{
  publicationType: 'markdown' | 'pdf' | 'sequence';
  title: string;
  authorId: string;
  categoryId: string;
  newCategoryName?: string;
  idToken: string;
  coverImage?: unknown;
  pdfFile?: unknown;
  excerpt: string;
  content?: string;
  sections?: { image: unknown; text: string | null }[];
}>((data, ctx) => {
  if (data.categoryId === CREATE_NEW_CATEGORY_VALUE && (!data.newCategoryName || data.newCategoryName.trim().length < 2)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'El nombre de la nueva categoría debe tener al menos 2 caracteres.',
      path: ['newCategoryName'],
    });
  }
  // excerpt ya es obligatorio, solo validamos el resto
  switch (data.publicationType) {
    case 'markdown':
      if (!data.content || data.content.length < 50) ctx.addIssue({ code: 'custom', message: 'El contenido debe tener al menos 50 caracteres.', path: ['content'] });
      break;
    case 'pdf':
      if (!data.pdfFile) ctx.addIssue({ code: 'custom', message: 'Se requiere un archivo PDF.', path: ['pdfFile'] });
      break;
    case 'sequence':
      if (!data.sections || data.sections.length < 1) {
        ctx.addIssue({ code: 'custom', message: 'Se requiere al menos una sección.', path: ['sections'] });
      }
      break;
  }
});


export type CreateDashboardArticleFormState = {
  message: string;
  errors?: {
    publicationType?: string[];
    title?: string[];
    excerpt?: string[];
    content?: string[];
    authorId?: string[];
    categoryId?: string[];
    newCategoryName?: string[];
    coverImage?: string[];
    pdfFile?: string[];
    sections?: string[];
    idToken?: string[];
    _form?: string[];
  };
  success: boolean;
};

export async function createArticleAction(
  prevState: CreateDashboardArticleFormState,
  formData: FormData
): Promise<CreateDashboardArticleFormState> {

  if (!admin.apps.length) {
    return {
        message: `Firebase Admin SDK no está inicializado. Revisa los logs del servidor.`,
        success: false,
        errors: { _form: [`Error crítico de configuración del servidor.`] }
    };
  }

  const idToken = formData.get('idToken') as string;
  if (!idToken) {
    return { message: 'Authentication token missing.', success: false, errors: { _form: ['Authentication token is required.'] } };
  }

  let decodedToken;
  try {
    decodedToken = await admin.auth().verifyIdToken(idToken);
  } catch (error) {
    console.error("Error verifying ID token:", error);
    return { message: 'Invalid authentication session.', success: false, errors: { _form: ['Your session is invalid. Please log in again.'] } };
  }

  const authenticatedUserUid = decodedToken.uid;
  const authorIdFromForm = formData.get('authorId') as string;

  if (authenticatedUserUid !== authorIdFromForm) {
     return { message: 'Author ID mismatch or unauthorized.', success: false, errors: { _form: ['Invalid author information or not authorized.'] } };
  }

  // Extrae archivos manualmente
  const coverImage = formData.get('coverImage') as File | null;
  const pdfFile = formData.get('pdfFile') as File | null;

  // Validación manual de imagen de portada (siempre obligatoria)
  if (!coverImage || typeof coverImage !== 'object' || !('size' in coverImage)) {
    return {
      message: 'Se requiere una imagen de portada.',
      errors: { coverImage: ['Se requiere una imagen de portada.'] },
      success: false,
    };
  }
  if (coverImage.size > 5 * 1024 * 1024) {
    return {
      message: 'La imagen de portada debe ser menor a 5MB.',
      errors: { coverImage: ['La imagen de portada debe ser menor a 5MB.'] },
      success: false,
    };
  }
  if (!coverImage.type.startsWith('image/')) {
    return {
      message: 'Solo se permiten archivos de imagen.',
      errors: { coverImage: ['Solo se permiten archivos de imagen.'] },
      success: false,
    };
  }

  // Validación manual para PDF si corresponde
  if (formData.get('publicationType') === 'pdf') {
    // Cambia esta línea:
    // if (!pdfFile || typeof pdfFile !== 'object' || !('size' in pdfFile)) {
    // Por esta validación más flexible:
    if (!pdfFile || typeof pdfFile !== 'object' || typeof (pdfFile as any).size !== 'number') {
      return {
        message: 'Se requiere un archivo PDF.',
        errors: { pdfFile: ['Se requiere un archivo PDF.'] },
        success: false,
      };
    }
    if ((pdfFile as any).size > 25 * 1024 * 1024) {
      return {
        message: 'El archivo PDF debe ser menor a 25MB.',
        errors: { pdfFile: ['El archivo PDF debe ser menor a 25MB.'] },
        success: false,
      };
    }
    if ((pdfFile as any).type !== 'application/pdf') {
      return {
        message: 'Solo se permiten archivos PDF.',
        errors: { pdfFile: ['Solo se permiten archivos PDF.'] },
        success: false,
      };
    }
  }

  let sections: { image: File; text: string | null }[] | undefined = undefined;
  if (formData.get('publicationType') === 'sequence') {
    sections = [];
    let i = 0;
    while (formData.has(`sections[${i}][image]`)) {
      const sectionImage = formData.get(`sections[${i}][image]`) as File | null;
      const sectionTextEntry = formData.get(`sections[${i}][text]`);
      const sectionText = typeof sectionTextEntry === 'string' ? sectionTextEntry : null;
      // Solo agrega si hay imagen y texto
      if (sectionImage && sectionText) {
        sections.push({
          image: sectionImage,
          text: sectionText,
        });
      }
      i++;
    }
    // Si no hay secciones válidas, deja como undefined
    if (sections.length === 0) {
      sections = undefined;
    }
  }

  // --- MODIFICADO: Construcción de rawFormData para el nuevo esquema ---
  const rawFormData: any = {
    publicationType: formData.get('publicationType') as 'markdown' | 'pdf' | 'sequence',
    title: formData.get('title'),
    authorId: formData.get('authorId'),
    categoryId: formData.get('categoryId'),
    newCategoryName: formData.get('newCategoryName') || undefined,
    idToken: idToken,
    coverImage: coverImage ?? undefined,
    excerpt: formData.get('excerpt'),
    content: formData.get('content'),
    pdfFile: pdfFile ?? undefined,
    sections, // undefined si no corresponde
  };

  const validatedFields = PublicationSchema.safeParse(rawFormData);

  if (!validatedFields.success) {
    // --- NUEVO: Mostrar el error de validación detallado en consola ---
    console.error('Zod validation error:', validatedFields.error);

    // NUEVO: Extraer el primer mensaje de error específico para mostrarlo al usuario
    const fieldErrors = validatedFields.error.flatten().fieldErrors;
    let firstErrorMsg = 'Falló la validación. Por favor revisa los campos del formulario.';
    for (const key in fieldErrors) {
      const typedKey = key as keyof typeof fieldErrors;
      if (fieldErrors[typedKey] && fieldErrors[typedKey]!.length > 0) {
        firstErrorMsg = fieldErrors[typedKey]![0];
        break;
      }
    }

    return {
      message: firstErrorMsg,
      errors: fieldErrors,
      success: false,
    };
  }

  const { title, newCategoryName, categoryId: selectedCategoryId } = validatedFields.data;
  const slug = generateSlug(title);
  let finalCategoryId = selectedCategoryId;

  try {
    if (selectedCategoryId === CREATE_NEW_CATEGORY_VALUE && newCategoryName) {
        const categorySlug = generateSlug(newCategoryName);
        try {
            finalCategoryId = await createCategory(newCategoryName, categorySlug);
            revalidatePath('/admin/categories');
            revalidatePath('/dashboard/create');
            revalidatePath('/admin/create');
        } catch (categoryError: any) {
            return {
                message: `Failed to create new category: ${categoryError.message}`,
                errors: { newCategoryName: [categoryError.message], _form: [`Failed to create new category: ${categoryError.message}`] },
                success: false,
            };
        }
    } else if (selectedCategoryId === CREATE_NEW_CATEGORY_VALUE && !newCategoryName) {
         return {
            message: 'New category name is required when "Create new category..." is selected.',
            errors: { newCategoryName: ['New category name is required.'] },
            success: false,
         };
    }

    // --- MODIFICADO: Lógica de creación de artículo basada en el tipo ---
    let newArticleData: Omit<Article, 'id' | 'createdAt' | 'publishedAt' | 'authorName' | 'categoryName' | 'slug'>;

    switch (validatedFields.data.publicationType) {
      case 'markdown': {
        const { coverImage, excerpt, content } = validatedFields.data;
        // Asegura que excerpt y content sean strings no vacíos
        if (
          !coverImage ||
          typeof excerpt !== 'string' ||
          excerpt.trim().length === 0 ||
          typeof content !== 'string' ||
          content.trim().length === 0
        ) {
          throw new Error("Faltan datos para el artículo de tipo Markdown.");
        }
        const imageFileName = `${slug}-${Date.now()}-${coverImage.name}`;
        const imagePath = `articles/${imageFileName}`;
        // SUBIR imagen a Storage y guardar solo la URL
        const coverImageUrl = await uploadFile(coverImage, imagePath);

        newArticleData = {
          type: 'markdown',
          title,
          excerpt,
          content,
          coverImageUrl, // Solo la URL, nunca el archivo/base64
          authorId: authenticatedUserUid,
          status: 'draft',
          categoryId: finalCategoryId,
        } as Omit<MarkdownArticle, 'id' | 'createdAt' | 'publishedAt' | 'authorName' | 'categoryName' | 'slug'>;
        break;
      }

      case 'pdf': {
        const { pdfFile, coverImage, excerpt } = validatedFields.data;
        if (!pdfFile) {
            throw new Error("Falta el archivo PDF.");
        }
        if (!coverImage) {
            throw new Error("Falta la imagen de portada.");
        }
        // Sube la imagen de portada
        const imageFileName = `${slug}-${Date.now()}-${coverImage.name}`;
        const imagePath = `articles/${imageFileName}`;
        const coverImageUrl = await uploadFile(coverImage, imagePath);

        // Sube el PDF
        const pdfFileName = `${slug}-${Date.now()}-${pdfFile.name}`;
        const pdfPath = `publications/pdf/${pdfFileName}`;
        const pdfUrl = await uploadFile(pdfFile, pdfPath);

        newArticleData = {
          type: 'pdf',
          title,
          pdfUrl,
          coverImageUrl, // <-- Guarda la URL de la portada
          excerpt: typeof excerpt === 'string' ? excerpt : '',
          authorId: authenticatedUserUid,
          status: 'draft',
          categoryId: finalCategoryId,
        } as Omit<PdfPublication, 'id' | 'createdAt' | 'publishedAt' | 'authorName' | 'categoryName' | 'slug'>;
        break;
      }

      case 'sequence': {
        const { sections } = validatedFields.data;
        if (!sections || sections.length === 0) {
            throw new Error("Faltan secciones para la publicación de tipo secuencia.");
        }

        // SUBIR cada imagen de sección a Storage y guardar solo la URL
        const uploadedSections = await Promise.all(
          sections.map(async (section, index) => {
            const imageFileName = `${slug}-section-${index}-${Date.now()}-${section.image.name}`;
            const imagePath = `publications/sequence/${imageFileName}`;
            const imageUrl = await uploadFile(section.image, imagePath);
            return {
              image: imageUrl,
              text: section.text,
            };
          })
        );

        newArticleData = {
          type: 'sequence',
          title,
          sections: uploadedSections,
          authorId: authenticatedUserUid,
          status: 'draft',
          categoryId: finalCategoryId,
        } as Omit<SequencePublication, 'id' | 'createdAt' | 'publishedAt' | 'authorName' | 'categoryName' | 'slug'>;
        break;
      }
        
      default:
        return { message: 'Tipo de publicación no válido.', success: false };
    }


    await createFirestoreArticle({
      ...newArticleData,
      slug,
    });

    revalidatePath('/dashboard');
    revalidatePath('/');

    return { message: '¡Publicación guardada como borrador con éxito!', success: true };

  } catch (error) {
    console.error('Error creating article:', error);
    let errorMessage = 'An unexpected error occurred while creating the article.';
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

