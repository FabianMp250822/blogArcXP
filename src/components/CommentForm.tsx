'use client';

import { useAuth } from '@/hooks/use-auth';
import { useActionState, useEffect, useRef, useTransition } from 'react';
import { addCommentAction, type CommentActionState } from '@/app/articles/[slug]/actions';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import app from '@/lib/firebase/config';

interface CommentFormProps {
  articleId: string;
  articleSlug: string;
  parentId?: string | null;
  onCommentPosted: () => void;
}

export function CommentForm({ articleId, articleSlug, parentId = null, onCommentPosted }: CommentFormProps) {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [state, formAction] = useActionState(addCommentAction, { success: false, message: '' });
  const [checkingVerification, setCheckingVerification] = useState(false);
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);

  useEffect(() => {
    if (user) {
      setCheckingVerification(true);
      const db = getFirestore(app);
      const userRef = doc(db, 'users', user.uid);
      getDoc(userRef)
        .then((docSnap) => {
          if (docSnap.exists()) {
            setEmailVerified(!!docSnap.data().emailVerified);
          } else {
            setEmailVerified(false);
          }
        })
        .finally(() => setCheckingVerification(false));
    } else {
      setEmailVerified(null);
    }
  }, [user]);

  useEffect(() => {
    if (state.message) {
      if (state.success) {
        toast({ title: 'Éxito', description: state.message });
        formRef.current?.reset();
        onCommentPosted();
      } else {
        toast({ title: 'Error', description: state.message, variant: 'destructive' });
      }
    }
  }, [state, toast, onCommentPosted]);

  const handleSubmit = (formData: FormData) => {
    startTransition(() => {
      formAction(formData);
    });
  };

  if (loading || checkingVerification || (user && emailVerified === null)) {
    return <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  if (!user) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Inicia sesión</AlertTitle>
        <AlertDescription>Debes iniciar sesión para poder dejar un comentario.</AlertDescription>
      </Alert>
    );
  }

  if (emailVerified === false) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Verificación Requerida</AlertTitle>
        <AlertDescription>Debes verificar tu correo electrónico para poder comentar.</AlertDescription>
      </Alert>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={e => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        handleSubmit(formData);
      }}
      className="space-y-4"
    >
      <input type="hidden" name="articleId" value={articleId} />
      <input type="hidden" name="articleSlug" value={articleSlug} />
      {parentId && <input type="hidden" name="parentId" value={parentId} />}
      
      <Textarea
        name="text"
        placeholder={parentId ? 'Escribe tu respuesta...' : 'Escribe tu comentario...'}
        rows={3}
        required
        minLength={3}
        maxLength={500}
        disabled={isPending}
      />
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {parentId ? 'Publicar Respuesta' : 'Publicar Comentario'}
        </Button>
      </div>
    </form>
  );
}
