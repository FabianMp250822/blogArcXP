'use client';

import { useEffect, useState, useTransition } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { getArticlesByAuthor } from '@/lib/firebase/firestore';
import type { Article } from '@/types';
import ArticleTable from './ArticleTable';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { FilePlus, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { sendArticleForReviewAction, deleteArticleAction } from '@/app/dashboard/actions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function JournalistDashboard() {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [articleToDelete, setArticleToDelete] = useState<Article | null>(null);

  useEffect(() => {
    if (user?.uid) {
      setLoading(true);
      getArticlesByAuthor(user.uid)
        .then(setArticles)
        .catch(err => {
          console.error("Failed to fetch articles:", err);
          toast({ title: "Error", description: "Could not fetch your articles.", variant: "destructive" });
        })
        .finally(() => setLoading(false));
    }
  }, [user?.uid, toast]);

  const refreshArticles = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
        const fetchedArticles = await getArticlesByAuthor(user.uid);
        setArticles(fetchedArticles);
    } catch (err) {
        console.error("Failed to refresh articles:", err);
        toast({ title: "Error", description: "Could not refresh your articles.", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  };


  const handleSendForReview = (articleId: string) => {
    setActionLoading(prev => ({ ...prev, [`sendForReview-${articleId}`]: true }));
    startTransition(async () => {
      const result = await sendArticleForReviewAction(articleId);
      if (result.success) {
        toast({ title: 'Success', description: result.message });
        refreshArticles(); // Refresh to get updated status
      } else {
        toast({ title: 'Error', description: result.message, variant: 'destructive' });
      }
      setActionLoading(prev => ({ ...prev, [`sendForReview-${articleId}`]: false }));
    });
  };
  
  const handleDeleteRequest = (article: Article) => {
    setArticleToDelete(article);
    setShowDeleteDialog(true);
  };

  const confirmDeleteArticle = () => {
    if (!articleToDelete) return;
    const articleId = articleToDelete.id;
    setActionLoading(prev => ({ ...prev, [`delete-${articleId}`]: true }));
    setShowDeleteDialog(false);

    startTransition(async () => {
      const result = await deleteArticleAction(articleId); 
      if (result.success) {
        toast({ title: 'Success', description: result.message });
        refreshArticles(); // Refresh to remove deleted article
      } else {
        toast({ title: 'Error', description: result.message, variant: 'destructive' });
      }
      setActionLoading(prev => ({ ...prev, [`delete-${articleId}`]: false }));
      setArticleToDelete(null);
    });
  };


  const getActions = (article: Article) => {
    const actions: any[] = []; 
    if (article.status === 'published') {
      actions.push({ type: 'view', slug: article.slug });
    }
    // Journalist can only edit their own draft or pending_review articles
    if (article.status === 'draft' || article.status === 'pending_review') {
      actions.push({ type: 'edit', articleId: article.id }); 
      if (article.status === 'draft') {
        actions.push({ type: 'sendForReview', onClick: () => handleSendForReview(article.id), disabled: isPending || actionLoading[`sendForReview-${article.id}`] });
      }
    }
    // Journalist can delete their own articles, regardless of status (unless published and locked - current logic allows)
    actions.push({
        type: 'delete',
        onClick: () => handleDeleteRequest(article), 
        disabled: isPending || actionLoading[`delete-${article.id}`]
    });
    return actions;
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-[200px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-headline text-primary">Mis Artículos</h1>
          <p className="text-muted-foreground">Administra tus artículos creados, {userProfile?.displayName || user?.email}.</p>
        </div>
        <Link href="/dashboard/create" passHref legacyBehavior>
          <Button className="bg-accent hover:bg-accent/80 text-accent-foreground">
            <FilePlus className="mr-2 h-5 w-5" /> Crear Nuevo Artículo
          </Button>
        </Link>
      </div>
      <ArticleTable
        articles={articles.map(article => ({
          ...article,
          authorName: article.authorName === 'Unnamed Author' ? 'Dr. Robinson Rada Gonzalez' : article.authorName
        }))}
        caption="Tus artículos aparecerán aquí."
        getActionsForArticle={getActions}
        isLoading={actionLoading}
      />
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el artículo
              "{articleToDelete?.title}" y sus archivos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setArticleToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteArticle}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              disabled={isPending || (articleToDelete && actionLoading[`delete-${articleToDelete.id}`])}
            >
              {isPending || (articleToDelete && actionLoading[`delete-${articleToDelete.id}`]) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
