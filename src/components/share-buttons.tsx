''''use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Facebook, Twitter, Linkedin, Mail, Link, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ShareButtonsProps {
  title: string;
}

export function ShareButtons({ title }: ShareButtonsProps) {
  const pathname = usePathname();
  const { toast } = useToast();
  const [isEmbedDialogOpen, setIsEmbedDialogOpen] = useState(false);

  // Asegurarse de que estamos en el cliente antes de acceder a window.location
  const url = typeof window !== 'undefined' ? window.location.href : '';

  const shareOptions = [
    {
      name: 'Facebook',
      icon: <Facebook className="h-5 w-5" />,
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    },
    {
      name: 'WhatsApp',
      icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.886-.001 2.269.655 4.398 1.908 6.161l-1.317 4.816 4.899-1.311z" /></svg>,
      url: `https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`,
    },
  ];

  const copyToClipboard = () => {
    navigator.clipboard.writeText(url).then(() => {
      toast({ title: '¡Enlace Copiado!', description: 'El enlace de la publicación ha sido copiado a tu portapapeles.' });
    });
  };

  const embedCode = `<iframe src="${url}?embed=true" width="100%" height="600px" frameborder="0" allowfullscreen></iframe>`;

  return (
    <div className="my-8 flex flex-col items-center gap-4 p-6 border-t border-b">
        <h3 className="text-lg font-semibold text-center">¿Te gustó este artículo? ¡Compártelo!</h3>
        <div className="flex items-center justify-center gap-2 flex-wrap">
        {shareOptions.map((option) => (
            <Button
            key={option.name}
            variant="outline"
            size="icon"
            asChild
            >
            <a href={option.url} target="_blank" rel="noopener noreferrer" aria-label={`Compartir en ${option.name}`}>
                {option.icon}
            </a>
            </Button>
        ))}
        <Button variant="outline" size="icon" onClick={copyToClipboard} aria-label="Copiar enlace">
            <Link className="h-5 w-5" />
        </Button>
        <Button variant="outline" size="icon" onClick={() => setIsEmbedDialogOpen(true)} aria-label="Insertar publicación">
            <Code className="h-5 w-5" />
        </Button>
        </div>

        <Dialog open={isEmbedDialogOpen} onOpenChange={setIsEmbedDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Insertar Publicación</DialogTitle>
                    <DialogDescription>
                        Copia y pega este código en tu sitio web para mostrar esta publicación.
                    </DialogDescription>
                </DialogHeader>
                <div className="mt-4">
                    <Label htmlFor="embed-code">Código para Insertar</Label>
                    <Input id="embed-code" readOnly value={embedCode} className="mt-1 font-mono" />
                    <Button className="mt-2 w-full" onClick={() => {
                        navigator.clipboard.writeText(embedCode);
                        toast({ title: '¡Código Copiado!' });
                    }}>Copiar Código</Button>
                </div>
            </DialogContent>
        </Dialog>
    </div>
  );
}
'''
