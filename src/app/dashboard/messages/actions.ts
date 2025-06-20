'use server';

import { revalidatePath } from 'next/cache';
import admin from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
// --- CORRECCIÓN: Cambia la ruta de importación ---
import { getUserProfile, searchUsers } from '@/lib/firebase/firestore-admin';

const db = admin.firestore();

export async function sendMessageAction(
  idToken: string,
  recipientId: string,
  text: string
): Promise<{ success: boolean; message: string; conversationId?: string }> {
  if (!idToken || !recipientId || !text.trim()) {
    return { success: false, message: 'Faltan campos requeridos.' };
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const senderId = decodedToken.uid;

    if (senderId === recipientId) {
      return { success: false, message: 'No puedes enviarte mensajes a ti mismo.' };
    }

    const [senderProfile, recipientProfile] = await Promise.all([
      getUserProfile(senderId),
      getUserProfile(recipientId),
    ]);

    if (!senderProfile || !recipientProfile) {
      return { success: false, message: 'No se pudo encontrar uno de los usuarios.' };
    }
    
    if (recipientProfile.blockedUsers?.includes(senderId)) {
      return { success: false, message: 'Este usuario no acepta mensajes tuyos.' };
    }

    const conversationsRef = db.collection('conversations');
    const existingConvoQuery = conversationsRef
      .where('participants', 'in', [[senderId, recipientId], [recipientId, senderId]]);
      
    const querySnapshot = await existingConvoQuery.limit(1).get();

    let conversationId: string | null = null;
    if (!querySnapshot.empty) {
      conversationId = querySnapshot.docs[0].id;
    }

    const batch = db.batch();
    const timestamp = FieldValue.serverTimestamp();

    if (!conversationId) {
      const newConversationRef = db.collection('conversations').doc();
      conversationId = newConversationRef.id;

      const newConversation = {
        participants: [senderId, recipientId],
        participantProfiles: [senderProfile, recipientProfile],
        lastMessage: text,
        lastMessageTimestamp: timestamp,
        unreadCounts: { [recipientId]: 1, [senderId]: 0 }
      };
      batch.set(newConversationRef, newConversation);
    } else {
      const conversationRef = db.collection('conversations').doc(conversationId);
      batch.update(conversationRef, {
        lastMessage: text,
        lastMessageTimestamp: timestamp,
        [`unreadCounts.${recipientId}`]: FieldValue.increment(1)
      });
    }

    const newMessageRef = db.collection('conversations').doc(conversationId).collection('messages').doc();
    batch.set(newMessageRef, {
      senderId,
      content: text,
      timestamp: timestamp,
      isRead: false,
    });

    await batch.commit();

    revalidatePath('/dashboard/messages');
    return { success: true, message: '¡Mensaje enviado!', conversationId };

  } catch (error) {
    console.error("Error en sendMessageAction:", error);
    const message = error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
    return { success: false, message };
  }
}

export async function addMessageToConversationAction(
  idToken: string,
  conversationId: string,
  text: string
) {
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const senderId = decodedToken.uid;

    if (!conversationId || !text.trim()) {
      return { success: false, message: 'Entrada inválida.' };
    }

    const conversationRef = db.collection('conversations').doc(conversationId);
    const messageRef = conversationRef.collection('messages').doc();

    await db.runTransaction(async (transaction) => {
      const convoDoc = await transaction.get(conversationRef);
      if (!convoDoc.exists) throw new Error("La conversación no existe.");
      
      const convoData = convoDoc.data()!;
      const receiverId = convoData.participants.find((p: string) => p !== senderId);
      if (!receiverId) throw new Error("No se pudo encontrar al destinatario.");

      transaction.set(messageRef, {
        senderId,
        text, // Corregido de 'content' a 'text' para coincidir con el otro método
        timestamp: FieldValue.serverTimestamp(),
      });

      transaction.update(conversationRef, {
        lastMessage: text,
        lastMessageTimestamp: FieldValue.serverTimestamp(),
        [`unreadCounts.${receiverId}`]: FieldValue.increment(1)
      });
    });

    revalidatePath(`/dashboard/messages?conversationId=${conversationId}`);
    return { success: true };
  } catch (error) {
    console.error('Error al añadir mensaje:', error);
    const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error desconocido.';
    return { success: false, message: errorMessage };
  }
}

export async function searchUsersAction(queryText: string, idToken: string): Promise<{success: boolean, users?: UserProfile[], message?: string}> {
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        // Esta función ahora se importa correctamente desde el archivo del servidor
        const users = await searchUsers(queryText, decodedToken.uid);
        return { success: true, users };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
        console.error("Search user action failed:", message);
        return { success: false, message };
    }
}

export async function markConversationAsReadAction(
  idToken: string,
  conversationId: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const userId = decodedToken.uid;

    if (!conversationId) {
      return { success: false, message: 'ID de conversación no válido.' };
    }

    const conversationRef = db.collection('conversations').doc(conversationId);

    // Actualiza el contador de no leídos para el usuario actual a 0
    await conversationRef.update({
      [`unreadCounts.${userId}`]: 0
    });

    // Revalida la ruta para que la UI (lista de conversaciones) se actualice
    revalidatePath('/dashboard/messages');

    return { success: true };
  } catch (error) {
    console.error('Error al marcar la conversación como leída:', error);
    const message = error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
    return { success: false, message };
  }
}