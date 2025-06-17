
'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service or console
    console.error(error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
      <Card className="w-full max-w-lg shadow-xl border-destructive">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-center text-destructive flex items-center justify-center">
            <AlertTriangle className="mr-2 h-6 w-6" />
            Something went wrong
          </CardTitle>
          <CardDescription className="text-center">
            We encountered an unexpected issue. Please try again.
            {error?.message?.includes("permission") && (
                " This might be due to Firestore security rules."
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4">
          {error?.message && (
             <p className="text-sm text-muted-foreground text-center bg-muted p-2 rounded-md">
              <strong>Error details:</strong> {error.message}
            </p>
          )}
          <Button
            onClick={
              // Attempt to recover by trying to re-render the segment
              () => reset()
            }
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            Try again
          </Button>
          <Button onClick={() => window.location.href = '/'} variant="outline">
            Go to Homepage
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
