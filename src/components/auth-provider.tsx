'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { doc, onSnapshot, getDoc } from 'firebase/firestore'; // Import onSnapshot
import { auth, db } from '@/lib/firebase/config'; // Import db
import type { UserProfile } from '@/types';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  role: UserProfile['role'] | null;
  loading: boolean;
  isAdmin: boolean;
  isJournalist: boolean;
  signOutUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isJournalist, setIsJournalist] = useState(false); // 1. Añade este estado
  const [role, setRole] = useState<'user' | 'journalist' | 'admin' | null>(null);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;

    // --- CORRECCIÓN: La función callback debe ser 'async' para usar 'await' ---
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (unsubscribeProfile) unsubscribeProfile(); // Limpia el listener anterior

      if (user) {
        // Escucha cambios en el perfil del usuario en tiempo real
        const userProfileRef = doc(db, 'users', user.uid);
        unsubscribeProfile = onSnapshot(userProfileRef, async (profileSnap) => {
          if (profileSnap.exists()) {
            const profile = profileSnap.data() as UserProfile;
            setUser(user);
            setUserProfile(profile);

            if (user.email === 'fabianmunozpuello@gmail.com') {
              setIsAdmin(true);
              setIsJournalist(false); // El super admin no es un periodista
              setRole('admin');
            } else {
              // 2. Establece los roles según el perfil del usuario
              setIsAdmin(profile?.role === 'admin');
              setIsJournalist(profile?.role === 'journalist');
              setRole(profile?.role || 'user');
            }
          }
          setLoading(false);
        });
        
        const idToken = await user.getIdToken();
        await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        });

      } else {
        // Limpiar estado al cerrar sesión
        setUser(null);
        setUserProfile(null);
        setIsAdmin(false);
        setIsJournalist(false); // 3. Resetea el estado al cerrar sesión
        setRole(null);
        setLoading(false);
        await fetch('/api/auth/logout', { method: 'POST' });
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const signOutUser = async () => {
    await signOut(auth);
  };

  // 4. Provee el nuevo estado en el valor del contexto
  const value = { user, userProfile, loading, signOutUser, isAdmin, isJournalist, role };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
