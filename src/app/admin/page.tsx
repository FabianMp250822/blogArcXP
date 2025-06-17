
'use client';

import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FilePlus, LayoutList, Users, FolderPlus } from 'lucide-react';

export default function AdminPage() {
  const { userProfile } = useAuth();

  return (
    <div className="space-y-8">
      <header className="mb-8">
        <h1 className="font-headline text-3xl md:text-4xl font-bold text-primary">Admin Dashboard</h1>
        <p className="text-muted-foreground">Welcome, {userProfile?.displayName || userProfile?.email || 'Admin'}!</p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center font-headline">
              <FilePlus className="mr-2 h-5 w-5 text-primary" /> Create New Article
            </CardTitle>
            <CardDescription>
              Write and publish a new article for your audience.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/create" passHref legacyBehavior>
              <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                Create Article
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center font-headline">
             <LayoutList className="mr-2 h-5 w-5 text-primary" /> Manage Articles
            </CardTitle>
            <CardDescription>
              View, edit, or delete existing articles. (Via Journalist/Admin Dashboard)
            </CardDescription>
          </CardHeader>
          <CardContent>
             <Link href="/dashboard" passHref legacyBehavior>
                <Button className="w-full" variant="outline">
                Go to Article Dashboard
                </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center font-headline">
             <Users className="mr-2 h-5 w-5 text-primary" /> Manage User Roles
            </CardTitle>
            <CardDescription>
              Assign roles to users, such as 'journalist' or 'admin'.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/manage-roles" passHref legacyBehavior>
              <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                Manage Roles
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center font-headline">
             <FolderPlus className="mr-2 h-5 w-5 text-primary" /> Manage Categories
            </CardTitle>
            <CardDescription>
              Create and view article categories.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/categories" passHref legacyBehavior>
              <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                Manage Categories
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
