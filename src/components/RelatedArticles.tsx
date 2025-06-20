import { getRelatedArticles } from '@/lib/firebase/firestore';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface RelatedArticlesProps {
  categoryId?: string;
  currentArticleId: string;
}

export async function RelatedArticles({ categoryId, currentArticleId }: RelatedArticlesProps) {
  if (!categoryId) {
    return null;
  }

  const articles = await getRelatedArticles(categoryId, currentArticleId, 3);

  if (articles.length === 0) {
    return null;
  }

  return (
    <section className="mt-12 pt-8 border-t">
      <h2 className="text-2xl font-headline font-bold mb-6">Artículos Relacionados</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {articles.map((article) => (
          <Link key={article.id} href={`/articles/${article.slug}`} className="block group">
            <Card className="h-full overflow-hidden transition-shadow hover:shadow-lg">
              <div className="relative w-full h-40">
                <Image
                  src={article.coverImageUrl || '/placeholder.png'}
                  alt={article.title}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                />
              </div>
              <CardHeader>
                <CardTitle className="text-lg leading-snug font-semibold group-hover:text-primary transition-colors">
                  {article.title}
                </CardTitle>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}