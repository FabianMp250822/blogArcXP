'use client';

import { useBranding } from './DynamicBrandingProvider';

export function DynamicFooterContent() {
  const branding = useBranding();
  const currentYear = new Date().getFullYear();
  
  return (
    <>
      <p className="mb-2">
        © {currentYear} {branding.companyName}. Todos los derechos reservados.
      </p>

      <p className="max-w-3xl mx-auto">
        {branding.companyName} realiza una reserva expresa de las reproducciones y usos de las obras y otras prestaciones accesibles desde este sitio web a medios de lectura mecánica u otros medios que resulten adecuados.
      </p>
    </>
  );
}
