'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, userProfile, loading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && !isAdmin) {
      // User is logged in but not an admin
      router.replace('/?error=unauthorized'); // Redirect to home with an error or to a specific unauthorized page
    }
  }, [user, isAdmin, loading, router]);

  const handleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // Auth state will update via onAuthStateChanged in AuthProvider
      // and useEffect above will re-evaluate
    } catch (error) {
      console.error('Error signing in with Google:', error);
      // Handle sign-in error (e.g., display a toast message)
    }
  };

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
              Please sign in with an admin account to access this area.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4">
            <Button onClick={handleSignIn} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
              Sign In with Google
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
