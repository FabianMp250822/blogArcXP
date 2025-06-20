import type { Article, Category } from '@/types';
import Link from 'next/link';
import Image from 'next/image';
import { Bookmark } from 'lucide-react';

interface FeaturedCategorySectionProps {
  category: Category;
  articles: Article[];
}

export function FeaturedCategorySection({ category, articles }: FeaturedCategorySectionProps) {
  if (articles.length === 0) return null;

  return (
    <section className="py-8">
      <div className="container mx-auto">
        <h2 className="text-2xl font-headline font-bold uppercase border-l-4 border-primary pl-4 mb-6">
          {category.name}
        </h2>
        <div className="flex overflow-x-auto space-x-6 pb-4 -mx-4 px-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
          {articles.map((article) => (
            <Link key={article.id} href={`/articles/${article.slug}`} className="block group flex-shrink-0 w-64">
              <div className="relative w-full h-40 mb-3 rounded-lg overflow-hidden">
                <Image
                  src={article.coverImageUrl || '/placeholder.png'}
                  alt={article.title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute top-2 left-2">
                  <button className="bg-red-600 text-white text-xs font-bold py-1 px-2 rounded-sm flex items-center space-x-1 hover:bg-red-700 transition-colors">
                    <Bookmark size={12} />
                    <span>Guardar</span>
                  </button>
                </div>
              </div>
              <h3 className="text-base font-semibold leading-snug group-hover:text-primary transition-colors">
                {article.title}
              </h3>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}