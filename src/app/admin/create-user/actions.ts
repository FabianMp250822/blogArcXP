
'use server';

import { z } from 'zod';
import { auth as clientAuth } from '@/lib/firebase/config'; // Client SDK for current user check
import { createUserProfile } from '@/lib/firebase/firestore';
import { revalidatePath } from 'next/cache';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK if not already initialized
if (admin.apps.length === 0) {
  try {
    // This will use Application Default Credentials
    // or the service account key file if GOOGLE_APPLICATION_CREDENTIALS is set.
    admin.initializeApp(); 
  } catch (e) {
    console.error('Firebase Admin SDK initialization error in createUserAction:', e);
  }
}

const CreateUserSchema = z.object({
  email: z.string().email('Invalid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters long.'),
  displayName: z.string().optional(),
  role: z.enum(['journalist', 'user', 'admin']).default('journalist') // Default to journalist, could be a select in form
});

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
  
  // 1. Admin Check (using client auth for the calling user)
  const currentUser = clientAuth.currentUser;
  if (!currentUser) {
    return { message: 'Admin not authenticated.', success: false, errors: { _form: ['Authentication required.'] } };
  }
  
  let isAdmin = false;
  try {
    const idTokenResult = await currentUser.getIdTokenResult(true); // Force refresh to get latest claims
    isAdmin = idTokenResult.claims.role === 'admin';
  } catch (tokenError) {
    console.error("Error fetching ID token for admin check:", tokenError);
    return { message: 'Could not verify admin status.', success: false, errors: { _form: ['Admin verification failed.'] } };
  }

  if (!isAdmin) {
    return { message: 'Permission denied. Only admins can create users.', success: false, errors: { _form: ['Unauthorized action.'] } };
  }

  // 2. Validate Form Data
  const validatedFields = CreateUserSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    displayName: formData.get('displayName') || undefined,
    role: formData.get('role') || 'journalist', // If role is not in form, default here or take from schema
  });

  if (!validatedFields.success) {
    return {
      message: 'Validation failed. Please check the form fields.',
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }

  const { email, password, displayName, role } = validatedFields.data;

  if (admin.apps.length === 0) {
    return { message: 'Admin SDK not initialized. Cannot create user.', success: false, errors: { _form: ['Server configuration error.'] } };
  }

  try {
    // 3. Create user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: displayName || undefined, // Pass undefined if empty
    });
    const uid = userRecord.uid;
    console.log(`Successfully created new user in Auth: ${email} (UID: ${uid})`);

    // 4. Set custom claims
    await admin.auth().setCustomUserClaims(uid, { role });
    console.log(`Successfully set custom auth claims for ${email} to ${role}.`);

    // 5. Create user profile in Firestore
    await createUserProfile(uid, email, displayName || null, role, userRecord.photoURL);
    console.log(`Successfully created Firestore profile for ${email} with role ${role}.`);

    // Revalidate relevant paths if needed, e.g., a user list page
    // revalidatePath('/admin/users'); 

    return { 
        message: `Successfully created user ${email} with role '${role}'.`, 
        success: true 
    };

  } catch (error: any) {
    console.error('Error creating user:', error);
    let errorMessage = 'An unexpected error occurred while creating the user.';
    if (error.code === 'auth/email-already-exists') {
        errorMessage = 'This email address is already in use by another account.';
    } else if (error.code === 'auth/invalid-password' && error.message?.includes('Password must be at least 6 characters')) {
        // Firebase Admin SDK might enforce 6 char minimum by default, schema ensures 8.
        // This specific message parsing is brittle, but shows an example.
        errorMessage = 'Password is too weak. It must be at least 6 characters long (as per Firebase default).';
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
