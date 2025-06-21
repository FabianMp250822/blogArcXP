'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createCategory, updateCategory, deleteCategoryAndReassignArticles } from '@/lib/firebase/firestore-admin';
import admin from '@/lib/firebase/admin'; // Importar la instancia centralizada

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
  idToken: z.string().min(1, 'Admin authentication token is required.'),
});

// --- Esquema para la actualización ---
const UpdateCategorySchema = z.object({
  id: z.string().min(1, 'El ID es requerido.'),
  name: z.string().min(1, 'El nuevo nombre es requerido.'),
});

// --- Esquema para la eliminación ---
const DeleteCategorySchema = z.object({
  slug: z.string().min(1, 'El slug es requerido.'),
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
    idToken: idToken,
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

export async function updateCategoryAction(prevState: any, formData: FormData) {
  const validatedFields = UpdateCategorySchema.safeParse({
    id: formData.get('id'), // Obtenemos el ID del formulario
    name: formData.get('name'),
  });

  if (!validatedFields.success) {
    return { success: false, message: 'Error de validación.' };
  }

  try {
    // Pasamos el ID a la función del backend
    await updateCategory(validatedFields.data.id, validatedFields.data.name);
    revalidatePath('/admin/categories');
    return { success: true, message: 'Categoría actualizada con éxito.' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ocurrió un error.';
    return { success: false, message };
  }
}

// --- Acción para la eliminación ---
export async function deleteCategoryAction(prevState: any, formData: FormData) {
  const validatedFields = DeleteCategorySchema.safeParse({
    slug: formData.get('slug'),
  });

  if (!validatedFields.success) {
    return { success: false, message: 'Error de validación: Slug no encontrado.' };
  }

  try {
    await deleteCategoryAndReassignArticles(validatedFields.data.slug);
    // ¡Clave! Invalida el caché para que las próximas cargas de datos sean frescas.
    revalidatePath('/admin/categories');
    return { success: true, message: 'Categoría eliminada y artículos reasignados.' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ocurrió un error al eliminar la categoría.';
    return { success: false, message };
  }
}
