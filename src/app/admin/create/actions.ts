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
  title: z.string().min(5, 'Title must be at least 5 characters long.'),
  excerpt: z.string().min(10, 'Excerpt must be at least 10 characters long.').max(300, 'Excerpt must be at most 300 characters long.'),
  content: z.string().min(50, 'Content must be at least 50 characters long.'),
  authorId: z.string().min(1, 'Author is required.'),
  categoryId: z.string().min(1, 'Category selection or creation is required.'),
  newCategoryName: z.string().optional(),
  coverImage: z.instanceof(File)
    .refine(file => file.size > 0, 'Cover image is required.')
    .refine(file => file.size < 5 * 1024 * 1024, 'Cover image must be less than 5MB.'),
  idToken: z.string().min(1, 'Authentication token is required.'),
})
.superRefine((data, ctx) => {
  if (data.categoryId === CREATE_NEW_CATEGORY_VALUE && (!data.newCategoryName || data.newCategoryName.trim().length < 2)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'New category name must be at least 2 characters.',
      path: ['newCategoryName'],
    });
  }
  if (data.categoryId !== CREATE_NEW_CATEGORY_VALUE && data.newCategoryName && data.newCategoryName.trim().length > 0) {
     ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'New category name should only be provided when "Create new category..." is selected.',
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
        message: `Firebase Admin SDK no está inicializado. Revisa los logs del servidor.`,
        success: false,
        errors: { _form: [`Error crítico de configuración del servidor.`] }
    };
  }

  const idToken = formData.get('idToken') as string;
  if (!idToken) {
    return { message: 'Admin authentication token missing.', success: false, errors: { _form: ['Authentication required.'] } };
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    if (decodedToken.role !== 'admin') {
      return { message: 'Permission denied. Only admins can create articles here.', success: false, errors: { _form: ['Unauthorized action.'] } };
    }
  } catch (error) {
    console.error("Error verifying admin ID token:", error);
    return { message: 'Could not verify admin status.', success: false, errors: { _form: ['Admin verification failed.'] } };
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
      message: 'Validation failed. Please check the form fields.',
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

    return { message: 'Article created successfully!', success: true };

  } catch (error) {
    console.error('Error creating article:', error);
    let errorMessage = 'An unexpected error occurred.';
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
