'use server';

import { revalidatePath } from 'next/cache';
import admin from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore'; // Usar FieldValue de Admin

const db = admin.firestore(); // Usar la instancia de Firestore de Admin

async function verifyUser(idToken: string): Promise<string> {
  if (!idToken) {
    throw new Error('Authentication token is missing.');
  }
  const decodedToken = await admin.auth().verifyIdToken(idToken);
  return decodedToken.uid;
}

export async function blockUserAction(
  idToken: string,
  userToBlockId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const blockerUid = await verifyUser(idToken);
    if (blockerUid === userToBlockId) {
      return { success: false, message: "You cannot block yourself." };
    }

    const userRef = db.collection('users').doc(blockerUid);
    await userRef.update({
      blockedUsers: FieldValue.arrayUnion(userToBlockId)
    });

    revalidatePath('/dashboard/settings/blocked-users');
    return { success: true, message: 'User blocked successfully.' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, message };
  }
}

export async function unblockUserAction(
  idToken: string,
  userToUnblockId: string
): Promise<{ success:boolean; message: string }> {
  try {
    const unblockerUid = await verifyUser(idToken);
    const userRef = db.collection('users').doc(unblockerUid);
    await userRef.update({
      blockedUsers: FieldValue.arrayRemove(userToUnblockId)
    });

    revalidatePath('/dashboard/settings/blocked-users');
    return { success: true, message: 'User unblocked successfully.' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, message };
  }
}