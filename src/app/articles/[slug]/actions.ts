'use server';

import { revalidatePath } from 'next/cache';
import admin from '@/lib/firebase/admin';
import { addCommentToArticle, deleteCommentFromArticle } from '@/lib/firebase/firestore-admin';
import { containsBadWords } from '@/lib/bad-words';
import type { UserProfile, Comment } from '@/types';

export type CommentActionState = {
  message: string;
  success: boolean;
  errors?: {
    text?: string[];
    _form?: string[];
  };
};

async function verifyUser(idToken: string): Promise<{ uid: string; user: admin.auth.DecodedIdToken; profile: UserProfile | null }> {
  if (!idToken) {
    throw new Error('Token de autenticación no proporcionado.');
  }
  const decodedToken = await admin.auth().verifyIdToken(idToken);
  const userRef = admin.firestore().collection('users').doc(decodedToken.uid);
  const userProfileDoc = await userRef.get();
  const userProfile = userProfileDoc.exists ? userProfileDoc.data() as UserProfile : null;

  return { uid: decodedToken.uid, user: decodedToken, profile: userProfile };
}

export async function addCommentAction(
  prevState: CommentActionState,
  formData: FormData
): Promise<CommentActionState> {
  const text = formData.get('text') as string;
  const articleId = formData.get('articleId') as string;
  const parentId = formData.get('parentId') as string | null;
  const idToken = formData.get('idToken') as string;
  const slug = formData.get('articleSlug') as string;

  if (!text || text.trim().length < 3 || text.trim().length > 500) {
    return { success: false, message: 'El comentario debe tener entre 3 y 500 caracteres.', errors: { text: ['Longitud inválida.'] } };
  }

  if (containsBadWords(text)) {
    return { success: false, message: 'Tu comentario fue bloqueado por contenido inapropiado. Si crees que fue un error, contáctanos.', errors: { _form: ['Contenido inapropiado detectado.'] } };
  }

  try {
    const { user, profile } = await verifyUser(idToken);

    if (profile?.role !== 'admin' && profile?.role !== 'journalist' && !user.email_verified) {
      return { success: false, message: 'Debes verificar tu correo electrónico para poder comentar.', errors: { _form: ['Email no verificado.'] } };
    }

    await addCommentToArticle({
      articleId,
      parentId,
      text: text.trim(),
      userId: user.uid,
      username: profile?.displayName || 'Usuario Anónimo',
      avatarUrl: profile?.photoURL || undefined,
    });

    revalidatePath(`/articles/${slug}`);
    return { success: true, message: 'Comentario añadido con éxito.' };

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
    console.error('Error en addCommentAction:', error);
    return { success: false, message, errors: { _form: [message] } };
  }
}

export async function deleteCommentAction(
  prevState: CommentActionState,
  formData: FormData
): Promise<CommentActionState> {
  const commentId = formData.get('commentId') as string;
  const idToken = formData.get('idToken') as string;
  const slug = formData.get('articleSlug') as string;

  try {
    const { user, profile } = await verifyUser(idToken);
    const commentRef = admin.firestore().collection('comments').doc(commentId);
    const commentDoc = await commentRef.get();

    if (!commentDoc.exists) {
      throw new Error('El comentario no existe.');
    }

    const commentData = commentDoc.data() as Comment;
    const isOwner = commentData?.userId === user.uid;
    const isAdmin = profile?.role === 'admin';

    if (!isOwner && !isAdmin) {
      return { success: false, message: 'No tienes permiso para eliminar este comentario.' };
    }

    await deleteCommentFromArticle(commentId);

    revalidatePath(`/articles/${slug}`);
    return { success: true, message: 'Comentario eliminado.' };

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
    console.error('Error en deleteCommentAction:', error);
    return { success: false, message };
  }
}
