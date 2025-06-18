
'use server';

import { z } from 'zod';
import { createUserProfile } from '@/lib/firebase/firestore';
// import { revalidatePath } from 'next/cache'; // Not strictly needed for user creation unless listing users somewhere
import * as admin from 'firebase-admin';

let adminSDKError: string | null = null;
if (admin.apps.length === 0) {
  try {
    admin.initializeApp();
    if (admin.apps.length === 0) {
        throw new Error("admin.initializeApp() was called but admin.apps is still empty.");
    }
  } catch (e: any) {
    console.error('Firebase Admin SDK initialization error in createUserAction:', e);
    adminSDKError = e.message || "Unknown error during Firebase Admin SDK initialization.";
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

  if (admin.apps.length === 0) {
    const detail = adminSDKError ? `Details: ${adminSDKError}` : "Please check server logs for specific errors.";
    return {
        message: `Firebase Admin SDK failed to initialize. ${detail}`,
        success: false,
        errors: { _form: [`Critical: Admin SDK initialization failure. ${detail}`] }
    };
  }

  const idToken = formData.get('idToken') as string;
  if (!idToken) {
    return { message: 'Admin authentication token missing.', success: false, errors: { _form: ['Authentication required.'] } };
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
