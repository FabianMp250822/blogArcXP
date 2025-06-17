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
  Timestamp,
  serverTimestamp,
  DocumentData,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from './config';
import type { Article, Author, Category, UserProfile } from '@/types';

// Helper to convert Firestore doc to Article
const articleFromDoc = (doc: QueryDocumentSnapshot<DocumentData> | DocumentData): Article => {
  const data = doc.data();
  return {
    id: doc.id,
    title: data.title,
    slug: data.slug,
    excerpt: data.excerpt,
    content: data.content,
    coverImageUrl: data.coverImageUrl,
    authorId: data.authorId,
    categoryId: data.categoryId,
    status: data.status,
    createdAt: data.createdAt as Timestamp,
    publishedAt: data.publishedAt as Timestamp | undefined,
    // These would ideally be populated by joining/denormalizing
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
  const articles = snapshot.docs.map(articleFromDoc);

  // Fetch author and category names (simplified, consider denormalization for performance)
  for (const article of articles) {
    if (article.authorId) {
      const author = await getAuthorById(article.authorId);
      article.authorName = author?.name || 'Unknown Author';
    }
    if (article.categoryId) {
      const category = await getCategoryById(article.categoryId);
      article.categoryName = category?.name || 'Uncategorized';
    }
  }
  return articles;
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
  const articles = snapshot.docs.map(articleFromDoc);
  
  for (const article of articles) {
     if (article.authorId) {
      const author = await getAuthorById(article.authorId);
      article.authorName = author?.name || 'Unknown Author';
    }
    article.categoryName = category.name;
  }
  return articles;
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

export async function createArticle(articleData: Omit<Article, 'id' | 'createdAt' | 'publishedAt' | 'authorName' | 'categoryName'>): Promise<string> {
  const articlesRef = collection(db, 'articles');
  const docRef = await addDoc(articlesRef, {
    ...articleData,
    createdAt: serverTimestamp(),
    publishedAt: articleData.status === 'published' ? serverTimestamp() : null,
  });
  return docRef.id;
}


export async function getAllCategories(): Promise<Category[]> {
  const categoriesRef = collection(db, 'categories');
  const q = query(categoriesRef, orderBy('name'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
}

export async function getAllAuthors(): Promise<Author[]> {
  const authorsRef = collection(db, 'authors');
  const q = query(authorsRef, orderBy('name'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Author));
}


export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const userRef = doc(db, 'users', uid);
  const docSnap = await getDoc(userRef);
  if (docSnap.exists()) {
    return docSnap.data() as UserProfile;
  }
  // Optionally create a default user profile if it doesn't exist
  // For now, return null
  return null;
}

// Example function to create a user profile document (e.g., on sign up)
// This would typically be called from a server-side function or when a new user signs up.
export async function createUserProfile(uid: string, email: string | null, displayName: string | null) {
  const userRef = doc(db, 'users', uid);
  // Default role to 'user'
  // In a real app, admin role would be set manually or through a secure process
  const newUserProfile: UserProfile = {
    uid,
    email,
    displayName,
    role: 'user', // New users are 'user' by default
  };
  await setDoc(userRef, newUserProfile); // Using setDoc to create or overwrite
  return newUserProfile;
}

// Add setDoc to imports
import { setDoc } from 'firebase/firestore';
