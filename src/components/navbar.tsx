'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { LogIn, LogOut, User, Mail, Search, Menu, RadioTower, MessageCircle, ShieldCheck } from 'lucide-react';
import { WRadioLogo } from '@/components/icons/w-radio-logo'; // New Logo
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Navbar() {
  const { user, userProfile, loading, signOutUser, isAdmin } = useAuth();
  const router = useRouter();

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
      <div className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-1 flex items-center justify-between text-xs">
          <nav className="flex items-center space-x-3">
            {navLinks.map(link => (
              <Link key={link.label} href={link.href} passHref>
                <Button variant="link" className="text-inherit hover:text-inherit/80 p-0 h-auto text-xs font-medium tracking-wider">
                  {link.label}
                </Button>
              </Link>
            ))}
          </nav>
          <div className="flex items-center space-x-3">
            <span className="hidden sm:inline">Actualizado 17 Jun 2025 11:16</span> {/* Static for now */}
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
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => router.push('/admin')}>
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Admin Panel
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button onClick={() => router.push('/admin')} variant="ghost" size="icon" className="h-auto w-auto p-1 text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground">
                <User className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-auto w-auto p-1 text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground">
              <Mail className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-auto w-auto p-1 text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground">
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Black Bar */}
      <div className="bg-navbar-background text-navbar-foreground">
        <div className="container mx-auto px-4 py-2 flex items-center justify-between">
          {/* Left: Hamburger Menu (mobile) / Spacer (desktop) */}
          <div className="w-10"> {/* Occupies space, button inside is visible on mobile */}
             <Button variant="ghost" size="icon" className="text-navbar-foreground hover:bg-navbar-foreground/10 md:hidden">
              <Menu className="h-6 w-6" />
            </Button>
          </div>

          {/* Center: Logo */}
          <div className="flex-1 flex justify-center">
            <Link href="/" aria-label="W Radio Home">
              <WRadioLogo className="h-8 md:h-10 w-auto" />
            </Link>
          </div>

          {/* Right Controls */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 md:space-x-3">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs px-2 py-1 md:px-3 md:py-1.5 h-auto rounded-sm whitespace-nowrap">
              <MessageCircle className="mr-1 h-3 w-3 md:h-4 md:w-4" /> Hable con el programa
            </Button>
            <div className="hidden sm:flex items-center space-x-1 text-xs whitespace-nowrap">
              <RadioTower className="h-3 w-3 text-red-500 animate-pulse" />
              <span>La W con Julio Sánchez Cristo</span> {/* Static for now */}
            </div>
             {/* Fallback login for mobile if not covered by hamburger, can be removed if hamburger handles all auth states */}
            <div className="md:hidden">
              {loading ? ( <Skeleton className="h-6 w-6 rounded-full bg-navbar-foreground/20" /> )
               : !user ? ( <Button onClick={() => router.push('/admin')} variant="ghost" size="icon" className="h-7 w-7 text-navbar-foreground hover:text-navbar-foreground/80"><LogIn className="h-4 w-4" /></Button>)
               : null
              }
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
