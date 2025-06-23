'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/config';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, LogInIcon } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc'; // Asegúrate de tener react-icons instalado
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/dashboard'); // Redirect to dashboard on successful login
    } catch (err: any) {
      setLoginAttempts((prev) => prev + 1);
      setError(err.message || 'Correo o contraseña incorrectos.');
      console.error('Error signing in:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      // Si es la primera vez, crea el perfil en Firestore
      const user = result.user;
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          role: 'user',
        });
      }
      router.push('/');
    } catch (err) {
      // Maneja el error si lo deseas
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-center text-primary">Iniciar sesión en el panel</CardTitle>
          <CardDescription className="text-center">
            Accede a tu panel de gestión de artículos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-6">
            <div>
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1"
              />
            </div>
            <div className="mt-1">
              <Link
                href="/reset-password"
                className={
                  'text-primary hover:underline text-sm' +
                  (loginAttempts > 1 ? ' font-bold text-destructive animate-pulse' : '')
                }
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
              <LogInIcon className="ml-2 h-4 w-4" />
            </Button>
            {error && (
              <div
                className={
                  loginAttempts > 1
                    ? 'text-destructive font-bold text-center'
                    : 'text-destructive text-center'
                }
              >
                {error}
              </div>
            )}
          </form>
          <div className="mt-6 text-center">
            <p className="mb-2">¿No estás registrado?</p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button
                variant="default"
                className="w-full sm:w-auto bg-[#fec900] hover:bg-[#e6b800] text-black font-medium"
                onClick={() => router.push('/register')}
              >
                Registrarse
              </Button>
              <Button
                variant="outline"
                className="w-full sm:w-auto flex items-center justify-center gap-2"
                onClick={handleGoogleRegister}
              >
                <FcGoogle className="h-5 w-5" />
                Registrarse con Google
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

