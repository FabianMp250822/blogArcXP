
'use server';

import { z } from 'zod';
import { createArticleFromDashboard, createCategory } from '@/lib/firebase/firestore';
import { uploadFile } from '@/lib/firebase/storage';
import type { Article } from '@/types';
import { revalidatePath } from 'next/cache';
import * as admin from 'firebase-admin';

const CREATE_NEW_CATEGORY_VALUE = '__CREATE_NEW__';

let adminSDKError: string | null = null;
if (admin.apps.length === 0) {
  try {
    admin.initializeApp();
    if (admin.apps.length === 0) {
        throw new Error("admin.initializeApp() was called but admin.apps is still empty.");
    }
  } catch (e: any) {
    console.error('Firebase Admin SDK initialization error in createArticleAction (dashboard):', e);
    adminSDKError = e.message || "Unknown error during Firebase Admin SDK initialization.";
  }
}

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
  authorId: z.string().min(1, 'Author ID is required.'),
  categoryId: z.string().min(1, 'Category selection or creation is required.'),
  newCategoryName: z.string().optional(),
  coverImage: z.instanceof(File).refine(file => file.size > 0, 'Cover image is required.').refine(file => file.size < 5 * 1024 * 1024, 'Cover image must be less than 5MB.'),
  idToken: z.string().min(1, 'Authentication token is required.'),
}).superRefine((data, ctx) => {
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

export type CreateDashboardArticleFormState = {
  message: string;
  errors?: {
    title?: string[];
    excerpt?: string[];
    content?: string[];
    authorId?: string[];
    categoryId?: string[];
    newCategoryName?: string[];
    coverImage?: string[];
    idToken?: string[];
    _form?: string[];
  };
  success: boolean;
};

export async function createArticleAction(
  prevState: CreateDashboardArticleFormState,
  formData: FormData
): Promise<CreateDashboardArticleFormState> {

  if (admin.apps.length === 0) {
    const detail = adminSDKError ? `Details: ${adminSDKError}` : "Please check server logs for specific errors.";
    return {
        message: `Firebase Admin SDK failed to initialize. ${detail}`,
        success: false,
        errors: { _form: [`Critical: Admin SDK initialization failure. ${detail}`] }
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

  const rawFormData = {
    title: formData.get('title'),
    excerpt: formData.get('excerpt'),
    content: formData.get('content'),
    authorId: authorIdFromForm,
    categoryId: formData.get('categoryId'),
    newCategoryName: formData.get('newCategoryName') || undefined,
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

  const { coverImage, title, newCategoryName, categoryId: selectedCategoryId, ...articleDataFromSchema } = validatedFields.data;
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

    const imageFileName = `${slug}-${Date.now()}-${coverImage.name}`;
    const imagePath = `articles/${imageFileName}`;
    const coverImageUrl = await uploadFile(coverImage, imagePath);

    const newArticleData: Omit<Article, 'id' | 'createdAt' | 'publishedAt' | 'authorName' | 'categoryName' | 'slug'> = {
      title: articleDataFromSchema.title,
      excerpt: articleDataFromSchema.excerpt,
      content: articleDataFromSchema.content,
      authorId: authenticatedUserUid,
      status: 'draft',
      coverImageUrl,
      categoryId: finalCategoryId,
    };

    await createArticleFromDashboard(newArticleData, slug);

    revalidatePath('/dashboard');
    revalidatePath('/');

    return { message: 'Article saved as draft successfully!', success: true };

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
