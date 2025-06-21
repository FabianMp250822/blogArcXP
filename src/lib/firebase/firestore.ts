import {
    collection, 
    getDocs, 
    addDoc, 
    serverTimestamp, 
    query, 
    where, 
    doc, 
    getDoc, 
    updateDoc,
    deleteDoc,
    setDoc,
    limit,
    orderBy,
    Timestamp,
    type DocumentData,
    type QueryConstraint, // <-- 1. Importa el tipo QueryConstraint
    type QueryDocumentSnapshot,
    arrayUnion,
    arrayRemove,
    writeBatch,
} from 'firebase/firestore';
import { db } from './config';
import type { Article, Author, Category, UserProfile, SiteSettings, Conversation } from '@/types';

// Helper to convert Firestore doc to Article
const articleFromDoc = (docSnap: QueryDocumentSnapshot<DocumentData> | DocumentData): Article => {
  const data = docSnap.data();
  if (!data) throw new Error("Document data is undefined");
  return {
    id: docSnap.id,
    title: data.title,
    slug: data.slug,
    excerpt: data.excerpt,
    content: data.content,
    coverImageUrl: data.coverImageUrl,
    authorId: data.authorId,
    categoryId: data.categoryId,
    status: data.status as Article['status'],
    createdAt: data.createdAt as Timestamp,
    publishedAt: data.publishedAt as Timestamp | undefined,
    authorName: data.authorName || 'Unknown Author',
    categoryName: data.categoryName || 'Uncategorized',
  };
};

// Helper to get author and category names for an article
async function getAuthorAndCategoryNames(authorId?: string, categoryId?: string): Promise<{authorName?: string, categoryName?: string}> {
    let authorName: string | undefined;
    let categoryName: string | undefined;

    if (authorId) {
        const author = await getAuthorById(authorId);
        authorName = author?.name;
    }
    if (categoryId) {
        const category = await getCategoryById(categoryId);
        categoryName = category?.name;
    }
    return { authorName, categoryName };
}

export async function getPublishedArticles(count: number = 10): Promise<Article[]> {
  const articlesRef = collection(db, 'articles');
  const q = query(
    articlesRef,
    where('status', '==', 'published'),
    orderBy('publishedAt', 'desc'),
    limit(count)
  );
  const snapshot = await getDocs(q);
  return Promise.all(snapshot.docs.map(async (docSnap) => {
    const article = articleFromDoc(docSnap);
    const { authorName, categoryName } = await getAuthorAndCategoryNames(article.authorId, article.categoryId);
    article.authorName = authorName || 'Unknown Author';
    article.categoryName = categoryName || 'Uncategorized';
    return article;
  }));
}

export async function getArticleById(id: string): Promise<Article | null> {
  const docRef = doc(db, 'articles', id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    return null;
  }
  const article = articleFromDoc(docSnap);
  const { authorName, categoryName } = await getAuthorAndCategoryNames(article.authorId, article.categoryId);
  article.authorName = authorName;
  article.categoryName = categoryName;
  return article;
}

// --- AÑADE ESTA NUEVA FUNCIÓN ---
/**
 * Obtiene un único artículo publicado por su slug.
 */
export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const articlesRef = collection(db, 'articles');
  const q = query(
    articlesRef,
    where('slug', '==', slug),
    where('status', '==', 'published'),
    limit(1)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    console.warn(`No se encontró ningún artículo publicado con el slug: ${slug}`);
    return null;
  }

  const docSnap = snapshot.docs[0];
  const article = articleFromDoc(docSnap);

  // Obtenemos los nombres para mostrarlos en la página
  const { authorName, categoryName } = await getAuthorAndCategoryNames(article.authorId, article.categoryId);
  article.authorName = authorName || 'Autor Desconocido';
  article.categoryName = categoryName || 'Categoría Desconocida';

  return article;
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const categoriesRef = collection(db, 'categories');
  const q = query(categoriesRef, where('slug', '==', slug), limit(1));
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    return null;
  }
  const data = snapshot.docs[0].data();
  return { id: snapshot.docs[0].id, name: data.name, slug: data.slug };
}

