
'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/firebase/config';
import { getArticleById, updateArticleStatus, deleteDoc, doc, collection } from '@/lib/firebase/firestore'; // Added deleteDoc, doc
import { deleteFileByUrl } from '@/lib/firebase/storage';
import type { Article } from '@/types';
import { db } from '@/lib/firebase/config'; // For direct db access if needed for deleteDoc

async function verifyUserRole(allowedRoles: Array<Article['status'] | 'admin' | 'journalist' | 'owner'>, articleId?: string): Promise<{ uid: string; role: string; article?: Article | null }> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Authentication required.');
  }

  const idTokenResult = await currentUser.getIdTokenResult(true);
  const role = (idTokenResult.claims.role as string) || 'user';

  let article: Article | null = null;
  if (articleId) {
    article = await getArticleById(articleId); // This already fetches the article
    if (!article) {
        throw new Error('Article not found.');
    }
  }

  // Role check
  let authorized = allowedRoles.includes(role as any);

  // Owner check if 'owner' is allowed and role check failed or wasn't sufficient
  if (!authorized && articleId && allowedRoles.includes('owner')) {
    if (article && article.authorId === currentUser.uid) {
        authorized = true;
    }
  }
  
  if (!authorized) {
    throw new Error(`Permission denied. Required role: ${allowedRoles.join(' or ')} or be the owner.`);
  }

  return { uid: currentUser.uid, role, article };
}

export type DashboardActionState = {
  message: string;
  success: boolean;
  errors?: Record<string, string[]>;
};

export async function sendArticleForReviewAction(articleId: string): Promise<DashboardActionState> {
  try {
    const { uid, article } = await verifyUserRole(['journalist', 'admin', 'owner'], articleId);
    
    if (!article) return { message: 'Article not found.', success: false };
    // Journalist can only send their own articles for review if they are drafts.
    // Admin can send any draft article for review.
    const isOwner = article.authorId === uid;
    const isAdmin = (await verifyUserRole(['admin'], articleId)).role === 'admin';

    if (!isOwner && !isAdmin) {
        return { message: 'You do not have permission to send this article for review.', success: false };
    }
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

export async function approveArticleAction(articleId: string): Promise<DashboardActionState> {
  try {
    const { article } = await verifyUserRole(['admin'], articleId);
    if (!article) return { message: 'Article not found.', success: false };

    if (article.status !== 'pending_review') {
      return { message: 'Article must be pending review to be approved.', success: false };
    }
    
    await updateArticleStatus(articleId, 'published');

    revalidatePath('/dashboard');
    revalidatePath('/');
    revalidatePath(`/articles/${article.slug}`);
    if (article.categoryId) { // Ensure categoryId exists
        const category = await getCategoryById(article.categoryId);
        if (category) revalidatePath(`/category/${category.slug}`);
    }
    return { message: 'Article approved and published successfully!', success: true };
  } catch (error: any) {
    return { message: error.message || 'Failed to approve article.', success: false };
  }
}
// Need to import getCategoryById for revalidation path
import { getCategoryById } from '@/lib/firebase/firestore';


export async function rejectArticleAction(articleId: string): Promise<DashboardActionState> {
  try {
    const { article } = await verifyUserRole(['admin'], articleId);
    if (!article) return { message: 'Article not found.', success: false };

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

export async function deleteArticleAction(articleId: string): Promise<DashboardActionState> {
    try {
        const { article, role, uid } = await verifyUserRole(['admin', 'owner'], articleId);
        if (!article) {
            return { message: 'Article not found.', success: false };
        }

        // Double check permissions (already handled by verifyUserRole, but good for clarity)
        if (role !== 'admin' && article.authorId !== uid) {
            return { message: 'You do not have permission to delete this article.', success: false };
        }
        
        // 1. Delete cover image from Firebase Storage if it exists
        if (article.coverImageUrl) {
            try {
                await deleteFileByUrl(article.coverImageUrl);
            } catch (storageError) {
                console.warn(`Could not delete cover image ${article.coverImageUrl} for article ${articleId}:`, storageError);
                // Optionally, decide if this should block the Firestore delete or just log a warning
            }
        }

        // 2. Delete article document from Firestore
        const articleRef = doc(db, 'articles', articleId);
        await deleteDoc(articleRef);
        
        revalidatePath('/dashboard');
        revalidatePath('/'); // Revalidate homepage
        if (article.slug) revalidatePath(`/articles/${article.slug}`); // Revalidate specific article page if it was published
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
