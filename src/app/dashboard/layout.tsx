
'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/login?redirect=/dashboard');
      } else if (role !== 'admin' && role !== 'journalist') {
        // If user is authenticated but not an admin or journalist
        router.replace('/?error=unauthorized_dashboard');
      }
    }
  }, [user, role, loading, router]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Loading Dashboard...</p>
      </div>
    );
  }

  if (!user) {
    // This case should ideally be handled by the redirect, but as a fallback:
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-headline text-center text-primary">Access Denied</CardTitle>
            <CardDescription className="text-center">
              You must be logged in to access the dashboard. Redirecting to login...
            </CardDescription>
          </CardHeader>
          <CardContent>
             <Button onClick={() => router.push('/login?redirect=/dashboard')} className="w-full">Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (role !== 'admin' && role !== 'journalist') {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Card className="w-full max-w-md shadow-xl border-destructive">
          <CardHeader>
            <CardTitle className="text-2xl font-headline text-center text-destructive flex items-center justify-center">
              <ShieldAlert className="mr-2 h-6 w-6" /> Unauthorized Access
            </CardTitle>
            <CardDescription className="text-center">
              Your account does not have the required permissions (Admin or Journalist) to access this dashboard.
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

  // User is authenticated and has a valid role (admin or journalist)
  return <div className="py-6">{children}</div>;
}
