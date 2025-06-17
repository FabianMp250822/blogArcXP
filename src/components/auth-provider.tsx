'use client';

import type { User } from 'firebase/auth';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { createContext, useEffect, useState, ReactNode } from 'react';
import { auth } from '@/lib/firebase/config';
import { getUserProfile, createUserProfile } from '@/lib/firebase/firestore';
import type { UserProfile } from '@/types';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  signOutUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        let profile = await getUserProfile(firebaseUser.uid);
        if (!profile) {
          // If profile doesn't exist, create a basic one.
          // This scenario might happen if user signed up but profile creation failed or is pending.
          // In a real app, you might want more robust handling or ensure profile creation during signup.
          profile = await createUserProfile(firebaseUser.uid, firebaseUser.email, firebaseUser.displayName);
        }
        setUserProfile(profile);
        setIsAdmin(profile?.role === 'admin');
      } else {
        setUser(null);
        setUserProfile(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signOutUser = async () => {
    await signOut(auth);
    // State will be updated by onAuthStateChanged listener
  };

  const value = { user, userProfile, loading, isAdmin, signOutUser };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
