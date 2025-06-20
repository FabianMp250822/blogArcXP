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
      toast({ title: 'Error', description: 'Could not load site settings.', variant: 'destructive' });
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
        toast({ title: 'Success!', description: result.message });
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
        <CardTitle className="flex items-center"><Settings className="mr-2 h-6 w-6 text-primary"/>Site Settings</CardTitle>
        <CardDescription>Manage your site's global name and logo.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-2">
            <Label htmlFor="siteName">Site Name</Label>
            <Input id="siteName" value={settings.siteName} onChange={(e) => setSettings(s => ({...s, siteName: e.target.value}))} disabled={isPending} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="logoUrl">Logo URL</Label>
            <Input id="logoUrl" value={settings.logoUrl} onChange={(e) => setSettings(s => ({...s, logoUrl: e.target.value}))} disabled={isPending} />
            <p className="text-sm text-muted-foreground">Enter a full URL. You may need to add the hostname to `next.config.ts`.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Primary Color</Label>
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
              <Label htmlFor="secondaryColor">Secondary Color</Label>
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
            <Label htmlFor="fontFamily">Font Family</Label>
            <Select
              value={settings.fontFamily}
              onValueChange={(value: SiteSettings['fontFamily']) => setSettings(s => ({ ...s, fontFamily: value }))}
              disabled={isPending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a font" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inter">Inter (Sans-serif)</SelectItem>
                <SelectItem value="roboto">Roboto (Sans-serif)</SelectItem>
                <SelectItem value="lato">Lato (Sans-serif)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              This will change the main font across the site.
            </p>
          </div>

          <Button type="submit" disabled={isPending} className="w-full">
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save All Settings
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}