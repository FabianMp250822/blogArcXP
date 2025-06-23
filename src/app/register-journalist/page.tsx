'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/config';
import { doc, setDoc } from 'firebase/firestore';

export default function RegisterJournalistPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    mediaOutlet: '',
    portfolioUrl: '',
    bio: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    if (!form.portfolioUrl) {
      setError('El enlace a tu portafolio es obligatorio.');
      setLoading(false);
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, form.email, form.password);
      await updateProfile(userCredential.user, { displayName: form.name });
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        email: form.email,
        displayName: form.name,
        role: 'journalist',
        journalistStatus: 'pending',
        mediaOutlet: form.mediaOutlet,
        portfolioUrl: form.portfolioUrl,
        bio: form.bio,
      });
      router.push('/?pending=journalist');
    } catch (err: any) {
      setError(err.message || 'Error al registrar periodista');
    }
    setLoading(false);
  };

  return (
    <Card className="max-w-md mx-auto mt-10">
      <CardHeader>
        <CardTitle>Registro de Periodista</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nombre completo</Label>
            <Input id="name" name="name" value={form.name} onChange={handleChange} required />
          </div>
          <div>
            <Label htmlFor="email">Correo electrónico</Label>
            <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} required />
          </div>
          <div>
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" name="password" type="password" value={form.password} onChange={handleChange} required />
          </div>
          <div>
            <Label htmlFor="mediaOutlet">Medio de comunicación (opcional)</Label>
            <Input id="mediaOutlet" name="mediaOutlet" value={form.mediaOutlet} onChange={handleChange} />
          </div>
          <div>
            <Label htmlFor="portfolioUrl">Enlace a portafolio o artículo (obligatorio)</Label>
            <Input id="portfolioUrl" name="portfolioUrl" value={form.portfolioUrl} onChange={handleChange} required />
          </div>
          <div>
            <Label htmlFor="bio">Biografía breve</Label>
            <textarea id="bio" name="bio" value={form.bio} onChange={handleChange} className="w-full border rounded p-2" rows={3} />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Registrarse como Periodista
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
