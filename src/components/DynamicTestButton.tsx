'use client';

import { useBranding } from './DynamicBrandingProvider';
import { Button } from '@/components/ui/button';

export function DynamicTestButton() {
  const branding = useBranding();
  
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-auto w-auto p-1 text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground text-xs"
      onClick={() => {
        const event = new CustomEvent('toggleBranding', { 
          detail: { isRobinson: !branding.siteName.includes('Robinson') } 
        });
        window.dispatchEvent(event);
      }}
      title="Alternar branding (solo desarrollo)"
    >
      {branding.siteName.includes('Robinson') ? 'S' : 'R'}
    </Button>
  );
}
