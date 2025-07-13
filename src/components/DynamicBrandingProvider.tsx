'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { getDynamicBranding, type BrandingConfig } from '@/lib/dynamic-branding';

// Crear contexto para el branding
const BrandingContext = createContext<BrandingConfig | null>(null);

interface DynamicBrandingProviderProps {
  siteSettings: any;
  initialBranding: BrandingConfig;
  children: React.ReactNode;
}

export function DynamicBrandingProvider({ siteSettings, initialBranding, children }: DynamicBrandingProviderProps) {
  const [branding, setBranding] = useState<BrandingConfig>(initialBranding);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const clientBranding = getDynamicBranding(siteSettings, window.location.hostname);
      setBranding(clientBranding);
      
      // Escuchar eventos personalizados para cambiar el modo de prueba (solo en desarrollo)
      if (process.env.NODE_ENV === 'development') {
        const handleTestMode = (event: any) => {
          const testBranding = event.detail.isRobinson 
            ? getDynamicBranding(siteSettings, 'robinsonrada.com')
            : getDynamicBranding(siteSettings, 'localhost');
          setBranding(testBranding);
        };
        
        window.addEventListener('toggleBranding', handleTestMode);
        
        return () => {
          window.removeEventListener('toggleBranding', handleTestMode);
        };
      }
    }
  }, [siteSettings]);

  // Durante la hidratación, usamos el branding inicial
  const currentBranding = mounted ? branding : initialBranding;

  return (
    <BrandingContext.Provider value={currentBranding}>
      {children}
    </BrandingContext.Provider>
  );
}

// Hook para usar el branding
export function useBranding(): BrandingConfig {
  const branding = useContext(BrandingContext);
  if (!branding) {
    throw new Error('useBranding must be used within a DynamicBrandingProvider');
  }
  return branding;
}
