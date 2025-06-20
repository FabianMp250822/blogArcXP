import 'server-only'; // Asegura que este módulo solo se use en el servidor
import admin from './admin';
import type { UserProfile, Conversation, Category, Article, Author } from '@/types';
import { FieldValue } from 'firebase-admin/firestore';

const db = admin.firestore();

// --- FUNCIONES DE USUARIO Y CONVERSACIÓN ---

/**
 * Obtiene el perfil de un usuario usando el SDK de Admin.
 * Seguro para usar en el servidor.
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const userRef = db.collection('users').doc(uid);
  const docSnap = await userRef.get();

  if (!docSnap.exists) {
    console.warn(`No se encontró perfil de usuario para el UID: ${uid}`);
    return null;
  }
  return docSnap.data() as UserProfile;
}

/**
 * Busca usuarios para iniciar una nueva conversación usando el SDK de Admin.
 * Seguro para usar en el servidor.
 */
export async function searchUsers(queryText: string, currentUserId: string): Promise<UserProfile[]> {
  const normalizedQuery = queryText.toLowerCase();
  const usersRef = db.collection('users');
  
  const snapshot = await usersRef
    .orderBy('displayName')
    .startAt(normalizedQuery)
    .endAt(normalizedQuery + '\uf8ff')
    .limit(10)
    .get();

  if (snapshot.empty) {
    return [];
  }

  const users = snapshot.docs
    .map(doc => doc.data() as UserProfile)
    .filter(user => user.uid !== currentUserId); // Excluir al usuario actual

  return users;
}

/**
 * Obtiene todas las conversaciones de un usuario usando el SDK de Admin.
 * Seguro para usar en el servidor.
 */
export async function getConversationsForUser(userId: string): Promise<Conversation[]> {
  const conversationsRef = db.collection('conversations');
  const q = conversationsRef.where('participants', 'array-contains', userId)
                            .orderBy('lastMessageTimestamp', 'desc');
  const snapshot = await q.get();

  if (snapshot.empty) {
    return [];
  }

  // --- CORRECCIÓN: Hacemos la obtención de datos más robusta ---
  const conversations = await Promise.all(snapshot.docs.map(async (doc) => {
    const data = doc.data();
    
    let participantProfiles = data.participantProfiles;
    // Si los perfiles no existen en el documento, los buscamos.
    if (!participantProfiles || participantProfiles.length === 0) {
        const participantIds = data.participants || [];
        // Buscamos los perfiles y filtramos los que no se encuentren.
        participantProfiles = (await Promise.all(
            participantIds.map((id: string) => getUserProfile(id))
        )).filter((p): p is UserProfile => p !== null);
    }

    const lastMessageTimestamp = data.lastMessageTimestamp?.toDate?.().toISOString() || new Date().toISOString();
    
    return {
      id: doc.id,
      ...data,
      participantProfiles, // Nos aseguramos de que este campo siempre sea un array.
      lastMessageTimestamp,
    } as Conversation;
  }));

  return conversations;
}

// --- FUNCIONES DE ARTÍCULOS (VERSIÓN ADMIN) ---

export async function createFirestoreArticle(articleData: Omit<Article, 'id' | 'createdAt' | 'publishedAt' | 'authorName' | 'categoryName'>): Promise<string> {
  const articlesRef = db.collection('articles');
  const docRef = await articlesRef.add({
    ...articleData,
    createdAt: FieldValue.serverTimestamp(),
    publishedAt: articleData.status === 'published' ? FieldValue.serverTimestamp() : null,
  });
  return docRef.id;
}

// --- FUNCIONES DE CATEGORÍAS (VERSIÓN ADMIN) ---

export async function createCategory(name: string, slug: string): Promise<string> {
  const categoryRef = db.collection('categories').doc(slug);
  await categoryRef.set({ name, slug });
  return categoryRef.id;
}