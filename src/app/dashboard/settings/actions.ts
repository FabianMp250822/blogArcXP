'use server';

import { revalidatePath } from 'next/cache';
import admin from '@/lib/firebase/admin';
import { updateSiteSettings } from '@/lib/firebase/firestore';
import type { SiteSettings } from '@/types';

export async function updateSiteSettingsAction(
  idToken: string,
  settings: SiteSettings
): Promise<{ success: boolean; message: string }> {
  if (!idToken) {
    return { success: false, message: 'Authentication token is missing.' };
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    if (decodedToken.role !== 'admin') {
      return { success: false, message: 'Permission denied. You must be an admin.' };
    }

    await updateSiteSettings(settings);

    // Revalida todo el layout para que el header se actualice en todas partes
    revalidatePath('/', 'layout');

    return { success: true, message: '¡Configuración del sitio actualizada exitosamente!' };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, message: errorMessage };
  }
}