import { getArticleBySlug } from '@/lib/firebase/firestore';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArticleSidebar } from '@/components/ArticleSidebar';
import { RelatedArticles } from '@/components/RelatedArticles';
import { SocialShare } from '@/components/SocialShare';
import { CommentsSection } from '@/components/CommentsSection';
import type { MarkdownArticle, PdfPublication, SequencePublication } from '@/types';
import { HtmlRenderer } from '@/components/HtmlRenderer';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { marked } from 'marked';

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
  const description = (article as MarkdownArticle).excerpt || `Lee el artículo ${article.title}`;
  return {
    title: article.title,
    description: description,
  };
}

// Función para limpiar y mejorar el markdown antes de convertirlo a HTML
function preprocessMarkdown(md: string): string {
  let clean = md
    // Convierte líneas que empiezan con "//" en subtítulos o bloques destacados
    .replace(/^\/\/\s?(.*)$/gm, '<div style="color:#888;font-style:italic;margin:8px 0 4px 0;">$1</div>')
    // Convierte líneas que parecen títulos pero no tienen "#"
    .replace(/^([A-Z][^\n]{10,})$/gm, '<h2>$1</h2>')
    // Opcional: convierte dobles saltos de línea en párrafos
    .replace(/\n{2,}/g, '</p><p>')
    // Opcional: convierte líneas en negrita si detecta ** o __
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.*?)__/g, '<strong>$1</strong>');
  // Asegura que todo esté dentro de un <p> si no es bloque
  clean = `<p>${clean}</p>`;
  return clean;
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const article = await getArticleBySlug(params.slug);

  if (!article) {
    notFound();
  }

  const articleUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/articles/${article.slug}`;

  const renderArticleContent = () => {
    const type = (article as any).type || (article as any).publicationType;
    switch (type) {
      case 'markdown':
      case 'standard':
        const mdArticle = article as MarkdownArticle;
        // NUEVO: Si hay contentHtml, úsalo directamente
        if ((mdArticle as any).contentHtml || (mdArticle as any).content?.startsWith('<')) {
          const htmlContent = (mdArticle as any).contentHtml || (mdArticle as any).content;
          return (
            <>
              <div className="relative w-full aspect-video rounded-lg overflow-hidden mb-8 shadow-lg">
                <Image
                  src={mdArticle.coverImageUrl || '/placeholder.png'}
                  alt={mdArticle.title}
                  fill
                  priority
                  className="object-cover"
                />
              </div>
              <div className="article-content" dangerouslySetInnerHTML={{ __html: htmlContent }} />
              <style>{`
                .article-content p,
                .article-content ul,
                .article-content ol {
                  margin-bottom: 2rem !important;
                }
                .article-content li,
                .article-content li.MsoNormal {
                  display: list-item !important;
                  margin-bottom: 0.5rem;
                  list-style-type: disc !important;
                }
                .article-content ul,
                .article-content ol {
                  padding-left: 2.5rem;
                }
                .article-content .MsoNormal {
                  margin: 0 0 1.5rem 0;
                  font-size: 1rem;
                  line-height: 1.7;
                  display: block;
                }
              `}</style>
            </>
          );
        }
        // Si no hay contentHtml, sigue con el renderizado markdown normal
        const htmlContent = marked.parse(preprocessMarkdown(mdArticle.content || ''));
        return (
          <>
            <div className="relative w-full aspect-video rounded-lg overflow-hidden mb-8 shadow-lg">
              <Image
                src={mdArticle.coverImageUrl || '/placeholder.png'}
                alt={mdArticle.title}
                fill
                priority
                className="object-cover"
              />
            </div>
            <div className="article-content" dangerouslySetInnerHTML={{ __html: htmlContent }} />
            <style>{`
              .article-content p,
              .article-content ul,
              .article-content ol {
                margin-bottom: 2rem !important;
              }
              .article-content li,
              .article-content li.MsoNormal {
                display: list-item !important;
                margin-bottom: 0.5rem;
                list-style-type: disc !important;
              }
              .article-content ul,
              .article-content ol {
                padding-left: 2.5rem;
              }
              .article-content .MsoNormal {
                margin: 0 0 1.5rem 0;
                font-size: 1rem;
                line-height: 1.7;
                display: block;
              }
            `}</style>
          </>
        );
      case 'pdf':
        const pdfArticle = article as PdfPublication;
        return (
          <div className="w-full aspect-[8.5/11] border rounded-lg overflow-hidden">
            <iframe src={pdfArticle.pdfUrl} className="w-full h-full" title={article.title} />
          </div>
        );
      case 'sequence':
        const seqArticle = article as SequencePublication;
        return (
          <div className="space-y-12">
            {seqArticle.sections.map((section, index) => (
              <div key={index} className="space-y-4 text-center">
                <div className="relative w-full aspect-video rounded-lg overflow-hidden shadow-lg bg-muted">
                  <Image src={section.image} alt={`Sección ${index + 1}`} fill className="object-contain" />
                </div>
                <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">{section.text}</p>
              </div>
            ))}
          </div>
        );
      default:
        return <p>Tipo de artículo no soportado para visualización.</p>;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-12">
        
        <main className="lg:col-span-2">
          <article>
            <header className="mb-8">
              <h1 className="font-headline text-4xl md:text-5xl font-bold leading-tight mb-4">
                {article.title}
              </h1>
              {(article as MarkdownArticle).excerpt && (
                <p
                  className="text-muted-foreground text-lg mb-4 max-w-2xl truncate whitespace-normal break-words"
                  style={{
                    overflowWrap: 'break-word',
                    wordBreak: 'break-word',
                    maxWidth: '100%',
                    whiteSpace: 'pre-line',
                  }}
                >
                  {(article as MarkdownArticle).excerpt}
                </p>
              )}
              <div className="flex items-center text-sm text-muted-foreground flex-wrap">
                <span>
                  Por {article.authorName === 'Unnamed Author' ? 'Dr. Robinson Rada Gonzalez' : article.authorName}
                </span>
                <span className="mx-2">•</span>
                <time dateTime={article.publishedAt ? article.publishedAt.toDate().toISOString() : new Date().toISOString()}>
                  {format(article.publishedAt ? article.publishedAt.toDate() : new Date(), "d 'de' MMMM 'de' yyyy", { locale: es })}
                </time>
                <span className="mx-2">•</span>
                <span>{article.commentCount || 0} comentarios</span>
              </div>
            </header>

            {renderArticleContent()}

            <SocialShare url={articleUrl} title={article.title} />
          </article>

          <CommentsSection articleId={article.id} articleSlug={article.slug} />
        </main>

        <aside className="lg:col-span-1 mt-8 lg:mt-0">
          <ArticleSidebar />
        </aside>

      </div>

      <div className="mt-16">
        <RelatedArticles
          categoryId={article.categoryId}
          currentArticleId={article.id}
        />
      </div>
    </div>
  );
}
