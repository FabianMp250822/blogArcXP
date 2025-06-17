
'use server';

import { z } from 'zod';
import { createArticleFromDashboard } from '@/lib/firebase/firestore';
import { uploadFile } from '@/lib/firebase/storage';
import type { Article } from '@/types';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/firebase/config';

function generateSlug(title: string): string {
  return title
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
  authorId: z.string().min(1, 'Author ID is required.'), // This will be passed in
  categoryId: z.string().min(1, 'Category is required.'),
  coverImage: z.instanceof(File).refine(file => file.size > 0, 'Cover image is required.').refine(file => file.size < 5 * 1024 * 1024, 'Cover image must be less than 5MB.'),
});


export type CreateDashboardArticleFormState = {
  message: string;
  errors?: {
    title?: string[];
    excerpt?: string[];
    content?: string[];
    authorId?: string[];
    categoryId?: string[];
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
  
  const authorIdFromForm = formData.get('authorId') as string;
  if (currentUser.uid !== authorIdFromForm) {
     return { message: 'Author ID mismatch.', success: false, errors: { _form: ['Invalid author information.'] } };
  }

  const validatedFields = ArticleSchema.safeParse({
    title: formData.get('title'),
    excerpt: formData.get('excerpt'),
    content: formData.get('content'),
    authorId: authorIdFromForm, // Use validated authorId
    categoryId: formData.get('categoryId'),
    coverImage: formData.get('coverImage'),
  });

  if (!validatedFields.success) {
    return {
      message: 'Validation failed. Please check the form fields.',
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }

  const { coverImage, ...articleData } = validatedFields.data;
  const slug = generateSlug(articleData.title);

  try {
    const imageFileName = `${slug}-${Date.now()}-${coverImage.name}`;
    const imagePath = `articles/${imageFileName}`;
    const coverImageUrl = await uploadFile(coverImage, imagePath);

    const newArticleData: Omit<Article, 'id' | 'createdAt' | 'publishedAt' | 'authorName' | 'categoryName' | 'slug'> = {
      ...articleData,
      status: 'draft', // Default to draft
      coverImageUrl,
    };

    await createArticleFromDashboard(newArticleData, slug);

    revalidatePath('/dashboard');
    revalidatePath('/'); // Revalidate home if new drafts might affect listings (though unlikely for drafts)

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
