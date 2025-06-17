
'use server';

import { z } from 'zod';
import { auth as clientAuth } from '@/lib/firebase/config'; // Client SDK for current user check
import { getUserProfileByEmail, updateUserProfile } from '@/lib/firebase/firestore';
import { revalidatePath } from 'next/cache';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK if not already initialized
if (admin.apps.length === 0) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  } catch (e) {
    console.error('Firebase Admin SDK initialization error in manageUserRoleAction:', e);
  }
}


const ManageUserRoleSchema = z.object({
  userEmail: z.string().email('Invalid email address.'),
  newRole: z.enum(['user', 'journalist', 'admin'], {
    errorMap: () => ({ message: 'Invalid role selected.' }),
  }),
});

export type ManageUserRoleFormState = {
  message: string;
  errors?: {
    userEmail?: string[];
    newRole?: string[];
    _form?: string[];
  };
  success: boolean;
};

export async function manageUserRoleAction(
  prevState: ManageUserRoleFormState,
  formData: FormData
): Promise<ManageUserRoleFormState> {
  
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
    return { message: 'Permission denied. Only admins can manage user roles.', success: false, errors: { _form: ['Unauthorized action.'] } };
  }

  // 2. Validate Form Data
  const validatedFields = ManageUserRoleSchema.safeParse({
    userEmail: formData.get('userEmail'),
    newRole: formData.get('newRole'),
  });

  if (!validatedFields.success) {
    return {
      message: 'Validation failed. Please check the form fields.',
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }

  const { userEmail, newRole } = validatedFields.data;

  if (admin.apps.length === 0) {
    return { message: 'Admin SDK not initialized. Cannot set custom claims.', success: false, errors: { _form: ['Server configuration error.'] } };
  }

  try {
    // 3. Find user profile by email in Firestore
    const targetUserProfile = await getUserProfileByEmail(userEmail);

    if (!targetUserProfile || !targetUserProfile.uid) {
      return {
        message: `User with email '${userEmail}' not found or UID is missing. Cannot update role.`,
        success: false,
        errors: { userEmail: ['User not found or profile incomplete.'] }
      };
    }
    
    // 4. Set custom claims using Admin SDK
    await admin.auth().setCustomUserClaims(targetUserProfile.uid, { role: newRole });
    console.log(`Successfully set custom auth claims for ${userEmail} to ${newRole}.`);

    // 5. Update user's role in Firestore
    await updateUserProfile(targetUserProfile.uid, { role: newRole });
    console.log(`Successfully updated Firestore role for ${userEmail} to ${newRole}.`);

    revalidatePath('/admin/manage-roles'); // Or any other relevant path

    return { 
        message: `Successfully updated role and permissions for ${userEmail} to '${newRole}'.`, 
        success: true 
    };

  } catch (error) {
    console.error('Error managing user role:', error);
    let errorMessage = 'An unexpected error occurred while updating the user role.';
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
