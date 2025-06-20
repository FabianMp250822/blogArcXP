import { getPublishedArticles } from '@/lib/firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Newspaper } from 'lucide-react';
import Link from 'next/link';

export async function ArticleSidebar() {
  // Obtenemos los 5 artículos más recientes
  const recentArticles = await getPublishedArticles(5);

  if (!recentArticles || recentArticles.length === 0) {
    return null; // No renderizar nada si no hay artículos
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-lg font-headline">
          <Newspaper className="mr-2 h-5 w-5 text-primary" />
          Últimas Noticias
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {recentArticles.map((article) => (
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
      </CardContent>
    </Card>
  );
}