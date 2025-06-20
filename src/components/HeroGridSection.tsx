import type { Article, Category } from '@/types';
import Link from 'next/link';
import Image from 'next/image';

interface HeroGridSectionProps {
  category: Category;
  articles: Article[];
}

export function HeroGridSection({ category, articles }: HeroGridSectionProps) {
  if (!articles || articles.length === 0) return null;

  const mainArticle = articles[0];
  // Tomamos hasta 2 artículos para la columna lateral
  const sideArticles = articles.slice(1, 3); 

  // Determina si el artículo principal debe ocupar todo el ancho
  const isSingleArticle = articles.length === 1;

  return (
    <section className="py-8 border-t first-of-type:border-t-0">
      <div className="container mx-auto">
        <h2 className="text-2xl font-headline font-bold uppercase border-l-4 border-primary pl-4 mb-6">
          {category.name}
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Columna Izquierda/Central - Artículo Principal */}
          <div className={isSingleArticle ? "lg:col-span-3" : "lg:col-span-2"}>
            <Link href={`/articles/${mainArticle.slug}`} className="block group">
              <div className="relative w-full h-80 md:h-96 mb-4 rounded-lg overflow-hidden">
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
            </Link>
          </div>
          
          {/* Columna Derecha - Artículos Secundarios (solo si hay más de un artículo) */}
          {!isSingleArticle && sideArticles.length > 0 && (
            <div className="lg:col-span-1 space-y-6">
              {sideArticles.map((article) => (
                <Link key={article.id} href={`/articles/${article.slug}`} className="block group border-b border-border pb-4 last:border-b-0 last:pb-0">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-1 relative h-20 rounded-md overflow-hidden">
                      <Image
                        src={article.coverImageUrl || '/placeholder.png'}
                        alt={article.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                    <div className="col-span-2">
                      <h4 className="font-semibold leading-snug group-hover:text-primary transition-colors">
                        {article.title}
                      </h4>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}