import { getArticleBySlug } from '@/lib/firebase/firestore';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { format } from 'date-fns';
import MarkdownRenderer from '@/components/markdown-renderer';
import { ArticleSidebar } from '@/components/ArticleSidebar';
import { RelatedArticles } from '@/components/RelatedArticles'; // <-- 1. Importa el nuevo componente

type Props = {
  params: { slug: string };
};

export default async function ArticlePage({ params }: Props) {
  const article = await getArticleBySlug(params.slug);

  if (!article || article.status !== 'published') {
    notFound();
  }

  return (
    // 2. Envuelve todo en un contenedor con Grid
    <div className="container mx-auto py-8 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
      
      {/* 3. Columna principal para el contenido del artículo */}
      <main className="lg:col-span-2">
        <article>
          <header className="mb-8">
            <p className="text-sm text-primary font-semibold mb-2">{article.categoryName || 'Uncategorized'}</p>
            <h1 className="font-headline text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-4">
              {article.title}
            </h1>
            <p className="text-lg text-muted-foreground mb-4">{article.excerpt}</p>
            <div className="text-sm text-muted-foreground">
              <span>By {article.authorName || 'Unknown Author'}</span>
              <span className="mx-2">•</span>
              <span>{article.publishedAt ? format(article.publishedAt.toDate(), 'MMMM d, yyyy') : ''}</span>
            </div>
          </header>

          {article.coverImageUrl && (
            <div className="relative w-full h-64 md:h-96 mb-8 rounded-lg overflow-hidden">
              <Image
                src={article.coverImageUrl}
                alt={article.title}
                fill
                className="object-cover"
                priority
              />
            </div>
          )}

          <MarkdownRenderer content={article.content} />
        </article>

        {/* 2. Añade la sección de artículos relacionados aquí */}
        <RelatedArticles
          categoryId={article.categoryId}
          currentArticleId={article.id}
        />
      </main>

      {/* 4. Columna de la barra lateral */}
      <aside className="lg:col-span-1 sticky top-8">
        <ArticleSidebar />
      </aside>

    </div>
  );
}
