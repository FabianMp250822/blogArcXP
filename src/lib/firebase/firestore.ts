
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
  const articlesPromises = snapshot.docs.map(async (docSnap) => {
    const article = articleFromDoc(docSnap);
    const { authorName, categoryName } = await getAuthorAndCategoryNames(article.authorId, article.categoryId);
    article.authorName = authorName || 'Unknown Author';
    article.categoryName = categoryName || 'Uncategorized';
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
  const { authorName, categoryName } = await getAuthorAndCategoryNames(article.authorId, article.categoryId);
  article.authorName = authorName;
  article.categoryName = categoryName;
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
  const { authorName, categoryName } = await getAuthorAndCategoryNames(article.authorId, article.categoryId);
  article.authorName = authorName;
  article.categoryName = categoryName;
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
    const { authorName } = await getAuthorAndCategoryNames(article.authorId);
    article.authorName = authorName || 'Unknown Author';
    article.categoryName = category.name; // Category name is already known
    return article;
  });
  return Promise.all(articlesPromises);
}

export async function getAuthorById(authorId: string): Promise<Author | null> {
  const docRef = doc(db, 'authors', authorId); 
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
     const userProfile = await getUserProfile(authorId);
     if (userProfile) {
       return { id: userProfile.uid, name: userProfile.displayName || userProfile.email || 'Unnamed Author', avatarUrl: userProfile.photoURL || undefined };
     }
    return null;
  }
  const data = docSnap.data();
  return { id: docSnap.id, name: data.name, avatarUrl: data.avatarUrl };
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

export async function createArticleFromDashboard(
  articleData: Omit<Article, 'id' | 'createdAt' | 'publishedAt' | 'authorName' | 'categoryName' | 'slug'>,
  slug: string
): Promise<string> {
  const articlesRef = collection(db, 'articles');
  const { authorName, categoryName } = await getAuthorAndCategoryNames(articleData.authorId, articleData.categoryId);

  const docRef = await addDoc(articlesRef, {
    ...articleData,
    slug,
    authorName: authorName || 'Unknown Author',
    categoryName: categoryName || 'Uncategorized',
    createdAt: serverTimestamp(),
    publishedAt: articleData.status === 'published' ? serverTimestamp() : null, // Dashboard articles start as draft
  });
  return docRef.id;
}

export async function updateFirestoreArticle(articleId: string, articleUpdateData: Partial<Omit<Article, 'id' | 'createdAt' | 'authorName' | 'categoryName'>>): Promise<void> {
    const articleRef = doc(db, 'articles', articleId);
    
    const dataToUpdate: Partial<DocumentData> = { ...articleUpdateData };

    // If authorId or categoryId is being updated, fetch their names
    if (articleUpdateData.authorId || articleUpdateData.categoryId) {
        const currentArticleSnap = await getDoc(articleRef);
        const currentArticle = currentArticleSnap.data();
        const authorIdToFetch = articleUpdateData.authorId || currentArticle?.authorId;
        const categoryIdToFetch = articleUpdateData.categoryId || currentArticle?.categoryId;
        
        const { authorName, categoryName } = await getAuthorAndCategoryNames(authorIdToFetch, categoryIdToFetch);
        if (authorName) dataToUpdate.authorName = authorName;
        if (categoryName) dataToUpdate.categoryName = categoryName;
    }
    
    // Handle publishedAt timestamp if status changes to 'published'
    if (articleUpdateData.status === 'published') {
        const currentArticleSnap = await getDoc(articleRef);
        const currentArticleData = currentArticleSnap.data();
        // Set publishedAt only if it's not already set or if the status is changing to published
        if (!currentArticleData?.publishedAt || currentArticleData?.status !== 'published') {
            dataToUpdate.publishedAt = serverTimestamp();
        }
    }
    // If status changes away from 'published', you might want to nullify publishedAt or keep it for history
    // For now, we only set it when status becomes 'published' for the first time or changes to published.

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
    // Check if category with this slug already exists
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
  // Example: Fetch all users who are journalists or admins to populate "Author" dropdowns
  // This could be refined based on how you want to define "Authors" (e.g., all users, or only specific roles)
  const q = query(usersRef, where("role", "in", ["journalist", "admin"]));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => {
    const data = docSnap.data() as UserProfile;
    return {
      id: docSnap.id,
      name: data.displayName || data.email || 'Unnamed User',
      avatarUrl: data.photoURL || undefined, // Assuming photoURL might be on UserProfile
    };
  });
}


export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const userRef = doc(db, 'users', uid);
  const docSnap = await getDoc(userRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    return { 
        uid: docSnap.id, 
        email: data.email,
        displayName: data.displayName,
        role: data.role,
        photoURL: data.photoURL // Include photoURL if available
    } as UserProfile;
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
  const data = docSnap.data();
  return { 
    uid: docSnap.id, 
    email: data.email,
    displayName: data.displayName,
    role: data.role,
    photoURL: data.photoURL
  } as UserProfile;
}


export async function createUserProfile(uid: string, email: string | null, displayName: string | null, role: UserProfile['role'] = 'user', photoURL?: string | null): Promise<UserProfile> {
  const userRef = doc(db, 'users', uid);
  const newUserProfile: UserProfile = {
    uid,
    email,
    displayName,
    role,
    photoURL: photoURL || null,
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
    const { authorName, categoryName } = await getAuthorAndCategoryNames(article.authorId, article.categoryId);
    article.authorName = authorName || 'Current User'; 
    article.categoryName = categoryName || 'Uncategorized';
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
    const { authorName, categoryName } = await getAuthorAndCategoryNames(article.authorId, article.categoryId);
    article.authorName = authorName || 'Unknown Author';
    article.categoryName = categoryName || 'Uncategorized';
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
    const currentArticle = await getArticleById(articleId);
    if (currentArticle && currentArticle.status !== 'published') {
        updateData.publishedAt = serverTimestamp();
    } else if (currentArticle && currentArticle.publishedAt) {
        updateData.publishedAt = currentArticle.publishedAt; 
    } else {
        updateData.publishedAt = serverTimestamp();
    }
  }
  await updateDoc(articleRef, updateData);
}
