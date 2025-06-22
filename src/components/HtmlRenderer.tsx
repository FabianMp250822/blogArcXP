'use client';

import DOMPurify from 'dompurify';
import { useEffect, useState } from 'react';

interface HtmlRendererProps {
  htmlContent: string;
}

export function HtmlRenderer({ htmlContent }: HtmlRendererProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // En el servidor, no renderizamos nada para evitar errores de hidratación.
  // DOMPurify necesita el objeto 'window' del navegador.
  if (!isClient) {
    return null;
  }

  // Sanitizamos el HTML en el cliente antes de renderizarlo.
  const sanitizedHtml = DOMPurify.sanitize(htmlContent);

  return (
    <div
      // Las clases 'prose' de TailwindCSS Typography son ideales para estilizar este contenido.
      className="prose prose-lg max-w-none dark:prose-invert"
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}
