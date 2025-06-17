import { getArticleBySlug, getAuthorById } from '@/lib/firebase/firestore';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { format } from 'date-fns';
import type { Metadata, ResolvingMetadata } from 'next';
import MarkdownRenderer from '@/components/markdown-renderer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CalendarDays, UserCircle } from 'lucide-react';

type Props = {
  params: { slug: string };
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const article = await getArticleBySlug(params.slug);

  if (!article) {
    return {
      title: 'Article Not Found',
    };
  }

  const previousImages = (await parent).openGraph?.images || [];

  return {
    title: article.title,
    description: article.excerpt,
    openGraph: {
      title: article.title,
      description: article.excerpt,
      images: [article.coverImageUrl, ...previousImages],
      type: 'article',
      publishedTime: article.publishedAt?.toDate().toISOString(),
      authors: article.authorName ? [article.authorName] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.excerpt,
      images: [article.coverImageUrl],
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const article = await getArticleBySlug(params.slug);

  if (!article || article.status !== 'published') {
    notFound();
  }
  
  const author = article.authorId ? await getAuthorById(article.authorId) : null;

  return (
    <article className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 bg-card shadow-xl rounded-lg">
      <header className="mb-8">
        <h1 className="font-headline text-3xl md:text-4xl lg:text-5xl font-bold text-primary mb-4 leading-tight">
          {article.title}
        </h1>
        <div className="flex flex-wrap items-center space-x-4 text-sm text-muted-foreground mb-6">
          <div className="flex items-center space-x-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={author?.avatarUrl || "https://placehold.co/40x40.png"} alt={author?.name || 'Author'} data-ai-hint="person avatar" />
              <AvatarFallback><UserCircle size={16}/></AvatarFallback>
            </Avatar>
            <span>{article.authorName || 'Anonymous'}</span>
          </div>
          <div className="flex items-center space-x-1">
            <CalendarDays size={16} />
            <time dateTime={article.publishedAt?.toDate().toISOString()}>
              {article.publishedAt ? format(article.publishedAt.toDate(), 'MMMM d, yyyy') : 'Date not available'}
            </time>
          </div>
          {article.categoryName && (
            <span className="px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-xs font-medium">
              {article.categoryName}
            </span>
          )}
        </div>
        {article.coverImageUrl && (
          <div className="relative w-full h-64 md:h-96 rounded-md overflow-hidden shadow-lg">
            <Image
              src={article.coverImageUrl}
              alt={article.title}
              layout="fill"
              objectFit="cover"
              priority
              data-ai-hint="article hero"
            />
          </div>
        )}
      </header>
      
      <MarkdownRenderer content={article.content} />

    </article>
  );
}
