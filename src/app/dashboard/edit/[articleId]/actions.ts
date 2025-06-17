
'use server';

import { z } from 'zod';
import { updateFirestoreArticle, getArticleById } from '@/lib/firebase/firestore';
import { uploadFile, deleteFileByUrl } from '@/lib/firebase/storage';
import type { Article } from '@/types';
import { revalidatePath } from 'next/cache';
import { auth as clientAuth } from '@/lib/firebase/config'; // Client SDK for current user
import * as admin from 'firebase-admin'; // For admin role check server-side if needed, though client token is primary for this action

// Helper to generate a slug from title (if title changes, slug might need to)
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s+/g, '-') 
    .replace(/[^\w-]+/g, '') 
    .replace(/--+/g, '-') 
    .replace(/^-+/, '') 
    .replace(/-+$/, ''); 
}

// Schema for updating an article
// Cover image is optional during update
const UpdateArticleSchema = z.object({
  articleId: z.string().min(1, 'Article ID is required.'),
  title: z.string().min(5, 'Title must be at least 5 characters long.'),
  excerpt: z.string().min(10, 'Excerpt must be at least 10 characters.').max(300, 'Max 300 chars.'),
  content: z.string().min(50, 'Content must be at least 50 characters long.'),
  categoryId: z.string().min(1, 'Category is required.'),
  // status: z.enum(['draft', 'pending_review', 'published']), // Status change might be a separate action for admins
  coverImage: z.instanceof(File).optional() // Optional: only if a new image is uploaded
    .refine(file => !file || file.size <= 5 * 1024 * 1024, 'Cover image must be less than 5MB.')
    .refine(file => !file || file.type.startsWith('image/'), 'Only image files are allowed.'),
});

export type UpdateArticleFormState = {
  message: string;
  errors?: {
    articleId?: string[];
    title?: string[];
    excerpt?: string[];
    content?: string[];
    categoryId?: string[];
    // status?: string[];
    coverImage?: string[];
    _form?: string[];
  };
  success: boolean;
  updatedArticleSlug?: string | null;
};

export async function updateArticleAction(
  prevState: UpdateArticleFormState,
  formData: FormData
): Promise<UpdateArticleFormState> {
  
  const currentUser = clientAuth.currentUser;
  if (!currentUser) {
    return { message: 'User not authenticated.', success: false, errors: { _form: ['Authentication required.'] } };
  }

  const articleId = formData.get('articleId') as string;
  if (!articleId) {
    return { message: 'Article ID is missing.', success: false, errors: { _form: ['Article ID is required.'] } };
  }

  const validatedFields = UpdateArticleSchema.safeParse({
    articleId: articleId,
    title: formData.get('title'),
    excerpt: formData.get('excerpt'),
    content: formData.get('content'),
    categoryId: formData.get('categoryId'),
    // status: formData.get('status'), // Status updates are handled by different actions (approve, reject, etc.)
    coverImage: formData.get('coverImage') instanceof File && (formData.get('coverImage') as File).size > 0 
                 ? formData.get('coverImage') 
                 : undefined,
  });

  if (!validatedFields.success) {
    return {
      message: 'Validation failed. Please check the form fields.',
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }

  const { coverImage, ...articleUpdateData } = validatedFields.data;

  try {
    // Authorization: Ensure user is owner or admin
    const articleToUpdate = await getArticleById(articleId);
    if (!articleToUpdate) {
      return { message: 'Article not found.', success: false, errors: { _form: ['Article not found.'] } };
    }

    const idTokenResult = await currentUser.getIdTokenResult(true);
    const userRole = idTokenResult.claims.role as string;
    const isAdmin = userRole === 'admin';
    const isOwner = articleToUpdate.authorId === currentUser.uid;

    if (!isAdmin && !isOwner) {
      return { message: 'Unauthorized. You do not have permission to edit this article.', success: false, errors: { _form: ['Permission denied.'] } };
    }

    let newCoverImageUrl = articleToUpdate.coverImageUrl;
    let newSlug = articleToUpdate.slug;

    // If title changed, regenerate slug
    if (articleUpdateData.title !== articleToUpdate.title) {
      newSlug = generateSlug(articleUpdateData.title);
      // Future enhancement: check for slug uniqueness before updating.
    }

    // Handle image upload if a new image is provided
    if (coverImage) {
      // Delete old image if it exists
      if (articleToUpdate.coverImageUrl) {
        try {
          await deleteFileByUrl(articleToUpdate.coverImageUrl);
        } catch (storageError) {
          console.warn(`Could not delete old cover image ${articleToUpdate.coverImageUrl}:`, storageError);
          // Non-fatal, continue with update
        }
      }
      // Upload new image
      const imageFileName = `${newSlug}-${Date.now()}-${coverImage.name}`;
      const imagePath = `articles/${imageFileName}`;
      newCoverImageUrl = await uploadFile(coverImage, imagePath);
    }

    const finalUpdateData: Partial<Omit<Article, 'id' | 'createdAt' | 'authorName' | 'categoryName' | 'publishedAt'>> = {
      ...articleUpdateData,
      slug: newSlug, // Update slug if title changed
      coverImageUrl: newCoverImageUrl,
      // status is not updated here, but taken from existing article, unless admin has specific UI for it.
      // For simplicity, status is managed by approve/reject actions.
      // If an admin edits a 'pending_review' article, it should ideally remain 'pending_review' or be explicitly changed by admin.
      // For now, status of original article is maintained if not directly part of this form.
      // This update action primarily concerns content, category, title, image.
    };
    
    // Ensure authorId is not accidentally changed unless intended (and handled by schema)
    // finalUpdateData.authorId = articleToUpdate.authorId;

    await updateFirestoreArticle(articleId, finalUpdateData);

    revalidatePath('/dashboard');
    revalidatePath(`/articles/${newSlug}`); // Revalidate with potentially new slug
    if (articleToUpdate.slug !== newSlug) {
        revalidatePath(`/articles/${articleToUpdate.slug}`); // Revalidate old slug path too
    }
    if (finalUpdateData.categoryId) {
      revalidatePath(`/category/${finalUpdateData.categoryId}`); // This needs category slug not ID
    }


    return { message: 'Article updated successfully!', success: true, updatedArticleSlug: newSlug };

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
