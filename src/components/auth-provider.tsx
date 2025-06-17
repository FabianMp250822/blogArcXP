
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
  role: UserProfile['role'] | null;
  loading: boolean;
  isAdmin: boolean; // Kept for convenience, derived from role
  isJournalist: boolean; // Derived from role
  signOutUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserProfile['role'] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          // Force refresh token to get latest custom claims
          const idTokenResult = await firebaseUser.getIdTokenResult(true);
          const userRole = (idTokenResult.claims.role as UserProfile['role']) || 'user';
          setRole(userRole);

          let profile = await getUserProfile(firebaseUser.uid);
          if (!profile) {
            profile = await createUserProfile(firebaseUser.uid, firebaseUser.email, firebaseUser.displayName, userRole);
          } else if (profile.role !== userRole) {
            // If Firestore role and claim role mismatch, claim is source of truth during session
            // Optionally, update Firestore profile role here if desired, but claims are primary for session access control
            profile.role = userRole; 
          }
          setUserProfile(profile);

        } catch (error) {
          console.error("Error fetching user claims or profile:", error);
          // Fallback or default role if claims fail
          setRole('user'); 
          const profile = await getUserProfile(firebaseUser.uid) || 
                          await createUserProfile(firebaseUser.uid, firebaseUser.email, firebaseUser.displayName, 'user');
          setUserProfile(profile);
        }
      } else {
        setUser(null);
        setUserProfile(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signOutUser = async () => {
    await signOut(auth);
    // State will be updated by onAuthStateChanged listener
  };

  const isAdmin = role === 'admin';
  const isJournalist = role === 'journalist';

  const value = { user, userProfile, role, loading, isAdmin, isJournalist, signOutUser };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
