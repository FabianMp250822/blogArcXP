import type { Timestamp } from 'firebase/firestore';

// --- NUEVO: Interfaz base con campos comunes ---
export interface ArticleBase {
  id: string;
  title: string;
  slug: string;
  authorId: string;
  categoryId: string;
  status: 'draft' | 'pending_review' | 'published';
  createdAt: Timestamp;
  publishedAt?: Timestamp;
  // Campos desnormalizados para facilitar la visualización
  authorName?: string;
  categoryName?: string;
  commentCount?: number;
}

// --- NUEVO: Publicación de tipo Markdown (el artículo estándar existente) ---
export interface MarkdownArticle extends ArticleBase {
  type: 'markdown';
  excerpt: string;
  content: string; // Markdown
  coverImageUrl: string;
}

// --- NUEVO: Publicación de tipo PDF ---
export interface PdfPublication extends ArticleBase {
  type: 'pdf';
  pdfUrl: string;
  // 'title' ya está en la base
}

// --- NUEVO: Publicación de tipo Secuencia de Imágenes ---
export interface SequencePublication extends ArticleBase {
  type: 'sequence';
  // 'title' ya está en la base
  sections: {
    image: string;
    text: string;
  }[];
}

// --- MODIFICADO: El tipo Article es ahora una unión de los diferentes tipos de publicación ---
export type Article = MarkdownArticle | PdfPublication | SequencePublication;

export interface Author {
  id: string;
  name: string;
  avatarUrl?: string; 
  // email?: string; // If needed for display or contact
}

export interface Category {
  id:string;
  name: string;
  slug: string;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: 'user' | 'journalist' | 'admin';
  photoURL?: string | null; // To store avatar URL from Firebase Auth user
}

export interface Comment {
  id: string;
  articleId: string;
  userId: string | null;
  username: string;
  avatarUrl?: string;
  text: string;
  timestamp: Timestamp;
  parentId: string | null;
  isDeleted?: boolean;
  isModerated?: boolean;
}
