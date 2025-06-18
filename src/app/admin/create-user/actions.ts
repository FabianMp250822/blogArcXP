
'use server';

import { z } from 'zod';
// import { auth as clientAuth } from '@/lib/firebase/config'; // No longer using clientAuth for admin check
import { createUserProfile } from '@/lib/firebase/firestore';
import { revalidatePath } from 'next/cache';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK if not already initialized
if (admin.apps.length === 0) {
  try {
    admin.initializeApp(); 
  } catch (e) {
    console.error('Firebase Admin SDK initialization error in createUserAction:', e);
  }
}

const CreateUserSchema = z.object({
  email: z.string().email('Invalid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters long.'),
  displayName: z.string().optional(),
  role: z.enum(['journalist', 'user', 'admin']).default('journalist')
});

export type CreateUserFormState = {
  message: string;
  errors?: {
    email?: string[];
    password?: string[];
    displayName?: string[];
    role?: string[];
    _form?: string[];
    idToken?: string[];
  };
  success: boolean;
};

export async function createUserAction(
  prevState: CreateUserFormState,
  formData: FormData
): Promise<CreateUserFormState> {
  
  const idToken = formData.get('idToken') as string;
  if (!idToken) {
    return { message: 'Admin authentication token missing.', success: false, errors: { _form: ['Authentication required.'] } };
  }

  if (admin.apps.length === 0) {
    return { message: 'Admin SDK not initialized. Cannot create user.', success: false, errors: { _form: ['Server configuration error. Please try again later.'] } };
  }
  
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    if (decodedToken.role !== 'admin') {
      return { message: 'Permission denied. Only admins can create users.', success: false, errors: { _form: ['Unauthorized action.'] } };
    }
  } catch (error) {
    console.error("Error verifying admin ID token:", error);
    return { message: 'Could not verify admin status.', success: false, errors: { _form: ['Admin verification failed.'] } };
  }

  const validatedFields = CreateUserSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    displayName: formData.get('displayName') || undefined,
    role: formData.get('role') || 'journalist',
  });

  if (!validatedFields.success) {
    return {
      message: 'Validation failed. Please check the form fields.',
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }

  const { email, password, displayName, role } = validatedFields.data;

  try {
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: displayName || undefined,
    });
    const uid = userRecord.uid;
    console.log(`Successfully created new user in Auth: ${email} (UID: ${uid})`);

    await admin.auth().setCustomUserClaims(uid, { role });
    console.log(`Successfully set custom auth claims for ${email} to ${role}.`);

    await createUserProfile(uid, email, displayName || null, role, userRecord.photoURL);
    console.log(`Successfully created Firestore profile for ${email} with role ${role}.`);

    return { 
        message: `Successfully created user ${email} with role '${role}'.`, 
        success: true 
    };

  } catch (error: any) {
    console.error('Error creating user:', error);
    let errorMessage = 'An unexpected error occurred while creating the user.';
    if (error.code === 'auth/email-already-exists') {
        errorMessage = 'This email address is already in use by another account.';
    } else if (error.code === 'auth/invalid-password') {
        errorMessage = 'Password is too weak or invalid.';
    } else if (error instanceof Error) {
        errorMessage = error.message;
    }
    
    return {
      message: errorMessage,
      errors: { _form: [errorMessage] },
      success: false,
    };
  }
}
