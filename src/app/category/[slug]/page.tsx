import { getArticlesByCategorySlug, getCategoryBySlug } from '@/lib/firebase/firestore';
import ArticleCard from '@/components/article-card';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

type Props = {
  params: { slug: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = await getCategoryBySlug(params.slug);
  if (!category) {
    return { title: 'Categoría no encontrada' };
  }
  return {
    title: `Artículos en ${category.name}`,
    description: `Explora los artículos de la categoría: ${category.name}.`,
  };
}

export default async function CategoryPage({ params }: Props) {
  const category = await getCategoryBySlug(params.slug);
  if (!category) {
    notFound();
  }

  const articles = await getArticlesByCategorySlug(params.slug);

  return (
    <div className="space-y-12">
      <section aria-labelledby="category-title">
        <h1 id="category-title" className="font-headline text-3xl md:text-4xl font-bold mb-8 text-center text-primary">
          Categoría: {category.name}
        </h1>
        {articles.length === 0 ? (
          <p className="text-center text-muted-foreground">No se encontraron artículos en esta categoría.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {articles.map((article) => (
              <ArticleCard
                key={article.id}
                article={{
                  ...article,
                  authorName: article.authorName === 'Unnamed Author' ? 'Dr. Robinson Rada Gonzalez' : article.authorName
                }}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
