'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

export default function VerifyEmailClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [message, setMessage] = useState('Verificando tu correo electrónico...');

  useEffect(() => {
    const token = searchParams.get('token');
    const uid = searchParams.get('uid');
    if (!token || !uid) {
      setStatus('error');
      setMessage('Solicitud inválida. Faltan parámetros.');
      return;
    }

    fetch(`https://us-central1-${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.cloudfunctions.net/verifyEmail?token=${encodeURIComponent(token)}&uid=${encodeURIComponent(uid)}`)
      .then(async (res) => {
        const text = await res.text();
        if (res.ok) {
          setStatus('success');
          setMessage('¡Tu correo ha sido verificado correctamente! Ya puedes comentar y participar en la plataforma.');
        } else {
          setStatus('error');
          setMessage(text || 'No se pudo verificar el correo.');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Ocurrió un error al verificar tu correo.');
      });
  }, [searchParams]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] py-12">
      {status === 'pending' && (
        <>
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
          <p className="text-lg font-semibold">{message}</p>
        </>
      )}
      {status === 'success' && (
        <>
          <CheckCircle className="h-10 w-10 text-green-600 mb-4" />
          <p className="text-lg font-semibold">{message}</p>
          <button
            className="mt-6 px-6 py-2 bg-primary text-black rounded font-bold hover:bg-primary/80"
            onClick={() => router.push('/login')}
          >
            Ir al login
          </button>
        </>
      )}
      {status === 'error' && (
        <>
          <AlertTriangle className="h-10 w-10 text-destructive mb-4" />
          <p className="text-lg font-semibold">{message}</p>
        </>
      )}
    </div>
  );
}
