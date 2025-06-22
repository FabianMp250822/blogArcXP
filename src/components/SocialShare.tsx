'use client';

import { Facebook, MessageCircle, Link as LinkIcon, Code } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Label } from './ui/label';
import { Input } from './ui/input';

interface SocialShareProps {
  url: string;
  title: string;
}

export function SocialShare({ url, title }: SocialShareProps) {
  const { toast } = useToast();
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const copyToClipboard = (text: string, message: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: 'Copiado', description: message });
    });
  };

  const embedCode = `<iframe src="${url}" width="100%" height="600" frameborder="0" allowfullscreen></iframe>`;

  return (
    <div className="flex items-center space-x-2 my-4 p-4 border-t border-b">
      <span className="font-semibold text-sm mr-2">Compartir:</span>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        title="Compartir en Facebook"
      >
        <Button variant="outline" size="icon">
          <Facebook className="h-4 w-4" />
        </Button>
      </a>
      <a
        href={`https://wa.me/?text=${encodedTitle}%20${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        title="Compartir en WhatsApp"
      >
        <Button variant="outline" size="icon">
          <MessageCircle className="h-4 w-4" />
        </Button>
      </a>
      <Button
        variant="outline"
        size="icon"
        title="Copiar enlace"
        onClick={() => copyToClipboard(url, 'Enlace del artículo copiado al portapapeles.')}
      >
        <LinkIcon className="h-4 w-4" />
      </Button>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon" title="Insertar artículo">
            <Code className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="grid gap-4">
            <div className="space-y-2">
              <h4 className="font-medium leading-none">Insertar</h4>
              <p className="text-sm text-muted-foreground">
                Copia y pega este código en tu sitio web.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="embed-code">Código para insertar</Label>
              <Input id="embed-code" value={embedCode} readOnly />
              <Button onClick={() => copyToClipboard(embedCode, 'Código de inserción copiado.')}>
                Copiar código
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
