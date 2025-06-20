'use client';

import type { UserProfile } from '@/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, UserCircle } from 'lucide-react';

interface UserDashboardProps {
  userProfile: UserProfile;
}

export default function UserDashboard({ userProfile }: UserDashboardProps) {
  return (
    <div className="space-y-8">
      <header className="mb-8">
        <h1 className="font-headline text-3xl md:text-4xl font-bold text-primary">My Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {userProfile.displayName || userProfile.email}!</p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center font-headline">
              <BookOpen className="mr-2 h-5 w-5 text-primary" /> Browse Articles
            </CardTitle>
            <CardDescription>
              Read the latest articles published on our platform.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/articles">
              <Button className="w-full" variant="outline">
                View All Articles
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center font-headline">
              <UserCircle className="mr-2 h-5 w-5 text-primary" /> My Profile
            </CardTitle>
            <CardDescription>
              View or update your profile information.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/profile">
              <Button className="w-full" variant="outline" disabled>
                Go to Profile (Coming Soon)
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}