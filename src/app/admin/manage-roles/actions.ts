
'use server';

import { z } from 'zod';
import { auth } from '@/lib/firebase/config';
import { getUserProfileByEmail, updateUserProfile } from '@/lib/firebase/firestore';
import type { UserProfile } from '@/types';
import { revalidatePath } from 'next/cache';

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
  
  // 1. Admin Check
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return { message: 'Admin not authenticated.', success: false, errors: { _form: ['Authentication required.'] } };
  }
  const idTokenResult = await currentUser.getIdTokenResult(true); // Force refresh to get latest claims
  const isAdmin = idTokenResult.claims.role === 'admin';

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

  try {
    // 3. Find user profile by email in Firestore
    const targetUserProfile = await getUserProfileByEmail(userEmail);

    if (!targetUserProfile) {
      return {
        message: `User with email '${userEmail}' not found in Firestore. Ensure the user has an existing profile.`,
        success: false,
        errors: { userEmail: ['User not found.'] }
      };
    }
    
    if (!targetUserProfile.uid) {
        return {
            message: `User profile for '${userEmail}' is incomplete (missing UID). Cannot update role.`,
            success: false,
            errors: { _form: ['User profile incomplete.'] }
        };
    }

    // 4. Update user's role in Firestore
    await updateUserProfile(targetUserProfile.uid, { role: newRole });

    // Revalidate relevant paths if necessary (e.g., if user lists are displayed elsewhere)
    // revalidatePath('/admin/users'); // Example if there's a user listing page

    return { 
        message: `Successfully updated role for ${userEmail} to '${newRole}' in Firestore. \nIMPORTANT: For permissions to take full effect, Firebase Auth custom claims must be updated for this user via a backend process (e.g., Cloud Function).`, 
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
