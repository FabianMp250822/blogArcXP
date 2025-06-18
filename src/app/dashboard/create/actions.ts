
'use server';

import { z } from 'zod';
import { createArticleFromDashboard, createCategory } from '@/lib/firebase/firestore'; // Added createCategory
import { uploadFile } from '@/lib/firebase/storage';
import type { Article } from '@/types';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/firebase/config';

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
  authorId: z.string().min(1, 'Author ID is required.'), 
  categoryId: z.string().min(1, 'Category selection or creation is required.'),
  newCategoryName: z.string().optional(),
  coverImage: z.instanceof(File).refine(file => file.size > 0, 'Cover image is required.').refine(file => file.size < 5 * 1024 * 1024, 'Cover image must be less than 5MB.'),
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
    _form?: string[];
  };
  success: boolean;
};

export async function createArticleAction(
  prevState: CreateDashboardArticleFormState,
  formData: FormData
): Promise<CreateDashboardArticleFormState> {
  
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return { message: 'User not authenticated.', success: false, errors: { _form: ['Authentication required.'] } };
  }
  
  const authorIdFromForm = formData.get('authorId') as string; // This comes from the page logic now
  if (currentUser.uid !== authorIdFromForm) {
     return { message: 'Author ID mismatch.', success: false, errors: { _form: ['Invalid author information.'] } };
  }

  const rawFormData = {
    title: formData.get('title'),
    excerpt: formData.get('excerpt'),
    content: formData.get('content'),
    authorId: authorIdFromForm,
    categoryId: formData.get('categoryId'),
    newCategoryName: formData.get('newCategoryName') || undefined,
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
    if (selectedCategoryId === CREATE_NEW_CATEGORY_VALUE && newCategoryName) {
        const categorySlug = generateSlug(newCategoryName);
        try {
            finalCategoryId = await createCategory(newCategoryName, categorySlug);
            revalidatePath('/admin/categories'); 
            revalidatePath('/dashboard/create'); // Revalidate this form
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
      ...articleData,
      title, // ensure title is included
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
