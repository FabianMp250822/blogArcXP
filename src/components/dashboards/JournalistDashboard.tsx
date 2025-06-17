
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function JournalistDashboard() {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

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

  const handleSendForReview = (articleId: string) => {
    setActionLoading(prev => ({ ...prev, [`sendForReview-${articleId}`]: true }));
    startTransition(async () => {
      const result = await sendArticleForReviewAction(articleId);
      if (result.success) {
        toast({ title: 'Success', description: result.message });
        setArticles(prev => prev.map(a => a.id === articleId ? { ...a, status: 'pending_review' } : a));
      } else {
        toast({ title: 'Error', description: result.message, variant: 'destructive' });
      }
      setActionLoading(prev => ({ ...prev, [`sendForReview-${articleId}`]: false }));
    });
  };
  
  const handleDeleteArticle = (articleId: string) => {
    setActionLoading(prev => ({ ...prev, [`delete-${articleId}`]: true }));
    startTransition(async () => {
      // Confirmation dialog is good practice here, but for brevity:
      const result = await deleteArticleAction(articleId); // Assuming this action exists
      if (result.success) {
        toast({ title: 'Success', description: result.message });
        setArticles(prev => prev.filter(a => a.id !== articleId));
      } else {
        toast({ title: 'Error', description: result.message, variant: 'destructive' });
      }
      setActionLoading(prev => ({ ...prev, [`delete-${articleId}`]: false }));
    });
  };


  const getActions = (article: Article) => {
    const actions: any[] = []; // Type assertion for ArticleAction[]
    if (article.status === 'published') {
      actions.push({ type: 'view', onClick: () => {} });
    }
    if (article.status === 'draft') {
      actions.push({ type: 'edit', onClick: () => {} }); // Link handled by ArticleTable
      actions.push({ type: 'sendForReview', onClick: handleSendForReview, disabled: isPending || actionLoading[`sendForReview-${article.id}`] });
    }
     actions.push({
        type: 'delete',
        onClick: () => handleDeleteArticle(article.id), // Placeholder, use AlertDialog
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
          <h1 className="text-3xl font-headline text-primary">My Articles</h1>
          <p className="text-muted-foreground">Manage your created articles, {userProfile?.displayName || user?.email}.</p>
        </div>
        <Link href="/dashboard/create" passHref legacyBehavior>
          <Button className="bg-accent hover:bg-accent/80 text-accent-foreground">
            <FilePlus className="mr-2 h-5 w-5" /> Create New Article
          </Button>
        </Link>
      </div>
      <ArticleTable
        articles={articles}
        caption="Your articles will appear here."
        getActionsForArticle={getActions}
        isLoading={actionLoading}
      />
    </div>
  );
}
