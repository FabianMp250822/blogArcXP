
'use server';

import { z } from 'zod';
import { createArticle as createFirestoreArticle } from '@/lib/firebase/firestore';
import { uploadFile } from '@/lib/firebase/storage';
import type { Article } from '@/types';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/firebase/config'; // To get current user for authorId (if needed, though passed from client)

// Helper to generate a slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w-]+/g, '') // Remove all non-word chars
    .replace(/--+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text
}


const ArticleSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters long.'),
  excerpt: z.string().min(10, 'Excerpt must be at least 10 characters long.').max(300, 'Excerpt must be at most 300 characters long.'),
  content: z.string().min(50, 'Content must be at least 50 characters long.'),
  authorId: z.string().min(1, 'Author is required.'),
  categoryId: z.string().min(1, 'Category is required.'),
  status: z.enum(['draft', 'published']),
  coverImage: z.instanceof(File).refine(file => file.size > 0, 'Cover image is required.').refine(file => file.size < 5 * 1024 * 1024, 'Cover image must be less than 5MB.'),
});


export type CreateArticleFormState = {
  message: string;
  errors?: {
    title?: string[];
    excerpt?: string[];
    content?: string[];
    authorId?: string[];
    categoryId?: string[];
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
  
  // Basic auth check - in real app, use middleware or more robust check
  // const currentUser = auth.currentUser;
  // if (!currentUser) {
  //   return { message: 'User not authenticated.', success: false, errors: { _form: ['Authentication required.'] } };
  // }
  // TODO: Add server-side check for admin role if possible without client context. For now, assuming client-side layout handles admin auth.

  const validatedFields = ArticleSchema.safeParse({
    title: formData.get('title'),
    excerpt: formData.get('excerpt'),
    content: formData.get('content'),
    authorId: formData.get('authorId'),
    categoryId: formData.get('categoryId'),
    status: formData.get('status'),
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
  const slug = generateSlug(articleData.title); // Consider checking for slug uniqueness

  try {
    // 1. Upload image to Cloud Storage
    const imageFileName = `${slug}-${Date.now()}-${coverImage.name}`;
    const imagePath = `articles/${imageFileName}`;
    const coverImageUrl = await uploadFile(coverImage, imagePath);

    // 2. Create article data for Firestore
    const newArticleData: Omit<Article, 'id' | 'createdAt' | 'publishedAt' | 'authorName' | 'categoryName'> = {
      ...articleData,
      slug,
      coverImageUrl,
    };

    // 3. Create document in Firestore
    await createFirestoreArticle(newArticleData);

    // Revalidate paths
    revalidatePath('/');
    revalidatePath(`/articles/${slug}`);
    // If categories have their own pages, revalidate them too, e.g., using category slug.
    // For simplicity, not revalidating category pages here.

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
