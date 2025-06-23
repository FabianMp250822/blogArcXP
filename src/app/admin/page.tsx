'use client';

import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FilePlus, LayoutList, Users, FolderPlus, UserPlus, Settings } from 'lucide-react';

export default function AdminPage() {
  const { userProfile } = useAuth();

  return (
    <div className="space-y-8">
      <header className="mb-8">
        <h1 className="font-headline text-3xl md:text-4xl font-bold text-primary">Panel de Administración</h1>
        <p className="text-muted-foreground">¡Bienvenido, {userProfile?.displayName || userProfile?.email || 'Admin'}!</p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center font-headline">
              <FilePlus className="mr-2 h-5 w-5 text-primary" /> Crear Nuevo Artículo
            </CardTitle>
            <CardDescription>
              Escribe y publica un nuevo artículo para tu audiencia.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/create">
              <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                Crear Artículo
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center font-headline">
              <LayoutList className="mr-2 h-5 w-5 text-primary" /> Gestionar Artículos
            </CardTitle>
            <CardDescription>
              Ver, editar o eliminar artículos existentes. (Vía Panel de Periodista/Admin)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard">
              <Button className="w-full" variant="outline">
                Ir al Panel de Artículos
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center font-headline">
              <Users className="mr-2 h-5 w-5 text-primary" /> Gestionar Roles de Usuario
            </CardTitle>
            <CardDescription>
              Asigna roles a usuarios existentes, como 'periodista' o 'admin'.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/manage-roles">
              <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                Gestionar Roles
              </Button>
            </Link>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center font-headline">
              <UserPlus className="mr-2 h-5 w-5 text-primary" /> Crear Nuevo Usuario
            </CardTitle>
            <CardDescription>
              Crea una nueva cuenta de usuario, normalmente para periodistas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/create-user">
              <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                Crear Usuario
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center font-headline">
              <FolderPlus className="mr-2 h-5 w-5 text-primary" /> Gestionar Categorías
            </CardTitle>
            <CardDescription>
              Crea y visualiza categorías de artículos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/categories">
              <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                Gestionar Categorías
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center font-headline">
              <Settings className="mr-2 h-5 w-5 text-primary" /> Configuración del Sitio
            </CardTitle>
            <CardDescription>
              Cambia el nombre y logo del sitio.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/settings">
              <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                Ir a Configuración
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
