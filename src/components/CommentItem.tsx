'use client';

import { useState, useTransition, useEffect } from 'react';
import type { Comment } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { useActionState } from 'react';
import { deleteCommentAction, type CommentActionState } from '@/app/articles/[slug]/actions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { CommentForm } from './CommentForm';
import { Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CommentItemProps {
  comment: Comment & { children?: Comment[] };
  articleId: string;
  articleSlug: string;
  onCommentPosted: () => void;
}

export function CommentItem({ comment, articleId, articleSlug, onCommentPosted }: CommentItemProps) {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [isReplying, setIsReplying] = useState(false);
  const [isPending, startTransition] = useTransition();

  const canDelete = user && (user.uid === comment.userId || userProfile?.role === 'admin');

  const initialState: CommentActionState = { message: '', success: false };
  const [deleteState, deleteFormAction] = useActionState(deleteCommentAction, initialState);

  useEffect(() => {
    if (deleteState.message) {
      toast({
        title: deleteState.success ? 'Éxito' : 'Error',
        description: deleteState.message,
        variant: deleteState.success ? 'default' : 'destructive'
      });
      if (deleteState.success) {
        onCommentPosted();
      }
    }
  }, [deleteState, toast, onCommentPosted]);

  const handleDelete = () => {
    if (!canDelete || !user) return;
    
    startTransition(async () => {
        const idToken = await user.getIdToken();
        const formData = new FormData();
        formData.append('commentId', comment.id);
        formData.append('idToken', idToken);
        formData.append('articleSlug', articleSlug);
        deleteFormAction(formData);
    });
  };

  return (
    <div className="flex space-x-4">
      <Avatar>
        <AvatarImage src={comment.avatarUrl} alt={comment.username} />
        <AvatarFallback>{comment.username?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="bg-muted p-4 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <p className="font-semibold text-sm">{comment.isDeleted ? 'Usuario eliminado' : comment.username}</p>
            {canDelete && !comment.isDeleted && (
              <Button variant="ghost" size="icon" onClick={handleDelete} disabled={isPending} title="Eliminar comentario">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
              </Button>
            )}
          </div>
          <p className={`text-sm ${comment.isDeleted ? 'text-muted-foreground italic' : ''}`}>
            {comment.text}
          </p>
        </div>
        <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-1">
          <span>
            {comment.timestamp ? formatDistanceToNow(comment.timestamp.toDate(), { addSuffix: true, locale: es }) : ''}
          </span>
          {!comment.isDeleted && user && (
            <button onClick={() => setIsReplying(!isReplying)} className="font-semibold hover:text-primary">
              {isReplying ? 'Cancelar' : 'Responder'}
            </button>
          )}
        </div>

        {isReplying && (
          <div className="mt-4">
            <CommentForm
              articleId={articleId}
              articleSlug={articleSlug}
              parentId={comment.id}
              onCommentPosted={() => {
                setIsReplying(false);
                onCommentPosted();
              }}
            />
          </div>
        )}

        {comment.children && comment.children.length > 0 && (
          <div className="mt-4 space-y-4 pl-6 border-l-2">
            {comment.children.map(reply => (
              <CommentItem
                key={reply.id}
                comment={reply}
                articleId={articleId}
                articleSlug={articleSlug}
                onCommentPosted={onCommentPosted}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
