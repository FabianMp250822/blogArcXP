'use server';

import { getAllAuthors, getAllCategories } from '@/lib/firebase/firestore';
import type { Author, Category } from '@/types';

export async function getAuthorsAndCategoriesForCreateForm(): Promise<{
  authors: Author[];
  categories: Category[];
}> {
  try {
    // Estas funciones usan el SDK de Admin, pero como esto es una Server Action, es seguro.
    const [authors, categories] = await Promise.all([
      getAllAuthors(),
      getAllCategories(),
    ]);
    return { authors, categories };
  } catch (error) {
    console.error("Error fetching data for create form:", error);
    // Devuelve arrays vacíos en caso de error para no romper el cliente.
    return { authors: [], categories: [] };
  }
}