'use client';

import { Suspense } from 'react';
import VerifyEmailClient from './VerifyEmailClient';

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="flex flex-col items-center justify-center min-h-[60vh] py-12"><span className="text-lg font-semibold">Cargando...</span></div>}>
      <VerifyEmailClient />
    </Suspense>
  );
}
