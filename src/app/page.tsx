'use client';

import { useState, useEffect } from 'react';
import type { Category, Article } from '@/types';
import { getAllCategories, getArticlesByCategorySlug } from '@/lib/firebase/firestore';
import { HeroGridSection } from '@/components/HeroGridSection';
import { Loader2 } from 'lucide-react';

// Definimos un tipo para la estructura de datos de nuestra página
interface HomePageData {
  category: Category;
  articles: Article[];
}

export default function HomePage() {
  const [homePageData, setHomePageData] = useState<HomePageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Definimos la función de carga de datos dentro del efecto
    const fetchHomePageData = async () => {
      try {
        // 1. Obtenemos todas las categorías
        const allCategories = await getAllCategories();
        
        // --- ¡AQUÍ ESTÁ LA CORRECCIÓN PARA LA REPETICIÓN! ---
        // Usamos un Map para eliminar categorías con slugs duplicados.
        const uniqueCategoriesMap = new Map<string, Category>();
        allCategories.forEach(category => {
          if (category && category.slug) {
            uniqueCategoriesMap.set(category.slug, category);
          }
        });
        const uniqueCategories = Array.from(uniqueCategoriesMap.values());
        // --- FIN DE LA CORRECCIÓN ---

        // Ahora trabajamos solo con la lista de categorías únicas.
        const dataPromises = uniqueCategories.map(async (category) => {
          const articles = await getArticlesByCategorySlug(category.slug, 3);
          return { category, articles };
        });

        // 3. Esperamos a que todas las promesas se resuelvan
        const allData = await Promise.all(dataPromises);

        // 4. Filtramos las secciones que no tienen artículos para no mostrar un título vacío
        const finalData = allData.filter(item => item.articles.length > 0);
        
        // 5. Actualizamos el estado con los datos finales
        setHomePageData(finalData);

      } catch (err) {
        console.error("Error al cargar los datos de la página principal:", err);
        setError("No se pudieron cargar los artículos. Por favor, inténtalo de nuevo más tarde.");
      } finally {
        setLoading(false);
      }
    };

    fetchHomePageData();

  // --- ¡ESTA ES LA CORRECCIÓN CLAVE! ---
  // Un array de dependencias vacío le dice a React que ejecute este efecto
  // solo una vez, después del primer renderizado. Esto rompe el bucle infinito.
  }, []); 

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen text-destructive">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <main>
      {homePageData.map(({ category, articles }) => (
        <HeroGridSection key={category.id} category={category} articles={articles} />
      ))}
    </main>
  );
}