export async function getCategoryById(id: string): Promise<Category | null> {
  const docRef = doc(db, 'categories', id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  const data = docSnap.data();
  return { id: docSnap.id, name: data.name, slug: data.slug };
}

// Modifica esta función para aceptar un límite
export async function getArticlesByCategorySlug(categorySlug: string, count?: number): Promise<Article[]> {
  // 1. Encontrar el documento de la categoría usando el slug.
  const category = await getCategoryBySlug(categorySlug);
  
  // Si la categoría no existe, no podemos buscar artículos.
  if (!category) {
    console.warn(`No se encontró ninguna categoría con el slug: ${categorySlug}`);
    return [];
  }

  const articlesRef = collection(db, 'articles');
  
  const constraints: QueryConstraint[] = [
    // 2. Usar el ID del documento de la categoría para la consulta.
    // Esto es mucho más fiable que usar el slug.
    where('categoryId', '==', category.id), 
    where('status', '==', 'published'),
    orderBy('publishedAt', 'desc')
  ];

  if (count) {
    constraints.push(limit(count));
  }

  const q = query(articlesRef, ...constraints);

  const snapshot = await getDocs(q);
  
  // Si no se encuentran documentos, devolvemos un array vacío.
  if (snapshot.empty) {
    return [];
  }

  // Mapeamos los resultados y añadimos la información del autor/categoría.
  return Promise.all(snapshot.docs.map(async (docSnap) => {
    const article = articleFromDoc(docSnap);
    const { authorName } = await getAuthorAndCategoryNames(article.authorId);
    article.authorName = authorName || 'Autor Desconocido';
    article.categoryName = category.name; // Reutilizamos el nombre de la categoría que ya obtuvimos.
    return article;
  }));
}

export async function getAuthorById(authorId: string): Promise<Author | null> {
  const userProfile = await getUserProfile(authorId);
  if (userProfile) {
    return { id: userProfile.uid, name: userProfile.displayName || userProfile.email || 'Unnamed Author', avatarUrl: userProfile.photoURL || undefined };
  }
  return null;
}

export async function createFirestoreArticle(articleData: Omit<Article, 'id' | 'createdAt' | 'publishedAt' | 'authorName' | 'categoryName'>): Promise<string> {
  const articlesRef = collection(db, 'articles');
  const { authorName, categoryName } = await getAuthorAndCategoryNames(articleData.authorId, articleData.categoryId);
  
  const docRef = await addDoc(articlesRef, {
    ...articleData,
    authorName: authorName || 'Unknown Author',
    categoryName: categoryName || 'Uncategorized',
    createdAt: serverTimestamp(),
    publishedAt: articleData.status === 'published' ? serverTimestamp() : null,
  });
  return docRef.id;
}

export async function updateFirestoreArticle(articleId: string, articleUpdateData: Partial<Omit<Article, 'id' | 'createdAt' | 'authorName' | 'categoryName'>>): Promise<void> {
    const articleRef = doc(db, 'articles', articleId);
    const dataToUpdate: Partial<DocumentData> = { ...articleUpdateData };

    if (articleUpdateData.authorId || articleUpdateData.categoryId) {
        const currentArticleSnap = await getDoc(articleRef);
        const currentArticle = currentArticleSnap.data();
        const authorIdToFetch = articleUpdateData.authorId || currentArticle?.authorId;
        const categoryIdToFetch = articleUpdateData.categoryId || currentArticle?.categoryId;
        
        const { authorName, categoryName } = await getAuthorAndCategoryNames(authorIdToFetch, categoryIdToFetch);
        if (authorName) dataToUpdate.authorName = authorName;
        if (categoryName) dataToUpdate.categoryName = categoryName;
    }
    
    if (articleUpdateData.status === 'published') {
        const currentArticleSnap = await getDoc(articleRef);
        const currentArticleData = currentArticleSnap.data();
        if (!currentArticleData?.publishedAt || currentArticleData?.status !== 'published') {
            dataToUpdate.publishedAt = serverTimestamp();
        }
    }
    await updateDoc(articleRef, dataToUpdate);
}

export async function getAllCategories(): Promise<Category[]> {
  const categoriesRef = collection(db, 'categories');
  const q = query(categoriesRef, orderBy('name'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Category));
}

export async function createCategory(name: string, slug: string): Promise<string> {
    const categoriesRef = collection(db, 'categories');
    const q = query(categoriesRef, where('slug', '==', slug), limit(1));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
        throw new Error(`Category with slug '${slug}' already exists.`);
    }
    const docRef = await addDoc(categoriesRef, { name, slug });
    return docRef.id;
}

export async function getAllAuthors(): Promise<Author[]> {
  const usersRef = collection(db, "users");
  const q = query(usersRef, where("role", "in", ["journalist", "admin"]));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => {
    const data = docSnap.data() as UserProfile;
    return {
      id: docSnap.id,
      name: data.displayName || data.email || 'Unnamed User',
      avatarUrl: data.photoURL || undefined,
    };
  });
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const userRef = doc(db, 'users', uid);
  const docSnap = await getDoc(userRef);

  if (!docSnap.exists()) {
    console.warn(`No se encontró perfil de usuario para el UID: ${uid}`);
    return null;
  }
  return docSnap.data() as UserProfile;
}

export async function createUserProfile(uid: string, email: string | null, displayName: string | null, role: UserProfile['role'] = 'user', photoURL?: string | null): Promise<UserProfile> {
  const userRef = doc(db, 'users', uid);
  const newUserProfile: UserProfile = {
    uid,
    email: email || '',
    displayName: displayName || '',
    role,
    photoURL: photoURL || undefined,
  };
  await setDoc(userRef, newUserProfile, { merge: true });
  return newUserProfile;
}

