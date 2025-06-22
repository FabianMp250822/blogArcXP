'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Comment } from '@/types';
import { getCommentsByArticleId } from '@/lib/firebase/firestore';
import { Loader2, MessageSquare } from 'lucide-react';
import { CommentForm } from './CommentForm';
import { CommentItem } from './CommentItem';

interface CommentsSectionProps {
  articleId: string;
  articleSlug: string;
}

export function CommentsSection({ articleId, articleSlug }: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchComments = useMemo(() => async () => {
    setLoading(true);
    try {
      const fetchedComments = await getCommentsByArticleId(articleId);
      setComments(fetchedComments);
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoading(false);
    }
  }, [articleId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const nestedComments = useMemo(() => {
    const commentMap: Record<string, Comment & { children: Comment[] }> = {};
    const roots: (Comment & { children: Comment[] })[] = [];

    for (const comment of comments) {
      commentMap[comment.id] = { ...comment, children: [] };
    }

    for (const comment of comments) {
      if (comment.parentId && commentMap[comment.parentId]) {
        commentMap[comment.parentId].children.push(commentMap[comment.id]);
      } else {
        roots.push(commentMap[comment.id]);
      }
    }
    return roots;
  }, [comments]);

  return (
    <section className="mt-12">
      <h2 className="text-2xl font-headline font-bold mb-6 flex items-center">
        <MessageSquare className="mr-3 h-6 w-6 text-primary" />
        Comentarios ({comments.filter(c => !c.isDeleted).length})
      </h2>

      <div className="mb-8">
        <CommentForm
          articleId={articleId}
          articleSlug={articleSlug}
          onCommentPosted={fetchComments}
        />
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          {nestedComments.length > 0 ? (
            nestedComments.map(comment => (
              <CommentItem
                key={comment.id}
                comment={comment}
                articleId={articleId}
                articleSlug={articleSlug}
                onCommentPosted={fetchComments}
              />
            ))
          ) : (
            <p className="text-muted-foreground text-center py-4">
              Sé el primero en comentar.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
