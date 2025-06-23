'use client';

import { useState, useEffect, useTransition } from 'react';
import { getSiteSettings } from '@/lib/firebase/firestore';
import { updateSiteSettingsAction } from './actions';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import type { SiteSettings } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Settings } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<SiteSettings>({ 
    siteName: '', 
    logoUrl: '',
    primaryColor: '#000000',
    secondaryColor: '#f5a623',
    fontFamily: 'inter',
  });
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getSiteSettings().then(currentSettings => {
      setSettings(currentSettings);
    }).catch(() => {
      toast({ title: 'Error', description: 'No se pudieron cargar las configuraciones del sitio.', variant: 'destructive' });
    }).finally(() => {
      setLoading(false);
    });
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    startTransition(async () => {
      const idToken = await user.getIdToken();
      const result = await updateSiteSettingsAction(idToken, settings);
      if (result.success) {
        toast({ title: '¡Éxito!', description: result.message });
      } else {
        toast({ title: 'Error', description: result.message, variant: 'destructive' });
      }
    });
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center"><Settings className="mr-2 h-6 w-6 text-primary"/>Configuración del Sitio</CardTitle>
        <CardDescription>Administra el nombre global y el logo de tu sitio.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-2">
            <Label htmlFor="siteName">Nombre del Sitio</Label>
            <Input id="siteName" value={settings.siteName} onChange={(e) => setSettings(s => ({...s, siteName: e.target.value}))} disabled={isPending} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="logoUrl">URL del Logo</Label>
            <Input id="logoUrl" value={settings.logoUrl} onChange={(e) => setSettings(s => ({...s, logoUrl: e.target.value}))} disabled={isPending} />
            <p className="text-sm text-muted-foreground">Introduce una URL completa. Puede que necesites agregar el hostname en `next.config.ts`.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Color Primario</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="primaryColor"
                  type="color"
                  value={settings.primaryColor}
                  onChange={(e) => setSettings(s => ({ ...s, primaryColor: e.target.value }))}
                  className="p-1 h-10 w-14"
                  disabled={isPending}
                />
                <Input
                  value={settings.primaryColor}
                  onChange={(e) => setSettings(s => ({ ...s, primaryColor: e.target.value }))}
                  className="flex-1"
                  disabled={isPending}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondaryColor">Color Secundario</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="secondaryColor"
                  type="color"
                  value={settings.secondaryColor}
                  onChange={(e) => setSettings(s => ({ ...s, secondaryColor: e.target.value }))}
                  className="p-1 h-10 w-14"
                  disabled={isPending}
                />
                <Input
                  value={settings.secondaryColor}
                  onChange={(e) => setSettings(s => ({ ...s, secondaryColor: e.target.value }))}
                  className="flex-1"
                  disabled={isPending}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fontFamily">Fuente Principal</Label>
            <Select
              value={settings.fontFamily}
              onValueChange={(value: SiteSettings['fontFamily']) => setSettings(s => ({ ...s, fontFamily: value }))}
              disabled={isPending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una fuente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inter">Inter (Sans-serif)</SelectItem>
                <SelectItem value="roboto">Roboto (Sans-serif)</SelectItem>
                <SelectItem value="lato">Lato (Sans-serif)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Esto cambiará la fuente principal en todo el sitio.
            </p>
          </div>

          <Button type="submit" disabled={isPending} className="w-full">
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Configuración
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}