export async function updateUserProfile(uid: string, data: Partial<Omit<UserProfile, 'uid'>>): Promise<void> {
    try {
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, data);
    } catch (error) {
        console.error("Error updating user profile: ", error);
        throw new Error("Failed to update user profile.");
    }
}

export async function getArticlesByAuthor(authorId: string): Promise<Article[]> {
  const articlesRef = collection(db, 'articles');
  const q = query(
    articlesRef,
    where('authorId', '==', authorId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return Promise.all(snapshot.docs.map(async (docSnap) => {
    const article = articleFromDoc(docSnap);
    const { authorName, categoryName } = await getAuthorAndCategoryNames(article.authorId, article.categoryId);
    article.authorName = authorName || 'Current User'; 
    article.categoryName = categoryName || 'Uncategorized';
    return article;
  }));
}

export async function getAllArticlesForAdmin(filterStatus?: Article['status']): Promise<Article[]> {
  const articlesRef = collection(db, 'articles');
  let q;
  if (filterStatus) {
    q = query(articlesRef, where('status', '==', filterStatus), orderBy('createdAt', 'desc'));
  } else {
    q = query(articlesRef, orderBy('createdAt', 'desc'));
  }
  const snapshot = await getDocs(q);
  return Promise.all(snapshot.docs.map(async (docSnap) => {
    const article = articleFromDoc(docSnap);
    const { authorName, categoryName } = await getAuthorAndCategoryNames(article.authorId, article.categoryId);
    article.authorName = authorName || 'Unknown Author';
    article.categoryName = categoryName || 'Uncategorized';
    return article;
  }));
}

export async function updateArticleStatus(articleId: string, newStatus: Article['status']): Promise<void> {
  const articleRef = doc(db, 'articles', articleId);
  const updateData: Partial<DocumentData> = { status: newStatus };
  if (newStatus === 'published') {
    const currentArticle = await getArticleById(articleId);
    if (currentArticle && currentArticle.status !== 'published') {
        updateData.publishedAt = serverTimestamp();
    }
  }
  await updateDoc(articleRef, updateData);
}

export async function deleteFirestoreArticle(articleId: string): Promise<void> {
    try {
        const articleRef = doc(db, 'articles', articleId);
        await deleteDoc(articleRef);
    } catch (error) {
        console.error("Error deleting article from Firestore: ", error);
        throw new Error("Failed to delete article from database.");
    }
}

// --- AÑADE ESTA NUEVA FUNCIÓN ---
export async function getRelatedArticles(categoryId: string, currentArticleId: string, count: number = 3): Promise<Article[]> {
  if (!categoryId) {
    return [];
  }

  const articlesRef = collection(db, 'articles');
  const q = query(
    articlesRef,
    where('categoryId', '==', categoryId),
    where('status', '==', 'published'),
    orderBy('publishedAt', 'desc'),
    limit(count + 1) // Obtenemos uno extra por si el artículo actual está en los resultados
  );

  const snapshot = await getDocs(q);
  
  // Mapeamos y filtramos para excluir el artículo actual
  const relatedArticles = snapshot.docs
    .map(docSnap => articleFromDoc(docSnap))
    .filter(article => article.id !== currentArticleId);

  // Devolvemos la cantidad deseada de artículos
  return relatedArticles.slice(0, count);
}

// --- AÑADE ESTAS DOS NUEVAS FUNCIONES AL FINAL ---

/**
 * Obtiene la configuración global del sitio desde Firestore.
 * Proporciona valores predeterminados si no se encuentra la configuración.
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  const settingsRef = doc(db, 'settings', 'siteConfig');
  const docSnap = await getDoc(settingsRef);

  if (docSnap.exists()) {
    // Combina los datos guardados con los predeterminados para asegurar que todos los campos existan
    const data = docSnap.data();
    return {
      siteName: data.siteName || 'WRadio',
      logoUrl: data.logoUrl || '/default-logo.svg',
      primaryColor: data.primaryColor || '#000000', // Negro por defecto
      secondaryColor: data.secondaryColor || '#f5a623', // Amarillo/Naranja por defecto
      fontFamily: data.fontFamily || 'inter',
    };
  }

  // Devuelve valores predeterminados si el documento no existe
  return {
    siteName: 'WRadio',
    logoUrl: '/default-logo.svg',
    primaryColor: '#000000',
    secondaryColor: '#f5a623',
    fontFamily: 'inter',
  };
}

/**
 * Actualiza la configuración global del sitio en Firestore.
 */
export async function updateSiteSettings(data: Partial<SiteSettings>): Promise<void> {
  const settingsRef = doc(db, 'settings', 'siteConfig');
  await setDoc(settingsRef, data, { merge: true });
}
