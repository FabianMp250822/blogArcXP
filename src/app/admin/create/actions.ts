
'use server';

import { z } from 'zod';
import { createFirestoreArticle, createCategory } from '@/lib/firebase/firestore'; // Added createCategory
import { uploadFile } from '@/lib/firebase/storage';
import type { Article } from '@/types';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/firebase/config';

const CREATE_NEW_CATEGORY_VALUE = '__CREATE_NEW__';

// Helper to generate a slug from title or category name
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
  status: z.enum(['draft', 'published']),
  coverImage: z.instanceof(File).refine(file => file.size > 0, 'Cover image is required.').refine(file => file.size < 5 * 1024 * 1024, 'Cover image must be less than 5MB.'),
}).superRefine((data, ctx) => {
  if (data.categoryId === CREATE_NEW_CATEGORY_VALUE && (!data.newCategoryName || data.newCategoryName.trim().length < 2)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'New category name must be at least 2 characters.',
      path: ['newCategoryName'], // Target the newCategoryName field for error
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
    _form?: string[];
  };
  success: boolean;
};

export async function createArticleAction(
  prevState: CreateArticleFormState,
  formData: FormData
): Promise<CreateArticleFormState> {
  
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return { message: 'User not authenticated.', success: false, errors: { _form: ['Authentication required.'] } };
  }
  
  const idTokenResult = await currentUser.getIdTokenResult(true);
  const isAdmin = idTokenResult.claims.role === 'admin';
  if (!isAdmin) {
    return { message: 'Permission denied. Only admins can create articles here.', success: false, errors: { _form: ['Unauthorized action.'] } };
  }

  const rawFormData = {
    title: formData.get('title'),
    excerpt: formData.get('excerpt'),
    content: formData.get('content'),
    authorId: formData.get('authorId'),
    categoryId: formData.get('categoryId'),
    newCategoryName: formData.get('newCategoryName') || undefined, // Ensure it's undefined if empty
    status: formData.get('status'),
    coverImage: formData.get('coverImage'),
  };
  
  const validatedFields = ArticleSchema.safeParse(rawFormData);

  if (!validatedFields.success) {
    return {
      message: 'Validation failed. Please check the form fields.',
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }

  const { coverImage, title, newCategoryName, categoryId: selectedCategoryId, ...articleData } = validatedFields.data;
  const slug = generateSlug(title); 
  let finalCategoryId = selectedCategoryId;

  try {
    // 1. Handle Category: Create if new, otherwise use existing
    if (selectedCategoryId === CREATE_NEW_CATEGORY_VALUE && newCategoryName) {
        const categorySlug = generateSlug(newCategoryName);
        try {
            finalCategoryId = await createCategory(newCategoryName, categorySlug); // createCategory returns the new category ID
            revalidatePath('/admin/categories'); // Revalidate if a new category was made
            revalidatePath('/admin/create'); // Revalidate this form to update category list
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


    // 2. Upload image to Cloud Storage
    const imageFileName = `${slug}-${Date.now()}-${coverImage.name}`;
    const imagePath = `articles/${imageFileName}`;
    const coverImageUrl = await uploadFile(coverImage, imagePath);

    // 3. Create article data for Firestore
    const newArticleData: Omit<Article, 'id' | 'createdAt' | 'publishedAt' | 'authorName' | 'categoryName'> = {
      ...articleData,
      title, // Ensure title is included from validated data
      slug,
      coverImageUrl,
      categoryId: finalCategoryId, // Use the resolved category ID
    };

    // 4. Create document in Firestore
    await createFirestoreArticle(newArticleData);

    // Revalidate paths
    revalidatePath('/');
    revalidatePath(`/articles/${slug}`);
    revalidatePath('/dashboard'); // Revalidate dashboard if articles appear there

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
