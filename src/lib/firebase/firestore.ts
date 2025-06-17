
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
  setDoc, 
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
  const docRef = doc(db, 'authors', authorId); // Assuming 'authors' collection for author details
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
     // Fallback to users collection if author not in 'authors'
     const userProfile = await getUserProfile(authorId);
     if (userProfile) {
       return { id: userProfile.uid, name: userProfile.displayName || userProfile.email || 'Unnamed Author', avatarUrl: undefined /* Or a placeholder */};
     }
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
  // This function might be less relevant if authors are primarily from UserProfiles.
  // If 'authors' collection is distinct, keep it. Otherwise, consider querying 'users' with 'journalist' role.
  const authorsRef = collection(db, 'authors');
  const q = query(authorsRef, orderBy('name'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Author));
}


export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const userRef = doc(db, 'users', uid);
  const docSnap = await getDoc(userRef);
  if (docSnap.exists()) {
    return { uid: docSnap.id, ...docSnap.data() } as UserProfile;
  }
  return null;
}

export async function getUserProfileByEmail(email: string): Promise<UserProfile | null> {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('email', '==', email), limit(1));
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    return null;
  }
  const docSnap = snapshot.docs[0];
  return { uid: docSnap.id, ...docSnap.data() } as UserProfile;
}


export async function createUserProfile(uid: string, email: string | null, displayName: string | null, role: UserProfile['role'] = 'user'): Promise<UserProfile> {
  const userRef = doc(db, 'users', uid);
  const newUserProfile: UserProfile = {
    uid,
    email,
    displayName,
    role,
  };
  await setDoc(userRef, newUserProfile, { merge: true });
  return newUserProfile;
}

export async function updateUserProfile(uid: string, data: Partial<Omit<UserProfile, 'uid'>>): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, data);
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
    const author = await getAuthorById(authorId); // Fetch author details using the common function
    article.authorName = author?.name || 'Current User'; // Or a more specific display name
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
    // Check if it's already published to avoid overwriting publishedAt if not changing status to published
    const currentArticle = await getArticleById(articleId);
    if (currentArticle && currentArticle.status !== 'published') {
        updateData.publishedAt = serverTimestamp();
    } else if (currentArticle && currentArticle.publishedAt) {
        // Preserve existing publishedAt if status is already published or being changed from published to something else then back
        updateData.publishedAt = currentArticle.publishedAt; 
    } else {
        updateData.publishedAt = serverTimestamp();
    }
  } else if (newStatus === 'draft' || newStatus === 'pending_review') {
    // If moving to draft or pending, explicitly nullify publishedAt unless you want to keep it
    // updateData.publishedAt = null; // Or handle as per app logic - for now, let's not nullify it to keep history
  }
  await updateDoc(articleRef, updateData);
}
