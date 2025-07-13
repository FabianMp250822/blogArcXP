'use client';

import { useState } from 'react';
import { useBranding } from './DynamicBrandingProvider';
import Link from 'next/link';
import Image from 'next/image';
import { RobinsonRadaLogo } from './RobinsonRadaLogo';

interface DynamicLogoProps {
  className?: string;
}

export function DynamicLogo({ className }: DynamicLogoProps) {
  const branding = useBranding();
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const isRobinsonBrand = branding.siteName === 'Robinson Rada González';
  
  return (
    <Link href="/" className="flex items-center space-x-3" aria-label={`Inicio de ${branding.siteName}`}>
      {/* Si hay error de imagen y es la marca de Robinson, mostrar el SVG */}
      {imageError && isRobinsonBrand ? (
        <RobinsonRadaLogo 
          className="transition-all duration-300 hover:scale-105" 
          width={200}
          height={52}
        />
      ) : imageError && !isRobinsonBrand ? (
        // Si hay error pero NO es Robinson, mostrar texto elegante
        <div className="font-bold text-xl text-blue-600 transition-all duration-300 hover:text-blue-700">
          {branding.siteName}
        </div>
      ) : (
        // Mostrar imagen normal con placeholder mientras carga
        <div className="relative">
          {/* Placeholder mientras carga */}
          {imageLoading && (
            <div className="absolute inset-0 bg-gray-200 animate-pulse rounded h-10 md:h-[52px] w-32" />
          )}
          
          <Image 
            src={branding.logoUrl} 
            alt={`Logo de ${branding.siteName}`}
            width={isRobinsonBrand ? 200 : 156}
            height={52}
            className={`${className || "h-10 md:h-[52px] w-auto"} transition-all duration-300 hover:scale-105 ${
              imageLoading ? 'opacity-0' : 'opacity-100'
            }`}
            priority
            onLoad={() => setImageLoading(false)}
            onError={() => {
              setImageError(true);
              setImageLoading(false);
            }}
          />
        </div>
      )}
    </Link>
  );
}
