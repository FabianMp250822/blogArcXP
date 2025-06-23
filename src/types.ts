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

// --- NUEVA ESTRUCTURA PARA SECCIONES DE SECUENCIA ---
export interface ArticleSequenceSection {
  id: string; // ID único para la key de React
  imageUrl: string;
  text: string;
}

// --- ESTRUCTURA BASE COMPARTIDA POR TODOS LOS TIPOS ---
interface BaseArticle {
  id: string;
  title: string;
  slug: string;
  authorId: string;
  categoryId: string;
  status: 'draft' | 'pending_review' | 'published';
  createdAt: Timestamp;
  publishedAt?: Timestamp;
  // Nombres cacheados para eficiencia
  authorName?: string;
  categoryName?: string;
  commentCount?: number;
}

// --- TIPOS DE PUBLICACIÓN ESPECÍFICOS ---

// 1. Artículo Estándar (el que ya tienes)
export interface StandardArticle extends BaseArticle {
  publicationType: 'standard';
  excerpt: string;
  content: string; // Markdown
  coverImageUrl: string;
}

// 2. Artículo de PDF
export interface PdfArticle extends BaseArticle {
  publicationType: 'pdf';
  pdfUrl: string;
  coverImageUrl: string; // Imagen de portada para vistas previas
  excerpt: string; // Descripción corta para vistas previas
}

// 3. Artículo de Secuencia
export interface SequenceArticle extends BaseArticle {
  publicationType: 'sequence';
  sections: ArticleSequenceSection[];
  coverImageUrl: string; // Imagen principal para vistas previas
  excerpt: string; // Descripción corta para vistas previas
}

// --- UNIÓN DISCRIMINADA FINAL ---
// El tipo 'Article' ahora puede ser cualquiera de estos tres.
export type Article = StandardArticle | PdfArticle | SequenceArticle | MarkdownArticle | PdfPublication | SequencePublication;

export interface Author {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface Category {
  id:string;
  name: string;
  slug: string;
}

export type UserProfile = {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'user' | 'journalist' | 'admin';
  bio?: string;
  twitter?: string;
  blockedUsers?: string[];
  // Añade el estado de periodista
  journalistStatus?: 'pending' | 'approved' | 'rejected'; // <-- NUEVO
  mediaOutlet?: string; // Medio de comunicación (opcional)
  portfolioUrl?: string; // Enlace a portafolio (requerido para periodista)
};

export type SiteSettings = {
  siteName: string;
  logoUrl: string;
  // --- AÑADE ESTOS NUEVOS CAMPOS ---
  primaryColor?: string;   // Almacenado como HEX, ej: #000000
  secondaryColor?: string; // Almacenado como HEX, ej: #f5a623
  fontFamily?: 'inter' | 'roboto' | 'lato';
};

// --- AÑADE ESTE NUEVO TIPO PARA LOS COMENTARIOS ---
export interface Comment {
  id: string;
  articleId: string; // ID del artículo al que pertenece
  userId: string;
  username: string; // Denormalizado para fácil visualización
  avatarUrl?: string; // Denormalizado para fácil visualización
  text: string;
  timestamp: Timestamp;
  parentId: string | null; // ID del comentario padre si es una respuesta
  replies?: Comment[]; // Las respuestas se pueden anidar para la UI
  isDeleted?: boolean; // Para borrado lógico
  isModerated?: boolean; // Si el comentario ha sido ocultado por moderación
}

// --- AÑADE ESTOS NUEVOS TIPOS ---

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  timestamp: any; // Usaremos ServerTimestamp
  isRead: boolean;
};

export interface Conversation {
  id: string;
  participants: string[];
  participantProfiles: UserProfile[];
  lastMessage: string;
  lastMessageTimestamp: any; // O un tipo más específico
  unreadCounts?: { [key: string]: number }; // <-- Añade esta línea
}