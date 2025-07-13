import Link from 'next/link';
import React from 'react';
import { DynamicFooterContent } from './DynamicFooterContent';

interface FooterProps {
  siteSettings: any; // Usando any temporalmente para evitar conflictos de tipos
}

const footerLinks = [
  { label: "Aviso legal", href: "#" },
  { label: "Política de Protección de Datos", href: "#" },
  { label: "Política de cookies", href: "#" },
  { label: "Transparencia", href: "#" },
  { label: "Soluciones Corporativas", href: "#" },
  { label: "Teléfonos", href: "#" },
  { label: "Escribanos", href: "#" },
];

export default function Footer({ siteSettings }: FooterProps) {
  return (
    <footer className="text-xs border-t border-border">
      <div className="bg-primary/10 dark:bg-primary/20 text-foreground py-6">
        <div className="container mx-auto px-4 text-center">
          <nav className="flex flex-wrap justify-center items-center space-x-1 md:space-x-2 mb-4">
            {footerLinks.map((link, index) => (
              <React.Fragment key={link.label}>
                <Link href={link.href} className="px-1 md:px-2 hover:underline">
                  {link.label}
                </Link>
                {index < footerLinks.length - 1 && (
                  <span className="text-muted-foreground">|</span>
                )}
              </React.Fragment>
            ))}
          </nav>

          <DynamicFooterContent />
        </div>
      </div>

      <div className="bg-navbar-background h-2">
      </div>
    </footer>
  );
}
