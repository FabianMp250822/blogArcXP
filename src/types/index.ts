
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
  status: 'draft' | 'pending_review' | 'published'; // Updated status
  createdAt: Timestamp;
  publishedAt?: Timestamp;
  // Denormalized fields for easier display
  authorName?: string;
  categoryName?: string;
}

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
