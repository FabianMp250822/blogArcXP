'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { Mail, User, Search, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { LogIn, LogOut, RadioTower, MessageCircle, ShieldCheck, LayoutDashboard } from 'lucide-react';
import { WRadioLogo } from '@/components/icons/w-radio-logo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { SiteSettings } from '@/types'; // <-- 1. Importa el tipo
import Image from 'next/image'; // <-- 2. Importa el componente Image
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale'; // Import Spanish locale

// 3. Define las props que el componente espera recibir
interface NavbarProps {
  siteSettings: SiteSettings;
}

// 4. Actualiza la firma de la función para aceptar las props
export default function Navbar({ siteSettings }: NavbarProps) {
  const { user, userProfile, loading, signOutUser, isAdmin, role } = useAuth();
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState<string | null>(null);

  useEffect(() => {
    const updateClock = () => {
      setCurrentTime(format(new Date(), "dd MMM yyyy HH:mm", { locale: es }));
    };
    updateClock(); // Initial call
    const timerId = setInterval(updateClock, 60000); // Update every minute

    return () => clearInterval(timerId); // Cleanup interval on component unmount
  }, []);

  const handleSignOut = async () => {
    await signOutUser();
    router.push('/');
  };

  const navLinks = [
    { href: "/", label: "INICIO" },
    { href: "/programas", label: "PROGRAMAS" },
    { href: "/tema-del-dia", label: "TEMA DEL DÍA" },
    { href: "/denuncie", label: "DENUNCIE" },
    { href: "/ciudades", label: "CIUDADES" },
    { href: "/especiales", label: "ESPECIALES" },
  ];

  return (
    <header className="sticky top-0 z-50 shadow-md">
      {/* Top Yellow Bar */}
      <div className="bg-[#fec900] text-black text-xs font-semibold">
        <div className="container mx-auto px-4 h-8 flex justify-between items-center">
          <nav className="hidden md:flex items-center space-x-4 uppercase">
            {navLinks.map(link => (
              <Button key={link.label} asChild variant="link" className="text-inherit hover:text-inherit/80 p-0 h-auto text-xs font-medium tracking-wider">
                <Link href={link.href}>
                  {link.label}
                </Link>
              </Button>
            ))}
          </nav>
          
          <div className="flex items-center space-x-4 ml-auto">
            <span className="hidden sm:inline">
              Actualizado {currentTime || <Skeleton className="h-3 w-28 inline-block bg-primary-foreground/20" />}
            </span>
            {loading ? (
              <Skeleton className="h-5 w-5 rounded-full bg-primary-foreground/20" />
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-auto w-auto p-1 text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground">
                    <User className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{userProfile?.displayName || user.displayName || user.email}</p>
                      {user.email && <p className="text-xs leading-none text-muted-foreground">{user.email}</p>}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {(role === 'admin' || role === 'journalist') && (
                     <DropdownMenuItem onClick={() => router.push('/dashboard')}>
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Panel
                    </DropdownMenuItem>
                  )}
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => router.push('/admin')}>
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Panel administración
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Cerrar sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button onClick={() => router.push('/login')} variant="ghost" size="icon" className="h-auto w-auto p-1 text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground" title="Iniciar sesión">
                <User className="h-4 w-4" />
              </Button>
            )}

            {user && (
              <Button asChild variant="ghost" size="icon" className="h-auto w-auto p-1 text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground" title="Buzón de mensajes">
                <Link href="/dashboard/messages">
                  <Mail className="h-4 w-4" />
                </Link>
              </Button>
            )}
            
            <Button variant="ghost" size="icon" className="h-auto w-auto p-1 text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground">
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Black Bar */} 
      <div className="bg-black text-white">
        <div className="container mx-auto px-4 py-2 flex items-center justify-between">
          {/* Left: Hamburger Menu (mobile) / Spacer (desktop) */}
          <div className="w-10"> {/* Occupies space, button inside is visible on mobile */}
             <Button variant="ghost" size="icon" className="text-navbar-foreground hover:bg-navbar-foreground/10 md:hidden">
              <Menu className="h-6 w-6" />
            </Button>
          </div>

          {/* Center: Logo */}
          <div className="flex-1 flex justify-center">
            {/* 5. Reemplaza el logo estático por uno dinámico */}
            <Link href="/" className="flex items-center space-x-3" aria-label={`Inicio de ${siteSettings.siteName}`}>
              <Image 
                src={siteSettings.logoUrl} 
                alt={`Logo de ${siteSettings.siteName}`}
                width={120}
                height={40}
                className="h-8 md:h-10 w-auto"
                priority
              />
            </Link>
          </div>

          {/* Right Controls */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 md:space-x-3">
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs px-2 py-1 md:px-3 md:py-1.5 h-auto rounded-sm whitespace-nowrap"
              asChild
            >
              <Link
                href="https://wa.me/573058028169"
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="mr-1 h-3 w-3 md:h-4 md:w-4" /> Hable con el programa
              </Link>
            </Button>
            <div className="hidden sm:flex items-center space-x-1 text-xs whitespace-nowrap">
              <RadioTower className="h-3 w-3 text-red-500 animate-pulse" />
              <span>
                <Link
                  href="https://wa.me/573058028169"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  Conviértete en periodista
                </Link>
              </span>
            </div>
             {/* Fallback login for mobile if not covered by hamburger, can be removed if hamburger handles all auth states */}
            <div className="md:hidden">
              {loading ? ( <Skeleton className="h-6 w-6 rounded-full bg-navbar-foreground/20" /> )
               : !user ? ( <Button onClick={() => router.push('/login')} variant="ghost" size="icon" className="h-7 w-7 text-navbar-foreground hover:text-navbar-foreground/80"><LogIn className="h-4 w-4" /></Button>)
               : null
              }
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
