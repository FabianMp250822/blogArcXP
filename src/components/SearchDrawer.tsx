import { useState } from 'react';
import { searchArticles } from '@/lib/firebase/firestore';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Loader2, Search } from 'lucide-react';
import Link from 'next/link';
import { ScrollArea } from '@/components/ui/scroll-area';

export function SearchDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const found = await searchArticles(query, 10);
    setResults(found);
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg w-full">
        <DialogHeader>
          <DialogTitle>Buscar artículos</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
          <Input
            autoFocus
            placeholder="Buscar por título, resumen o contenido..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="flex-1"
          />
          <button type="submit" className="bg-primary text-white px-3 py-2 rounded hover:bg-primary/90">
            <Search className="h-5 w-5" />
          </button>
        </form>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <ScrollArea className="max-h-80">
            <ul className="space-y-3">
              {results.length === 0 && query && !loading && (
                <li className="text-muted-foreground text-center">No se encontraron artículos.</li>
              )}
              {results.map(article => (
                <li key={article.id}>
                  <Link href={`/articles/${article.slug}`} className="block hover:underline">
                    <div className="font-semibold">{article.title}</div>
                    {article.excerpt && <div className="text-xs text-muted-foreground">{article.excerpt}</div>}
                  </Link>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
        <DialogClose asChild>
          <button className="absolute top-2 right-2 text-muted-foreground hover:text-primary">✕</button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
