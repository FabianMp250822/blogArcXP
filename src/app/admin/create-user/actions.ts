'use server';

import { z } from 'zod';
import admin from '@/lib/firebase/admin';
import { createUserProfile } from '@/lib/firebase/firestore';

// Esquema de validación para el formulario de creación de usuario
const CreateUserSchema = z.object({
  email: z.string().email('Por favor, introduce un correo electrónico válido.'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
  displayName: z.string().optional(),
  role: z.enum(['journalist', 'user', 'admin']).default('journalist'),
  idToken: z.string().min(1, 'Se requiere token de autenticación del administrador.'),
});

// Tipado para el estado del formulario que usará useActionState
export type CreateUserFormState = {
  message: string;
  errors?: {
    email?: string[];
    password?: string[];
    displayName?: string[];
    role?: string[];
    _form?: string[];
  };
  success: boolean;
};

export async function createUserAction(
  prevState: CreateUserFormState,
  formData: FormData
): Promise<CreateUserFormState> {
  
  // 1. Verificar el token del administrador para asegurar que la acción es legítima
  const idToken = formData.get('idToken') as string;
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    if (decodedToken.role !== 'admin') {
      throw new Error('Permission denied.');
    }
  } catch (error) {
    console.error("Error verificando el token del admin:", error);
    return { message: 'No tienes permiso para realizar esta acción.', success: false, errors: { _form: ['Verificación de administrador fallida.'] } };
  }

  // 2. Validar los campos del formulario
  const validatedFields = CreateUserSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    displayName: formData.get('displayName') || undefined,
    role: formData.get('role') || 'journalist',
    idToken: idToken,
  });

  if (!validatedFields.success) {
    return {
      message: 'Validación fallida. Por favor, revisa los campos.',
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }

  const { email, password, displayName, role } = validatedFields.data;

  // 3. Intentar crear el usuario en Firebase
  try {
    // Crear usuario en Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: displayName || undefined,
    });
    const uid = userRecord.uid;

    // Asignar el rol como un custom claim en Firebase Auth
    await admin.auth().setCustomUserClaims(uid, { role });

    // Crear el perfil del usuario en la base de datos de Firestore
    await createUserProfile(uid, email, displayName || null, role, userRecord.photoURL);

    return {
        message: `Usuario ${email} creado exitosamente con el rol de '${role}'.`,
        success: true
    };

  } catch (error: any) {
    console.error('Error creando usuario:', error);
    let errorMessage = 'Ocurrió un error inesperado al crear el usuario.';
    if (error.code === 'auth/email-already-exists') {
        errorMessage = 'Esta dirección de correo ya está en uso.';
    } else if (error.code === 'auth/invalid-password') {
        errorMessage = 'La contraseña es demasiado débil o inválida.';
    }

    return {
      message: errorMessage,
      errors: { _form: [errorMessage] },
      success: false,
    };
  }
}
