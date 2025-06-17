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
  status: 'draft' | 'published';
  createdAt: Timestamp;
  publishedAt?: Timestamp;
  // Denormalized fields for easier display
  authorName?: string;
  categoryName?: string;
}

export interface Author {
  id: string;
  name: string;
  avatarUrl: string;
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
  role: 'user' | 'admin';
}
