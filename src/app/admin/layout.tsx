
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
// Removed Google Sign-In related imports: signInWithPopup, GoogleAuthProvider
// import { auth } from '@/lib/firebase/config'; // No longer needed here for sign-in
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, LogIn } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && !isAdmin) {
      router.replace('/?error=unauthorized_admin_area'); 
    }
    // If not loading and not user, they will see the message below.
    // If not loading, user exists, and isAdmin is true, children will be shown.
  }, [user, isAdmin, loading, router]);


  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Loading Admin Area...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-headline text-center text-primary">Admin Access Required</CardTitle>
            <CardDescription className="text-center">
              This area is restricted to administrators. Please log in with an authorized account.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4">
            <Button asChild className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
              <Link href="/login?redirect=/admin">
                <LogIn className="mr-2 h-4 w-4" /> Go to Login Page
              </Link>
            </Button>
            <p className="text-xs text-muted-foreground">
              Ensure you are using an account with admin privileges.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!isAdmin) {
     return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Card className="w-full max-w-md shadow-xl border-destructive">
          <CardHeader>
            <CardTitle className="text-2xl font-headline text-center text-destructive flex items-center justify-center">
              <AlertTriangle className="mr-2 h-6 w-6" /> Unauthorized Access
            </CardTitle>
            <CardDescription className="text-center">
              You do not have permission to access the admin area.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <Button onClick={() => router.push('/')} variant="outline">
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User is authenticated and is an admin
  return <>{children}</>;
}
