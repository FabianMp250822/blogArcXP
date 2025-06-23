'use server';

import { z } from 'zod';
import { createFirestoreArticle, createCategory } from '@/lib/firebase/firestore';
import { uploadFile } from '@/lib/firebase/storage';
import type { Article } from '@/types';
import { revalidatePath } from 'next/cache';
import admin from '@/lib/firebase/admin';


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

const ArticleSchema = z.object({
  title: z.string().min(5, 'El título debe tener al menos 5 caracteres.'),
  excerpt: z.string().min(10, 'El extracto debe tener al menos 10 caracteres.').max(300, 'El extracto debe tener como máximo 300 caracteres.'),
  content: z.string().min(50, 'El contenido debe tener al menos 50 caracteres.'),
  authorId: z.string().min(1, 'El autor es obligatorio.'),
  categoryId: z.string().min(1, 'Seleccionar o crear una categoría es obligatorio.'),
  newCategoryName: z.string().optional(),
  coverImage: z.instanceof(File)
    .refine(file => file.size > 0, 'La imagen de portada es obligatoria.')
    .refine(file => file.size < 5 * 1024 * 1024, 'La imagen de portada debe ser menor a 5MB.'),
  idToken: z.string().min(1, 'El token de autenticación es obligatorio.'),
})
.superRefine((data, ctx) => {
  if (data.categoryId === CREATE_NEW_CATEGORY_VALUE && (!data.newCategoryName || data.newCategoryName.trim().length < 2)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'El nombre de la nueva categoría debe tener al menos 2 caracteres.',
      path: ['newCategoryName'],
    });
  }
  if (data.categoryId !== CREATE_NEW_CATEGORY_VALUE && data.newCategoryName && data.newCategoryName.trim().length > 0) {
     ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'El nombre de la nueva categoría solo debe proporcionarse cuando se selecciona "Crear nueva categoría...".',
      path: ['newCategoryName'],
    });
  }
});

export type CreateArticleFormState = {
  message: string;
  errors?: {
    title?: string[];
    excerpt?: string[];
    content?: string[];
    authorId?: string[];
    categoryId?: string[];
    newCategoryName?: string[];
    status?: string[];
    coverImage?: string[];
    idToken?: string[];
    _form?: string[];
  };
  success: boolean;
};

export async function createArticleAction(
  prevState: CreateArticleFormState,
  formData: FormData
): Promise<CreateArticleFormState> {

  if (!admin.apps.length) {
    return {
        message: `El SDK de Firebase Admin no está inicializado. Revisa los logs del servidor.`,
        success: false,
        errors: { _form: [`Error crítico de configuración del servidor.`] }
    };
  }

  const idToken = formData.get('idToken') as string;
  if (!idToken) {
    return { message: 'Falta el token de autenticación del administrador.', success: false, errors: { _form: ['Autenticación requerida.'] } };
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    if (decodedToken.role !== 'admin') {
      return { message: 'Permiso denegado. Solo los administradores pueden crear artículos aquí.', success: false, errors: { _form: ['Acción no autorizada.'] } };
    }
  } catch (error) {
    console.error("Error verificando el token de administrador:", error);
    return { message: 'No se pudo verificar el estado de administrador.', success: false, errors: { _form: ['Falló la verificación de administrador.'] } };
  }

  const rawFormData = {
    title: formData.get('title'),
    excerpt: formData.get('excerpt'),
    content: formData.get('content'),
    authorId: formData.get('authorId'),
    categoryId: formData.get('categoryId'),
    newCategoryName: formData.get('newCategoryName') || undefined,
    status: formData.get('status'),
    coverImage: formData.get('coverImage'),
    idToken: idToken,
  };

  const validatedFields = ArticleSchema.safeParse(rawFormData);

  if (!validatedFields.success) {
    return {
      message: 'Validación fallida. Por favor revisa los campos del formulario.',
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }

  const { coverImage, title, newCategoryName, categoryId: selectedCategoryId, idToken: _, ...articleData } = validatedFields.data;
  const slug = generateSlug(title);
  let finalCategoryId = selectedCategoryId;

  try {
    if (selectedCategoryId === CREATE_NEW_CATEGORY_VALUE && newCategoryName) {
        const categorySlug = generateSlug(newCategoryName);
        try {
            finalCategoryId = await createCategory(newCategoryName, categorySlug);
            revalidatePath('/admin/categories');
            revalidatePath('/admin/create');
            revalidatePath('/dashboard/create');
        } catch (categoryError: any) {
            return {
                message: `No se pudo crear la nueva categoría: ${categoryError.message}`,
                errors: { newCategoryName: [categoryError.message], _form: [`No se pudo crear la nueva categoría: ${categoryError.message}`] },
                success: false,
            };
        }
    } else if (selectedCategoryId === CREATE_NEW_CATEGORY_VALUE && !newCategoryName) {
         return {
            message: 'El nombre de la nueva categoría es obligatorio cuando se selecciona "Crear nueva categoría...".',
            errors: { newCategoryName: ['El nombre de la nueva categoría es obligatorio.'] },
            success: false,
         };
    }

    const imageFileName = `${slug}-${Date.now()}-${coverImage.name}`;
    const imagePath = `articles/${imageFileName}`;
    // SUBIR imagen a Storage y guardar solo la URL
    const coverImageUrl = await uploadFile(coverImage, imagePath);

    const newArticleData: Omit<Article, 'id' | 'createdAt' | 'publishedAt' | 'authorName' | 'categoryName'> = {
      ...articleData,
      title,
      slug,
      coverImageUrl, // Solo la URL, nunca el archivo/base64
      categoryId: finalCategoryId,
      status: 'pending_review',
    };

    await createFirestoreArticle(newArticleData);

    revalidatePath('/');
    revalidatePath(`/articles/${slug}`);
    revalidatePath('/dashboard');

    return { message: '¡Artículo creado exitosamente!', success: true };

  } catch (error) {
    console.error('Error creando el artículo:', error);
    let errorMessage = 'Ocurrió un error inesperado.';
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
