import 'server-only';
import { cookies } from 'next/headers';
import admin from './firebase/admin';

export interface AppSession {
  uid: string;
  email: string | null;
  role: string;
}

export async function getSession(): Promise<AppSession | null> {
  const sessionCookie = cookies().get('session')?.value;

  if (!sessionCookie) {
    return null;
  }

  try {
    const decodedToken = await admin.auth().verifySessionCookie(sessionCookie, true);

    const session: AppSession = {
      uid: decodedToken.uid,
      email: decodedToken.email || null,
      role: (decodedToken.role as string) || 'user',
    };
    return session;
  } catch (error) {
    console.log('Error al verificar la cookie de sesión, se eliminará:', error);
    cookies().delete('session');
    return null;
  }
}