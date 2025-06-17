
'use server';

import { z } from 'zod';
import { createCategory } from '@/lib/firebase/firestore';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/firebase/config'; // For admin check

// Helper to generate a slug from name
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
});

export type CreateCategoryFormState = {
  message: string;
  errors?: {
    name?: string[];
    _form?: string[];
  };
  success: boolean;
};

export async function createCategoryAction(
  prevState: CreateCategoryFormState,
  formData: FormData
): Promise<CreateCategoryFormState> {
  // Admin Check
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return { message: 'Admin not authenticated.', success: false, errors: { _form: ['Authentication required.'] } };
  }
  const idTokenResult = await currentUser.getIdTokenResult(true);
  const isAdmin = idTokenResult.claims.role === 'admin';

  if (!isAdmin) {
    return { message: 'Permission denied. Only admins can create categories.', success: false, errors: { _form: ['Unauthorized action.'] } };
  }

  const validatedFields = CategorySchema.safeParse({
    name: formData.get('name'),
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
    revalidatePath('/admin/create'); // Revalidate article creation form in case categories are fetched there
    // Potentially revalidate other paths where categories are displayed or used

    return { message: `Category "${name}" created successfully!`, success: true };

  } catch (error) {
    console.error('Error creating category:', error);
    let errorMessage = 'An unexpected error occurred while creating the category.';
    if (error instanceof Error) {
        errorMessage = error.message; // Use specific error message if available (e.g., duplicate slug)
    }
    return {
      message: errorMessage,
      errors: { _form: [errorMessage] },
      success: false,
    };
  }
}
