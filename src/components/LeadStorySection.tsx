import type { Article, Category } from '@/types';
import Link from 'next/link';
import Image from 'next/image';

interface LeadStorySectionProps {
  category: Category;
  articles: Article[];
}

export function LeadStorySection({ category, articles }: LeadStorySectionProps) {
  if (articles.length === 0) return null;

  const mainArticle = articles[0];
  const sideArticles = articles.slice(1, 5); // Tomamos los siguientes 4

  return (
    <section className="py-8 border-t">
      <div className="container mx-auto">
        <h2 className="text-2xl font-headline font-bold uppercase border-l-4 border-primary pl-4 mb-6">
          {category.name}
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Columna Izquierda/Central - Artículo Principal */}
          <div className="lg:col-span-2">
            <Link href={`/articles/${mainArticle.slug}`} className="block group">
              <div className="relative w-full h-96 mb-4 rounded-lg overflow-hidden">
                <Image
                  src={mainArticle.coverImageUrl || '/placeholder.png'}
                  alt={mainArticle.title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <h3 className="font-headline text-3xl font-bold leading-tight group-hover:text-primary transition-colors">
                {mainArticle.title}
              </h3>
              <p className="text-muted-foreground mt-2">{mainArticle.excerpt}</p>
            </Link>
          </div>
          
          {/* Columna Derecha - Lista de Noticias */}
          <div className="lg:col-span-1">
            <ul className="space-y-4">
              {sideArticles.map((article) => (
                <li key={article.id} className="border-b border-border pb-3 last:border-b-0 last:pb-0">
                  <Link
                    href={`/articles/${article.slug}`}
                    className="font-medium text-sm leading-snug hover:text-primary transition-colors"
                  >
                    {article.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}