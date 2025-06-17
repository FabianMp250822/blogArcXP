'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Home, LogIn, LogOut, UserCircle, ShieldCheck } from 'lucide-react';
import { Logo } from '@/components/icons/logo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Navbar() {
  const { user, userProfile, loading, signOutUser } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOutUser();
    router.push('/');
  };

  return (
    <header className="bg-card shadow-md sticky top-0 z-50">
      <nav className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2" aria-label="Firebase News Home">
          <Logo className="h-8 w-auto" />
        </Link>
        <div className="flex items-center space-x-4">
          <Link href="/" passHref>
            <Button variant="ghost" className="font-medium text-foreground hover:text-primary">
              <Home className="mr-2 h-4 w-4" /> Home
            </Button>
          </Link>
          {loading ? (
            <div className="h-8 w-20 bg-muted rounded-md animate-pulse"></div>
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.photoURL || undefined} alt={user.displayName || user.email || 'User'} />
                    <AvatarFallback>{user.email ? user.email[0].toUpperCase() : <UserCircle />}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.displayName || user.email}</p>
                    {user.email && <p className="text-xs leading-none text-muted-foreground">{user.email}</p>}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {userProfile?.role === 'admin' && (
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
            <Link href="/admin" passHref>
               <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                <LogIn className="mr-2 h-4 w-4" /> Login
              </Button>
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
