import 'server-only'; // Asegura que este módulo solo se use en el servidor
import admin from './admin'; // Asegúrate de que admin esté importado
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

/**
 * Actualiza una categoría y todos los artículos asociados usando una transacción atómica.
 * --- CORRECCIÓN: Reorganizado para cumplir con la regla de "lecturas antes de escrituras". ---
 */
export async function updateCategory(id: string, newName: string): Promise<void> {
  await db.runTransaction(async (transaction) => {
    // --- FASE DE LECTURA ---
    // Primero, realizamos todas las lecturas necesarias.

    // 1. Leer el documento de la categoría.
    const categoryRef = db.collection('categories').doc(id);
    const categoryDoc = await transaction.get(categoryRef);

    if (!categoryDoc.exists) {
      throw new Error(`La categoría con ID "${id}" no existe.`);
    }
    
    const slug = categoryDoc.data()?.slug;
    if (!slug) {
        throw new Error(`La categoría con ID "${id}" no tiene un campo slug.`);
    }

    // 2. Leer todos los artículos asociados.
    const articlesQuery = db.collection('articles').where('categoryId', '==', slug);
    const articlesSnapshot = await transaction.get(articlesQuery);

    // --- FASE DE ESCRITURA ---
    // Ahora que todas las lecturas están completas, realizamos las escrituras.

    // 3. Escribir la actualización en el documento de la categoría.
    transaction.update(categoryRef, { name: newName });

    // 4. Escribir la actualización en cada artículo.
    articlesSnapshot.docs.forEach(articleDoc => {
      transaction.update(articleDoc.ref, { categoryName: newName });
    });
  });
}

/**
 * Elimina una categoría y reasigna sus artículos usando una transacción atómica.
 * Esto garantiza que la operación sea segura y completa.
 */
export async function deleteCategoryAndReassignArticles(slug: string): Promise<void> {
  if (slug === 'general') {
    throw new Error('No se puede eliminar la categoría "General".');
  }

  await db.runTransaction(async (transaction) => {
    // Paso 1: Encontrar los artículos que necesitan ser reasignados.
    const articlesQuery = db.collection('articles').where('categoryId', '==', slug);
    const articlesSnapshot = await transaction.get(articlesQuery);

    // Paso 2: Reasignar cada artículo a la categoría "General".
    articlesSnapshot.docs.forEach(articleDoc => {
      transaction.update(articleDoc.ref, { categoryId: 'general', categoryName: 'General' });
    });

    // Paso 3: Eliminar el documento de la categoría.
    const categoryRef = db.collection('categories').doc(slug);
    transaction.delete(categoryRef);
  });
}