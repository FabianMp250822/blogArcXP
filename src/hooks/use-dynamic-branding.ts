'use client';

import { useState, useEffect } from 'react';

interface BrandingConfig {
  siteName: string;
  companyName: string;
  logoUrl: string;
  title: string;
  description: string;
}

export function useDynamicBranding(siteSettings: any): BrandingConfig {
  const [currentDomain, setCurrentDomain] = useState<string>('');
  const [testMode, setTestMode] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentDomain(window.location.hostname);
      // Para pruebas en desarrollo, puedes descomentar la siguiente línea:
      // setCurrentDomain('robinsonrada.com');
      
      // Escuchar eventos personalizados para cambiar el modo de prueba
      const handleTestMode = (event: any) => {
        setTestMode(event.detail.isRobinson);
      };
      
      window.addEventListener('toggleBranding', handleTestMode);
      
      return () => {
        window.removeEventListener('toggleBranding', handleTestMode);
      };
    }
  }, []);

  const isRobinsonDomain = testMode || 
                          currentDomain === 'robinsonradagonzalez.com' || 
                          currentDomain === 'robinsonrada.com' ||
                          currentDomain === 'www.robinsonradagonzalez.com' ||
                          currentDomain === 'www.robinsonrada.com';

  if (isRobinsonDomain) {
    return {
      siteName: 'Robinson Rada González',
      companyName: 'Robinson Rada González',
      logoUrl: 'https://storage.googleapis.com/diamundia.appspot.com/articles/logorada.png',
      title: 'Robinson Rada González',
      description: 'Sitio oficial del Dr. Robinson Rada González. Médico, político y líder comunitario comprometido con el desarrollo de la región.'
    };
  }

  // Configuración por defecto (Surcos)
  return {
    siteName: siteSettings.siteName || 'Surcos',
    companyName: 'Surcos S.A.',
    logoUrl: siteSettings.logoUrl,
    title: 'Surcos',
    description: 'Todo sobre la Sociedad Colombiana de Urbanistas y Desarrolladores.'
  };
}
