'use client';

import { useBranding } from './DynamicBrandingProvider';
import Link from 'next/link';
import Image from 'next/image';

interface DynamicLogoProps {
  className?: string;
}

export function DynamicLogo({ className }: DynamicLogoProps) {
  const branding = useBranding();
  
  return (
    <Link href="/" className="flex items-center space-x-3" aria-label={`Inicio de ${branding.siteName}`}>
      <Image 
        src={branding.logoUrl} 
        alt={`Logo de ${branding.siteName}`}
        width={156} // 120 * 1.3 = 156
        height={52} // 40 * 1.3 = 52
        className={className || "h-10 md:h-[52px] w-auto"} // h-8*1.3 ≈ h-10, md:h-10*1.3 ≈ md:h-[52px]
        priority
      />
    </Link>
  );
}
