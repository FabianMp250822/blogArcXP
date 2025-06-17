
'use client';

import type { Article } from '@/types';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format } from 'date-fns';
import { Eye, Edit3, Send, CheckCircle, XCircle, Trash2, ShieldQuestion } from 'lucide-react';

type ArticleAction = 
  | { type: 'view'; onClick: (articleId: string) => void }
  | { type: 'edit'; onClick: (articleId: string, slug: string) => void }
  | { type: 'sendForReview'; onClick: (articleId: string) => void; disabled?: boolean }
  | { type: 'approve'; onClick: (articleId: string) => void; disabled?: boolean }
  | { type: 'reject'; onClick: (articleId: string) => void; disabled?: boolean }
  | { type: 'delete'; onClick: (articleId: string) => void; disabled?: boolean };

interface ArticleTableProps {
  articles: Article[];
  caption?: string;
  getActionsForArticle: (article: Article) => ArticleAction[];
  isLoading?: Record<string, boolean>; // For button loading states e.g. { [`approve-${article.id}`]: true }
}

const statusColors: Record<Article['status'], string> = {
  draft: 'bg-yellow-500 hover:bg-yellow-600',
  pending_review: 'bg-blue-500 hover:bg-blue-600',
  published: 'bg-green-500 hover:bg-green-600',
};

export default function ArticleTable({ articles, caption, getActionsForArticle, isLoading = {} }: ArticleTableProps) {
  if (!articles.length) {
    return <p className="text-muted-foreground text-center py-4">{caption || "No articles found."}</p>;
  }

  const renderActionButton = (action: ArticleAction, article: Article) => {
    const buttonKey = `${action.type}-${article.id}`;
    const loading = isLoading[buttonKey];

    switch (action.type) {
      case 'view':
        return <Link href={`/articles/${article.slug}`} passHref legacyBehavior><Button variant="outline" size="sm" className="mr-1" title="View Published Article"><Eye size={16}/></Button></Link>;
      case 'edit':
        return <Link href={`/dashboard/edit/${article.id}`} passHref legacyBehavior><Button variant="outline" size="sm" className="mr-1" title="Edit Article"><Edit3 size={16}/></Button></Link>;
      case 'sendForReview':
        return <Button variant="default" size="sm" onClick={() => action.onClick(article.id)} className="bg-blue-500 hover:bg-blue-600 text-white mr-1" disabled={action.disabled || loading} title="Send for Review">{loading ? <Loader2Icon /> : <Send size={16}/>}</Button>;
      case 'approve':
        return <Button variant="default" size="sm" onClick={() => action.onClick(article.id)} className="bg-green-500 hover:bg-green-600 text-white mr-1" disabled={action.disabled || loading} title="Approve & Publish">{loading ? <Loader2Icon /> : <CheckCircle size={16}/>}</Button>;
      case 'reject':
        return <Button variant="destructive" size="sm" onClick={() => action.onClick(article.id)} className="mr-1" disabled={action.disabled || loading} title="Reject & Return to Draft">{loading ? <Loader2Icon /> : <XCircle size={16}/>}</Button>;
      case 'delete':
        return <Button variant="destructive" size="sm" onClick={() => action.onClick(article.id)} className="bg-red-700 hover:bg-red-800 mr-1" disabled={action.disabled || loading} title="Delete Article">{loading ? <Loader2Icon /> : <Trash2 size={16}/>}</Button>;
      default:
        return null;
    }
  };
  
  const Loader2Icon = () => <Loader2 size={16} className="animate-spin" />;

  return (
    <Table>
      {caption && <TableCaption>{caption}</TableCaption>}
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead className="hidden md:table-cell">Author</TableHead>
          <TableHead className="hidden lg:table-cell">Category</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="hidden md:table-cell">Created</TableHead>
          <TableHead className="hidden lg:table-cell">Published</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {articles.map((article) => (
          <TableRow key={article.id}>
            <TableCell className="font-medium max-w-[200px] truncate" title={article.title}>{article.title}</TableCell>
            <TableCell className="hidden md:table-cell max-w-[150px] truncate" title={article.authorName}>{article.authorName || <ShieldQuestion size={16} className="text-muted-foreground"/>}</TableCell>
            <TableCell className="hidden lg:table-cell max-w-[150px] truncate" title={article.categoryName}>{article.categoryName || 'N/A'}</TableCell>
            <TableCell>
              <Badge className={`${statusColors[article.status]} text-white`}>
                {article.status.replace('_', ' ')}
              </Badge>
            </TableCell>
            <TableCell className="hidden md:table-cell">{format(article.createdAt.toDate(), 'MMM d, yyyy')}</TableCell>
            <TableCell className="hidden lg:table-cell">
              {article.publishedAt ? format(article.publishedAt.toDate(), 'MMM d, yyyy') : 'N/A'}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end items-center space-x-1">
                {getActionsForArticle(article).map(action => renderActionButton(action, article))}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

