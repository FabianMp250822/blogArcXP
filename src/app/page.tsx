import { getPublishedArticles } from '@/lib/firebase/firestore';
import ArticleCard from '@/components/article-card';

export default async function HomePage() {
  const articles = await getPublishedArticles(10);

  return (
    <div className="space-y-12">
      <section aria-labelledby="latest-articles-heading">
        <h1 id="latest-articles-heading" className="font-headline text-3xl md:text-4xl font-bold mb-8 text-center text-primary">
          Latest Articles
        </h1>
        {articles.length === 0 ? (
          <p className="text-center text-muted-foreground">No articles published yet. Check back soon!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
