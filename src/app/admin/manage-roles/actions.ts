'use server';

import { z } from 'zod';
import { getUserProfile, updateUserProfile } from '@/lib/firebase/firestore';
import { revalidatePath } from 'next/cache';
import * as admin from 'firebase-admin';

let adminSDKError: string | null = null;
if (admin.apps.length === 0) {
  try {
    admin.initializeApp();
    if (admin.apps.length === 0) {
        throw new Error("admin.initializeApp() was called but admin.apps is still empty.");
    }
  } catch (e: any) {
    console.error('Firebase Admin SDK initialization error in manageUserRoleAction:', e);
    adminSDKError = e.message || "Unknown error during Firebase Admin SDK initialization.";
  }
}

const ManageUserRoleSchema = z.object({
  userEmail: z.string().email('Correo electrónico inválido.'),
  newRole: z.enum(['user', 'journalist', 'admin'], {
    errorMap: () => ({ message: 'Rol seleccionado inválido.' }),
  }),
  idToken: z.string().min(1, 'Se requiere el token de autenticación del administrador.'),
});

export type ManageUserRoleFormState = {
  message: string;
  errors?: {
    userEmail?: string[];
    newRole?: string[];
    idToken?: string[];
    _form?: string[];
  };
  success: boolean;
};

export async function manageUserRoleAction(
  prevState: ManageUserRoleFormState,
  formData: FormData
): Promise<ManageUserRoleFormState> {

  if (admin.apps.length === 0) {
    const detail = adminSDKError ? `Detalles: ${adminSDKError}` : "Por favor revisa los logs del servidor para más detalles.";
    return {
        message: `El SDK de Firebase Admin no se pudo inicializar. ${detail}`,
        success: false,
        errors: { _form: [`Crítico: Fallo de inicialización del SDK Admin. ${detail}`] }
    };
  }

  const idToken = formData.get('idToken') as string;
  if (!idToken) {
    return { message: 'Falta el token de autenticación del administrador.', success: false, errors: { _form: ['Autenticación requerida.'] } };
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    if (decodedToken.role !== 'admin') {
      return { message: 'Permiso denegado. Solo los administradores pueden gestionar roles de usuario.', success: false, errors: { _form: ['Acción no autorizada.'] } };
    }
  } catch (tokenError) {
    console.error("Error verificando el token de administrador:", tokenError);
    return { message: 'No se pudo verificar el estado de administrador.', success: false, errors: { _form: ['Fallo la verificación de administrador.'] } };
  }

  const validatedFields = ManageUserRoleSchema.safeParse({
    userEmail: formData.get('userEmail'),
    newRole: formData.get('newRole'),
    idToken: idToken,
  });

  if (!validatedFields.success) {
    return {
      message: 'Validación fallida. Por favor revisa los campos del formulario.',
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }

  const { userEmail, newRole } = validatedFields.data;

  try {
    const targetUserProfile = await getUserProfile(userEmail);

    if (!targetUserProfile || !targetUserProfile.uid) {
      return {
        message: `No se encontró el usuario con correo '${userEmail}' o falta el UID. No se puede actualizar el rol.`,
        success: false,
        errors: { userEmail: ['Usuario no encontrado o perfil incompleto.'] }
      };
    }

    await admin.auth().setCustomUserClaims(targetUserProfile.uid, { role: newRole });
    console.log(`Rol de autenticación actualizado correctamente para ${userEmail} a ${newRole}.`);

    await updateUserProfile(targetUserProfile.uid, { role: newRole });
    console.log(`Rol en Firestore actualizado correctamente para ${userEmail} a ${newRole}.`);

    revalidatePath('/admin/manage-roles');

    return {
        message: `Rol y permisos actualizados correctamente para ${userEmail} a '${newRole}'.`,
        success: true
    };

  } catch (error) {
    console.error('Error gestionando el rol de usuario:', error);
    let errorMessage = 'Ocurrió un error inesperado al actualizar el rol del usuario.';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return {
      message: errorMessage,
      errors: { _form: [errorMessage] },
      success: false,
    };
  }
}
