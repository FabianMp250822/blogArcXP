
'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/firebase/config';
import { getArticleById, updateArticleStatus } from '@/lib/firebase/firestore';
import type { Article } from '@/types';

async function verifyUserRole(allowedRoles: Array<Article['status'] | 'admin' | 'journalist' | 'owner'>, articleId?: string): Promise<{ uid: string; role: string; article?: Article | null }> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Authentication required.');
  }

  const idTokenResult = await currentUser.getIdTokenResult(true);
  const role = (idTokenResult.claims.role as string) || 'user';

  if (!allowedRoles.includes(role as any) && !allowedRoles.includes('owner')) {
     // Check for owner only if 'owner' is an allowed role and articleId is provided
    if (articleId && allowedRoles.includes('owner')) {
        const article = await getArticleById(articleId);
        if (!article || article.authorId !== currentUser.uid) {
            throw new Error('Permission denied. You are not the owner or lack necessary role.');
        }
        return { uid: currentUser.uid, role, article };
    }
    throw new Error(`Permission denied. Required role: ${allowedRoles.join(' or ')}.`);
  }
  
  let article: Article | null = null;
  if (articleId) {
    article = await getArticleById(articleId);
    if (!article) {
        throw new Error('Article not found.');
    }
    if (allowedRoles.includes('owner') && article.authorId !== currentUser.uid && role !== 'admin') {
        throw new Error('Permission denied. You must be the article owner or an admin.');
    }
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
    if (article.authorId !== uid && !(await verifyUserRole(['admin'])).role === 'admin') {
        return { message: 'Only the author or an admin can send this article for review.', success: false };
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
    
    // In a real scenario, this might call a Cloud Function:
    // const functions = getFunctions(app);
    // const approveArticleCallable = httpsCallable(functions, 'approveArticle');
    // await approveArticleCallable({ articleId });
    // For now, directly update:
    await updateArticleStatus(articleId, 'published');

    revalidatePath('/dashboard');
    revalidatePath('/');
    revalidatePath(`/articles/${article.slug}`);
    if (article.categoryName) {
        const category = await getCategoryById(article.categoryId); // Need to import getCategoryById
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
    // TODO: Implement actual deletion from Firestore and Storage (for cover image)
    // For now, this is a placeholder.
    try {
        const { article, role, uid } = await verifyUserRole(['admin', 'owner'], articleId);
        if (!article) return { message: 'Article not found.', success: false };

        if (role !== 'admin' && article.authorId !== uid) {
            return { message: 'You do not have permission to delete this article.', success: false };
        }
        
        console.log(`Article ${articleId} would be deleted here.`);
        // await deleteFirestoreArticle(articleId);
        // await deleteFromStorage(article.coverImageUrl);
        
        revalidatePath('/dashboard');
        return { message: 'Article (simulated) deleted successfully. Implement actual deletion.', success: true };
    } catch (error: any) {
        return { message: error.message || 'Failed to delete article.', success: false };
    }
}
