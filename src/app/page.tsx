import { getAllCategories, getArticlesByCategorySlug } from '@/lib/firebase/firestore';
// Quitamos la importación de FeaturedCategorySection que ya no se usa aquí
import { HeroGridSection } from '@/components/HeroGridSection';
import { LeadStorySection } from '@/components/LeadStorySection';

export default async function HomePage() {
  const allCategories = await getAllCategories();

  // Separamos la categoría "Actualidad"
  const actualidadCategory = allCategories.find(c => c.slug === 'actualidad');
  const otherCategories = allCategories.filter(c => c.slug !== 'actualidad');

  // Obtenemos los 3 artículos más recientes para el diseño de portada de "Actualidad"
  const actualidadArticles = actualidadCategory 
    ? await getArticlesByCategorySlug(actualidadCategory.slug, 3) 
    : [];

  return (
    <main>
      {/* Sección de Actualidad siempre arriba, ahora con el nuevo diseño */}
      {actualidadCategory && actualidadArticles.length > 0 && (
        <HeroGridSection category={actualidadCategory} articles={actualidadArticles} />
      )}

      {/* Mapeamos las otras categorías y alternamos el diseño */}
      {otherCategories.map(async (category, index) => {
        // Para los diseños de grid, 5 artículos funcionan bien
        const articles = await getArticlesByCategorySlug(category.slug, 5);
        
        if (articles.length === 0) {
          return null;
        }

        // Alternamos entre los dos diseños de grid
        // Usamos HeroGridSection para el primer elemento después de actualidad, y luego alternamos
        if (index % 2 === 0) {
          return <LeadStorySection key={category.id} category={category} articles={articles} />;
        } else {
          // Reutilizamos HeroGridSection para dar variedad
          return <HeroGridSection key={category.id} category={category} articles={articles} />;
        }
      })}
    </main>
  );
}
