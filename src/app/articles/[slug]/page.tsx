import { getArticleBySlug } from '@/lib/firebase/firestore';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import MarkdownRenderer from '@/components/markdown-renderer';
import { ArticleSidebar } from '@/components/ArticleSidebar';
import { RelatedArticles } from '@/components/RelatedArticles'; // <-- 1. Importa el nuevo componente

interface ArticlePageProps {
  params: {
    slug: string;
  };
}

// Esta función genera metadatos dinámicos para el SEO (título de la pestaña del navegador)
export async function generateMetadata({ params }: ArticlePageProps) {
  const article = await getArticleBySlug(params.slug);
  if (!article) {
    return { title: 'Artículo no encontrado' };
  }
  return {
    title: article.title,
    description: article.excerpt,
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const article = await getArticleBySlug(params.slug);

  if (!article) {
    notFound();
  }

  return (
    // --- CORRECCIÓN: Se reintroduce el layout de Grid de dos columnas ---
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-12">
        
        {/* --- COLUMNA PRINCIPAL (Contenido del artículo) --- */}
        <main className="lg:col-span-2">
          <article>
            {/* Título y metadatos */}
            <header className="mb-8">
              <h1 className="font-headline text-4xl md:text-5xl font-bold leading-tight mb-4">
                {article.title}
              </h1>
              <p className="text-muted-foreground text-lg mb-4">{article.excerpt}</p>
              <div className="flex items-center text-sm text-muted-foreground">
                <span>Por {article.authorName}</span>
                <span className="mx-2">•</span>
                <time dateTime={article.publishedAt.toDate().toISOString()}>
                  {format(article.publishedAt.toDate(), "d 'de' MMMM 'de' yyyy", { locale: es })}
                </time>
              </div>
            </header>

            {/* Imagen de Portada */}
            <div className="relative w-full aspect-video rounded-lg overflow-hidden mb-8 shadow-lg">
              <Image
                src={article.coverImageUrl || '/placeholder.png'}
                alt={article.title}
                fill
                priority
                className="object-cover"
              />
            </div>

            {/* Contenido del Artículo (usando el componente seguro) */}
            <MarkdownRenderer content={article.content || ''} />
          </article>
        </main>

        {/* --- SIDEBAR (Artículos recientes) --- */}
        <aside className="lg:col-span-1 mt-8 lg:mt-0">
          <ArticleSidebar />
        </aside>

      </div>

      {/* --- SECCIÓN DE ARTÍCULOS RELACIONADOS (Debajo del grid) --- */}
      <div className="mt-16">
        <RelatedArticles
          categoryId={article.categoryId}
          currentArticleId={article.id}
        />
      </div>
    </div>
  );
}
