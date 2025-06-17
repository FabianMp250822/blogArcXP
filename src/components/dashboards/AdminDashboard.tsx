
'use client';

import { useEffect, useState, useTransition } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { getAllArticlesForAdmin } from '@/lib/firebase/firestore';
import type { Article } from '@/types';
import ArticleTable from './ArticleTable';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { FilePlus, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { approveArticleAction, rejectArticleAction, deleteArticleAction } from '@/app/dashboard/actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"; // Removed AlertDialogTrigger as it's part of ArticleTable's button now

type StatusFilter = Article['status'] | 'all';

export default function AdminDashboard() {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [allArticles, setAllArticles] = useState<Article[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [currentTab, setCurrentTab] = useState<StatusFilter>('pending_review');
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [articleToDelete, setArticleToDelete] = useState<Article | null>(null);

  useEffect(() => {
    setLoading(true);
    getAllArticlesForAdmin()
      .then(articles => {
        setAllArticles(articles);
      })
      .catch(err => {
        console.error("Failed to fetch articles:", err);
        toast({ title: "Error", description: "Could not fetch articles for admin.", variant: "destructive" });
      })
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => {
    if (currentTab === 'all') {
      setFilteredArticles(allArticles);
    } else {
      setFilteredArticles(allArticles.filter(a => a.status === currentTab));
    }
  }, [currentTab, allArticles]);

  const refreshArticles = async () => {
    setLoading(true);
     try {
        const articles = await getAllArticlesForAdmin();
        setAllArticles(articles);
      } catch (err) {
        console.error("Failed to refresh articles:", err);
        toast({ title: "Error", description: "Could not refresh articles.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
  };

  const handleApprove = (articleId: string) => {
    setActionLoading(prev => ({ ...prev, [`approve-${articleId}`]: true }));
    startTransition(async () => {
      const result = await approveArticleAction(articleId);
      if (result.success) {
        toast({ title: 'Success', description: result.message });
        refreshArticles();
      } else {
        toast({ title: 'Error', description: result.message, variant: 'destructive' });
      }
      setActionLoading(prev => ({ ...prev, [`approve-${articleId}`]: false }));
    });
  };

  const handleReject = (articleId: string) => {
    setActionLoading(prev => ({ ...prev, [`reject-${articleId}`]: true }));
    startTransition(async () => {
      const result = await rejectArticleAction(articleId);
      if (result.success) {
        toast({ title: 'Success', description: result.message });
        refreshArticles();
      } else {
        toast({ title: 'Error', description: result.message, variant: 'destructive' });
      }
      setActionLoading(prev => ({ ...prev, [`reject-${articleId}`]: false }));
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
        refreshArticles();
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
    if (article.status === 'pending_review') {
      actions.push({ type: 'approve', onClick: () => handleApprove(article.id), disabled: isPending || actionLoading[`approve-${article.id}`] });
      actions.push({ type: 'reject', onClick: () => handleReject(article.id), disabled: isPending || actionLoading[`reject-${article.id}`] });
    }
    // Admin can edit any draft or published article (edit might not change status, just content)
    if (article.status === 'draft' || article.status === 'published' || article.status === 'pending_review') {
       actions.push({ type: 'edit', articleId: article.id });
    }
    
    actions.push({
        type: 'delete',
        onClick: () => handleDeleteRequest(article), 
        disabled: isPending || actionLoading[`delete-${article.id}`]
    });
    return actions;
  };

  if (loading && !allArticles.length) { 
    return <div className="flex justify-center items-center min-h-[200px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
         <div>
            <h1 className="text-3xl font-headline text-primary">Admin Article Management</h1>
            <p className="text-muted-foreground">Oversee all articles, {userProfile?.displayName || user?.email}.</p>
        </div>
        <Link href="/dashboard/create">
          <Button className="bg-accent hover:bg-accent/80 text-accent-foreground">
            <FilePlus className="mr-2 h-5 w-5" /> Create New Article
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="pending_review" onValueChange={(value) => setCurrentTab(value as StatusFilter)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending_review">Pending Review</TabsTrigger>
          <TabsTrigger value="published">Published</TabsTrigger>
          <TabsTrigger value="draft">Drafts</TabsTrigger>
          <TabsTrigger value="all">All Articles</TabsTrigger>
        </TabsList>
        <TabsContent value={currentTab}>
            {loading && <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}
            {!loading && (
                <ArticleTable
                    articles={filteredArticles}
                    caption={`Showing ${currentTab.replace('_', ' ')} articles.`}
                    getActionsForArticle={getActions}
                    isLoading={actionLoading}
                />
            )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the article
              "{articleToDelete?.title}" and its associated files.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setArticleToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteArticle}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              disabled={isPending || (articleToDelete && actionLoading[`delete-${articleToDelete.id}`])}
            >
              {isPending || (articleToDelete && actionLoading[`delete-${articleToDelete.id}`]) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
