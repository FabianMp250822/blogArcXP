import type { Article, Category } from '@/types';
import Link from 'next/link';
import Image from 'next/image';

interface HeroGridSectionProps {
  category: Category;
  articles: Article[];
}

export function HeroGridSection({ category, articles }: HeroGridSectionProps) {
  if (!articles || articles.length === 0) {
    return null;
  }

  const validArticles = articles.filter(article => article && article.id && article.slug);

  if (validArticles.length === 0) {
    return null;
  }

  const mainArticle = validArticles[0];
  const sideArticles = validArticles.slice(1, 3);

  return (
    <section className="py-8 border-t first-of-type:border-t-0">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl font-headline font-bold uppercase border-l-4 border-primary pl-4 mb-6">
          <Link href={`/category/${category.slug}`} className="hover:text-primary transition-colors">
            {category.name}
          </Link>
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Link href={`/articles/${mainArticle.slug}`} className="block group">
              <div className="relative w-full aspect-video mb-4 rounded-lg overflow-hidden shadow-lg">
                <Image
                  src={mainArticle.coverImageUrl || '/placeholder.png'}
                  alt={mainArticle.title}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 800px"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <h3 className="font-headline text-2xl md:text-3xl font-bold leading-tight group-hover:text-primary transition-colors">
                {mainArticle.title}
              </h3>
              <p className="text-muted-foreground mt-2">{mainArticle.excerpt}</p>
            </Link>
          </div>
          
          <div className="lg:col-span-1 space-y-6">
            {sideArticles.map((article) => (
              <Link key={article.id} href={`/articles/${article.slug}`} className="block group">
                <div className="grid grid-cols-3 gap-4 items-center">
                  <div className="col-span-1 relative aspect-square rounded-md overflow-hidden">
                    <Image
                      src={article.coverImageUrl || '/placeholder.png'}
                      alt={article.title}
                      fill
                      sizes="150px"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="col-span-2">
                    <h4 className="font-headline text-lg font-bold leading-snug group-hover:text-primary transition-colors">
                      {article.title}
                    </h4>
                    <p className="text-muted-foreground text-sm mt-1">{article.excerpt}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}