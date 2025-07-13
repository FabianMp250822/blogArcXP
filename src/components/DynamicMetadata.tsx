'use client';

'use client';

import { useEffect } from 'react';
import { useBranding } from './DynamicBrandingProvider';

interface DynamicMetadataProps {
  siteSettings: any; // Usando any temporalmente para evitar conflictos de tipos
  hostname: string;
}

export function DynamicMetadata({ siteSettings, hostname }: DynamicMetadataProps) {
  const branding = useBranding();

  useEffect(() => {
    // Actualizar el título de la página
    document.title = branding.title;
    
    // Actualizar la meta descripción
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', branding.description);
    }
  }, [branding.title, branding.description]);

  return null; // Este componente no renderiza nada visible
}
