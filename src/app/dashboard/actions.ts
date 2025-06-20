'use server';

import { revalidatePath } from 'next/cache';
// Importa el SDK de Admin y quita las importaciones del cliente
import admin from '@/lib/firebase/admin'; 
import { getArticleById, updateArticleStatus, getCategoryById, deleteFirestoreArticle } from '@/lib/firebase/firestore';
import { deleteFileByUrl } from '@/lib/firebase/storage';
import type { Article } from '@/types';

// --- REEMPLAZA LA FUNCIÓN ANTERIOR CON ESTA ---
async function verifyUserAndGetArticle(
  idToken: string, 
  allowedRoles: Array<'admin' | 'journalist' | 'owner'>, 
  articleId: string
): Promise<{ uid: string; role: string; article: Article }> {
  
  if (!idToken) {
    throw new Error('Authentication token is missing.');
  }

  let decodedToken;
  try {
    decodedToken = await admin.auth().verifyIdToken(idToken);
  } catch (error) {
    throw new Error('Invalid authentication session.');
  }

  const uid = decodedToken.uid;
  const role = (decodedToken.role as string) || 'user';

  const article = await getArticleById(articleId);
  if (!article) {
    throw new Error('Article not found.');
  }

  let isAuthorized = allowedRoles.some(r => r === role);

  if (!isAuthorized && allowedRoles.includes('owner')) {
    if (article.authorId === uid) {
      isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    throw new Error(`Permission denied. Required role: ${allowedRoles.join(' or ')}.`);
  }

  return { uid, role, article };
}


export type DashboardActionState = {
  message: string;
  success: boolean;
  errors?: Record<string, string[]>;
};

export async function sendArticleForReviewAction(articleId: string, idToken: string): Promise<DashboardActionState> {
  try {
    const { article } = await verifyUserAndGetArticle(idToken, ['journalist', 'admin', 'owner'], articleId);
    
    if (article.status !== 'draft') {
      return { message: 'Article must be in draft status to send for review.', success: false };
    }

    await updateArticleStatus(articleId, 'pending_review');
    revalidatePath('/dashboard');
    revalidatePath(`/articles/${article.slug}`);
    return { message: 'Article sent for review successfully!', success: true };
  } catch (error: any) {
    return { message: error.message || 'Failed to send article for review.', success: false };
  }
}

export async function approveArticleAction(articleId: string, idToken: string): Promise<DashboardActionState> {
  try {
    const { article } = await verifyUserAndGetArticle(idToken, ['admin'], articleId);

    if (article.status !== 'pending_review') {
      return { message: 'Article must be pending review to be approved.', success: false };
    }
    
    await updateArticleStatus(articleId, 'published');

    revalidatePath('/dashboard');
    revalidatePath('/');
    revalidatePath(`/articles/${article.slug}`);
    if (article.categoryId) {
        const category = await getCategoryById(article.categoryId);
        if (category) revalidatePath(`/category/${category.slug}`);
    }
    return { message: 'Article approved and published successfully!', success: true };
  } catch (error: any) {
    return { message: error.message || 'Failed to approve article.', success: false };
  }
}

export async function rejectArticleAction(articleId: string, idToken: string): Promise<DashboardActionState> {
  try {
    const { article } = await verifyUserAndGetArticle(idToken, ['admin'], articleId);

    if (article.status !== 'pending_review') {
      return { message: 'Article must be pending review to be rejected.', success: false };
    }

    await updateArticleStatus(articleId, 'draft');
    revalidatePath('/dashboard');
    revalidatePath(`/articles/${article.slug}`);
    return { message: 'Article rejected and returned to drafts.', success: true };
  } catch (error: any) {
    return { message: error.message || 'Failed to reject article.', success: false };
  }
}

export async function updateArticleStatusAction(articleId: string, newStatus: Article['status'], idToken: string): Promise<DashboardActionState> {
  try {
    const { article } = await verifyUserAndGetArticle(idToken, ['admin'], articleId);

    await updateArticleStatus(articleId, newStatus);

    revalidatePath('/dashboard');
    revalidatePath('/');
    revalidatePath(`/articles/${article.slug}`);
    if (article.categoryId) {
        const category = await getCategoryById(article.categoryId);
        if (category) revalidatePath(`/category/${category.slug}`);
    }
    
    return { message: `Article status updated to "${newStatus.replace('_', ' ')}"`, success: true };
  } catch (error: any) {
    return { message: error.message || 'Failed to update article status.', success: false };
  }
}

export async function deleteArticleAction(articleId: string, idToken: string): Promise<DashboardActionState> {
    try {
        const { article } = await verifyUserAndGetArticle(idToken, ['admin', 'owner'], articleId);
        
        if (article.coverImageUrl) {
            await deleteFileByUrl(article.coverImageUrl);
        }

        await deleteFirestoreArticle(articleId);
        
        revalidatePath('/dashboard');
        revalidatePath('/');
        if (article.slug) revalidatePath(`/articles/${article.slug}`);
        if (article.categoryId) {
             const category = await getCategoryById(article.categoryId);
             if (category) revalidatePath(`/category/${category.slug}`);
        }

        return { message: 'Article deleted successfully.', success: true };
    } catch (error: any) {
        console.error('Error deleting article:', error);
        return { message: error.message || 'Failed to delete article.', success: false };
    }
}
