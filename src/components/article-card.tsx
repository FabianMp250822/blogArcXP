import Image from 'next/image';
import Link from 'next/link';
import type { Article } from '@/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserCircle } from 'lucide-react';

interface ArticleCardProps {
  article: Pick<Article, 'title' | 'excerpt' | 'coverImageUrl' | 'slug' | 'authorName' | 'categoryName'>;
}

export default function ArticleCard({ article }: ArticleCardProps) {
  return (
    <Card className="flex flex-col h-full overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out">
      <Link href={`/articles/${article.slug}`} className="block">
        <CardHeader className="p-0">
          <div className="relative w-full h-48">
            <Image
              src={article.coverImageUrl || "https://placehold.co/600x400.png"}
              alt={article.title}
              layout="fill"
              objectFit="cover"
              className="transition-transform duration-300 group-hover:scale-105"
              data-ai-hint="news article"
            />
          </div>
        </CardHeader>
        <CardContent className="p-6 flex-grow">
          {article.categoryName && (
            <Badge variant="secondary" className="mb-2">{article.categoryName}</Badge>
          )}
          <CardTitle className="font-headline text-xl lg:text-2xl mb-2 leading-tight hover:text-primary transition-colors">
            {article.title}
          </CardTitle>
          <p className="text-muted-foreground text-sm line-clamp-3">
            {article.excerpt}
          </p>
        </CardContent>
      </Link>
      <CardFooter className="p-6 pt-0 border-t border-border">
        <div className="flex items-center space-x-3 text-sm text-muted-foreground">
          <Avatar className="h-8 w-8">
            <AvatarImage src={`https://placehold.co/40x40.png`} alt={article.authorName || 'Author'} data-ai-hint="person avatar" />
            <AvatarFallback><UserCircle size={16}/></AvatarFallback>
          </Avatar>
          <span>{article.authorName || 'Anonymous'}</span>
        </div>
      </CardFooter>
    </Card>
  );
}
