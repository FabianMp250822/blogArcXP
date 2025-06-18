
'use server';

import { z } from 'zod';
// import { auth as clientAuth } from '@/lib/firebase/config'; // No longer using client auth for admin check
import { getUserProfileByEmail, updateUserProfile } from '@/lib/firebase/firestore';
import { revalidatePath } from 'next/cache';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK if not already initialized
if (admin.apps.length === 0) {
  try {
    admin.initializeApp();
  } catch (e) {
    console.error('Firebase Admin SDK initialization error in manageUserRoleAction:', e);
  }
}

const ManageUserRoleSchema = z.object({
  userEmail: z.string().email('Invalid email address.'),
  newRole: z.enum(['user', 'journalist', 'admin'], {
    errorMap: () => ({ message: 'Invalid role selected.' }),
  }),
  idToken: z.string().min(1, 'Admin authentication token is required.'), // Added idToken
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
  
  const idToken = formData.get('idToken') as string;
  if (!idToken) {
    return { message: 'Admin authentication token missing.', success: false, errors: { _form: ['Authentication required.'] } };
  }

  if (admin.apps.length === 0) {
    return { message: 'Server configuration error. Please try again later.', success: false, errors: { _form: ['Admin SDK not initialized.'] } };
  }
  
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    if (decodedToken.role !== 'admin') {
      return { message: 'Permission denied. Only admins can manage user roles.', success: false, errors: { _form: ['Unauthorized action.'] } };
    }
  } catch (tokenError) {
    console.error("Error verifying admin ID token:", tokenError);
    return { message: 'Could not verify admin status.', success: false, errors: { _form: ['Admin verification failed.'] } };
  }

  const validatedFields = ManageUserRoleSchema.safeParse({
    userEmail: formData.get('userEmail'),
    newRole: formData.get('newRole'),
    idToken: idToken, // For Zod validation
  });

  if (!validatedFields.success) {
    return {
      message: 'Validation failed. Please check the form fields.',
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }

  const { userEmail, newRole } = validatedFields.data;

  try {
    const targetUserProfile = await getUserProfileByEmail(userEmail);

    if (!targetUserProfile || !targetUserProfile.uid) {
      return {
        message: `User with email '${userEmail}' not found or UID is missing. Cannot update role.`,
        success: false,
        errors: { userEmail: ['User not found or profile incomplete.'] }
      };
    }
    
    await admin.auth().setCustomUserClaims(targetUserProfile.uid, { role: newRole });
    console.log(`Successfully set custom auth claims for ${userEmail} to ${newRole}.`);

    await updateUserProfile(targetUserProfile.uid, { role: newRole });
    console.log(`Successfully updated Firestore role for ${userEmail} to ${newRole}.`);

    revalidatePath('/admin/manage-roles'); 

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
