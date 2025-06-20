import type { Timestamp } from 'firebase/firestore';

export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string; // Markdown
  coverImageUrl: string;
  authorId: string;
  categoryId: string;
  status: 'draft' | 'pending_review' | 'published';
  createdAt: Timestamp;
  publishedAt?: Timestamp;
  authorName?: string;
  categoryName?: string;
}

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
  // --- AÑADE ESTA LÍNEA ---
  blockedUsers?: string[]; // Array de UIDs de usuarios bloqueados
};

export type SiteSettings = {
  siteName: string;
  logoUrl: string;
  // --- AÑADE ESTOS NUEVOS CAMPOS ---
  primaryColor?: string;   // Almacenado como HEX, ej: #000000
  secondaryColor?: string; // Almacenado como HEX, ej: #f5a623
  fontFamily?: 'inter' | 'roboto' | 'lato';
};

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