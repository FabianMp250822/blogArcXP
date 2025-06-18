
'use server';

import { z } from 'zod';
import { createCategory } from '@/lib/firebase/firestore';
import { revalidatePath } from 'next/cache';
// import { auth } from '@/lib/firebase/config'; // No longer using client auth for admin check
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (admin.apps.length === 0) {
  try {
    admin.initializeApp(); 
  } catch (e) {
    console.error('Firebase Admin SDK initialization error in createCategoryAction:', e);
  }
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-') 
    .replace(/[^\w-]+/g, '') 
    .replace(/--+/g, '-') 
    .replace(/^-+/, '') 
    .replace(/-+$/, ''); 
}

const CategorySchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters long.'),
  idToken: z.string().min(1, 'Admin authentication token is required.'), // Added idToken
});

export type CreateCategoryFormState = {
  message: string;
  errors?: {
    name?: string[];
    idToken?: string[];
    _form?: string[];
  };
  success: boolean;
};

export async function createCategoryAction(
  prevState: CreateCategoryFormState,
  formData: FormData
): Promise<CreateCategoryFormState> {

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
      return { message: 'Permission denied. Only admins can create categories.', success: false, errors: { _form: ['Unauthorized action.'] } };
    }
  } catch (error) {
    console.error("Error verifying admin ID token:", error);
    return { message: 'Could not verify admin status.', success: false, errors: { _form: ['Admin verification failed.'] } };
  }

  const validatedFields = CategorySchema.safeParse({
    name: formData.get('name'),
    idToken: idToken, // For Zod validation
  });

  if (!validatedFields.success) {
    return {
      message: 'Validation failed. Please check the category name.',
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }

  const { name } = validatedFields.data;
  const slug = generateSlug(name);

  try {
    await createCategory(name, slug);
    revalidatePath('/admin/categories');
    revalidatePath('/admin/create'); 
    revalidatePath('/dashboard/create');

    return { message: `Category "${name}" created successfully!`, success: true };

  } catch (error) {
    console.error('Error creating category:', error);
    let errorMessage = 'An unexpected error occurred while creating the category.';
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
