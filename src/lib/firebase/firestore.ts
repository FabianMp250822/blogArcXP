
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  Timestamp,
  serverTimestamp,
  DocumentData,
  QueryDocumentSnapshot,
  setDoc, // Added setDoc
} from 'firebase/firestore';
import { db } from './config';
import type { Article, Author, Category, UserProfile } from '@/types';

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


export async function getPublishedArticles(count: number = 10): Promise<Article[]> {
  const articlesRef = collection(db, 'articles');
  const q = query(
    articlesRef,
    where('status', '==', 'published'),
    orderBy('publishedAt', 'desc'),
    limit(count)
  );
  const snapshot = await getDocs(q);
  const articlesPromises = snapshot.docs.map(async (docSnap) => {
    const article = articleFromDoc(docSnap);
    if (article.authorId) {
      const author = await getAuthorById(article.authorId);
      article.authorName = author?.name || 'Unknown Author';
    }
    if (article.categoryId) {
      const category = await getCategoryById(article.categoryId);
      article.categoryName = category?.name || 'Uncategorized';
    }
    return article;
  });
  return Promise.all(articlesPromises);
}

export async function getArticleById(articleId: string): Promise<Article | null> {
  const docRef = doc(db, 'articles', articleId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    return null;
  }
  const article = articleFromDoc(docSnap);
  if (article.authorId) {
    const author = await getAuthorById(article.authorId);
    article.authorName = author?.name;
  }
  if (article.categoryId) {
    const category = await getCategoryById(article.categoryId);
    article.categoryName = category?.name;
  }
  return article;
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const articlesRef = collection(db, 'articles');
  const q = query(articlesRef, where('slug', '==', slug), limit(1));
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    return null;
  }
  const article = articleFromDoc(snapshot.docs[0]);
  if (article.authorId) {
    const author = await getAuthorById(article.authorId);
    article.authorName = author?.name;
  }
  if (article.categoryId) {
    const category = await getCategoryById(article.categoryId);
    article.categoryName = category?.name;
  }
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


export async function getArticlesByCategorySlug(categorySlug: string): Promise<Article[]> {
  const category = await getCategoryBySlug(categorySlug);
  if (!category) {
    return [];
  }
  const articlesRef = collection(db, 'articles');
  const q = query(
    articlesRef,
    where('categoryId', '==', category.id),
    where('status', '==', 'published'),
    orderBy('publishedAt', 'desc')
  );
  const snapshot = await getDocs(q);
  const articlesPromises = snapshot.docs.map(async (docSnap) => {
    const article = articleFromDoc(docSnap);
    if (article.authorId) {
     const author = await getAuthorById(article.authorId);
     article.authorName = author?.name || 'Unknown Author';
   }
   article.categoryName = category.name;
   return article;
  });
  return Promise.all(articlesPromises);
}

export async function getAuthorById(authorId: string): Promise<Author | null> {
  const docRef = doc(db, 'authors', authorId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    return null;
  }
  const data = docSnap.data();
  return { id: docSnap.id, name: data.name, avatarUrl: data.avatarUrl };
}

// Used by admin create form
export async function createFirestoreArticle(articleData: Omit<Article, 'id' | 'createdAt' | 'publishedAt' | 'authorName' | 'categoryName'>): Promise<string> {
  const articlesRef = collection(db, 'articles');
  const docRef = await addDoc(articlesRef, {
    ...articleData,
    createdAt: serverTimestamp(),
    publishedAt: articleData.status === 'published' ? serverTimestamp() : null,
  });
  return docRef.id;
}

// Used by dashboard create form
export async function createArticleFromDashboard(
  articleData: Omit<Article, 'id' | 'createdAt' | 'publishedAt' | 'authorName' | 'categoryName' | 'slug'>,
  slug: string
): Promise<string> {
  const articlesRef = collection(db, 'articles');
  // Ensure authorName and categoryName are fetched if IDs are present, or set defaults.
  // For a new article, these might not be fully resolved yet if relying on client-side selection.
  // The current model stores IDs, and names are denormalized or fetched.
  // For simplicity, this example assumes `authorName` and `categoryName` might be passed in or resolved later.

  const author = articleData.authorId ? await getAuthorById(articleData.authorId) : null;
  const category = articleData.categoryId ? await getCategoryById(articleData.categoryId) : null;

  const docRef = await addDoc(articlesRef, {
    ...articleData,
    slug,
    authorName: author?.name || 'Unknown Author',
    categoryName: category?.name || 'Uncategorized',
    createdAt: serverTimestamp(),
    publishedAt: articleData.status === 'published' ? serverTimestamp() : null,
  });
  return docRef.id;
}


export async function getAllCategories(): Promise<Category[]> {
  const categoriesRef = collection(db, 'categories');
  const q = query(categoriesRef, orderBy('name'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Category));
}

export async function getAllAuthors(): Promise<Author[]> {
  const authorsRef = collection(db, 'authors');
  const q = query(authorsRef, orderBy('name'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Author));
}


export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const userRef = doc(db, 'users', uid);
  const docSnap = await getDoc(userRef);
  if (docSnap.exists()) {
    return docSnap.data() as UserProfile;
  }
  return null;
}

export async function createUserProfile(uid: string, email: string | null, displayName: string | null, role: UserProfile['role'] = 'user'): Promise<UserProfile> {
  const userRef = doc(db, 'users', uid);
  const newUserProfile: UserProfile = {
    uid,
    email,
    displayName,
    role, // Use provided role or default to 'user'
  };
  await setDoc(userRef, newUserProfile, { merge: true }); // Use merge to avoid overwriting if doc exists partially
  return newUserProfile;
}

// Dashboard specific functions
export async function getArticlesByAuthor(authorId: string): Promise<Article[]> {
  const articlesRef = collection(db, 'articles');
  const q = query(
    articlesRef,
    where('authorId', '==', authorId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  const articlesPromises = snapshot.docs.map(async (docSnap) => {
    const article = articleFromDoc(docSnap);
    // Author name is implicitly the current user, category needs fetching
    if (article.categoryId) {
      const category = await getCategoryById(article.categoryId);
      article.categoryName = category?.name || 'Uncategorized';
    }
    return article;
  });
  return Promise.all(articlesPromises);
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
  const articlesPromises = snapshot.docs.map(async (docSnap) => {
    const article = articleFromDoc(docSnap);
    if (article.authorId) {
      const author = await getAuthorById(article.authorId);
      article.authorName = author?.name || 'Unknown Author';
    }
    if (article.categoryId) {
      const category = await getCategoryById(article.categoryId);
      article.categoryName = category?.name || 'Uncategorized';
    }
    return article;
  });
  return Promise.all(articlesPromises);
}

export async function updateArticleStatus(
  articleId: string,
  newStatus: Article['status'],
): Promise<void> {
  const articleRef = doc(db, 'articles', articleId);
  const updateData: { status: Article['status'], publishedAt?: Timestamp } = { status: newStatus };
  if (newStatus === 'published') {
    updateData.publishedAt = serverTimestamp();
  }
  await updateDoc(articleRef, updateData);
}
