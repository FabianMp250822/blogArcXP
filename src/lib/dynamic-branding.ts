// Versión del servidor para el branding dinámico
export interface BrandingConfig {
  siteName: string;
  companyName: string;
  logoUrl: string;
  title: string;
  description: string;
}

export function getDynamicBranding(siteSettings: any, hostname?: string): BrandingConfig {
  const isRobinsonDomain = hostname === 'robinsonradagonzalez.com' || 
                          hostname === 'robinsonrada.com' ||
                          hostname === 'www.robinsonradagonzalez.com' ||
                          hostname === 'www.robinsonrada.com';

  if (isRobinsonDomain) {
    return {
      siteName: 'Robinson Rada González',
      companyName: 'Robinson Rada González',
      logoUrl: siteSettings?.logoUrl2 || 'https://firebasestorage.googleapis.com/v0/b/diamundia.appspot.com/o/articles%2Flogorada.png?alt=media&token=afc52fab-f7f3-44cf-b142-41d33bef8afb',
      title: 'Robinson Rada González',
      description: 'Sitio oficial del Dr. Robinson Rada González. Médico, político y líder comunitario comprometido con el desarrollo de la región.'
    };
  }

  // Configuración por defecto (Surcos)
  return {
    siteName: siteSettings?.siteName || 'Surcos',
    companyName: 'Surcos S.A.',
    logoUrl: siteSettings?.logoUrl || '/default-logo.png',
    title: 'Surcos',
    description: 'Todo sobre la Sociedad Colombiana de Urbanistas y Desarrolladores.'
  };
}
