'use client';

import React from 'react'; // Añadido para que React esté en el ámbito
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
import { Eye, Edit3, Send, CheckCircle, XCircle, Trash2, ShieldQuestion, Loader2 as Loader2Icon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // <-- AÑADE ESTA IMPORTACIÓN

type ArticleAction = 
  | { type: 'view'; slug: string }
  | { type: 'edit'; articleId: string }
  | { type: 'sendForReview'; onClick: () => void; disabled?: boolean }
  | { type: 'approve'; onClick: () => void; disabled?: boolean }
  | { type: 'reject'; onClick: () => void; disabled?: boolean }
  | { type: 'delete'; onClick: () => void; disabled?: boolean };

interface ArticleTableProps {
  articles: Article[];
  caption?: string;
  getActionsForArticle?: (article: Article) => ArticleAction[]; // <-- Cambiado a opcional
  isLoading?: Record<string, boolean>; 
  onStatusChange?: (articleId: string, newStatus: Article['status']) => void;
}

const statusColors: Record<Article['status'], string> = {
  draft: 'bg-yellow-500 hover:bg-yellow-600',
  pending_review: 'bg-blue-500 hover:bg-blue-600',
  published: 'bg-green-500 hover:bg-green-600',
};

// Componente de carga definido fuera para evitar su recreación en cada render
const LoaderIcon = () => <Loader2Icon size={16} className="animate-spin" />;

export default function ArticleTable({ articles, caption, getActionsForArticle, isLoading = {}, onStatusChange }: ArticleTableProps) {
  if (!articles.length) {
    return <p className="text-muted-foreground text-center py-4">{caption || "No articles found."}</p>;
  }

  const renderActionButton = (action: ArticleAction, article: Article) => {
    const buttonKey = `${action.type}-${article.id}`;
    const loading = isLoading[buttonKey] || (action.type === 'delete' && isLoading[`delete-${article.id}`]);

    switch (action.type) {
      case 'view':
        return <Link href={`/articles/${action.slug}`}><Button variant="outline" size="sm" className="mr-1" title="View Published Article"><Eye size={16}/></Button></Link>;
      case 'edit':
        return <Link href={`/dashboard/edit/${action.articleId}`}><Button variant="outline" size="sm" className="mr-1" title="Edit Article"><Edit3 size={16}/></Button></Link>;
      case 'sendForReview':
        return <Button variant="default" size="sm" onClick={action.onClick} className="bg-blue-500 hover:bg-blue-600 text-white mr-1" disabled={action.disabled || loading} title="Send for Review">{loading ? <LoaderIcon /> : <Send size={16}/>}</Button>;
      case 'approve':
        return <Button variant="default" size="sm" onClick={action.onClick} className="bg-green-500 hover:bg-green-600 text-white mr-1" disabled={action.disabled || loading} title="Approve & Publish">{loading ? <LoaderIcon /> : <CheckCircle size={16}/>}</Button>;
      case 'reject':
        return <Button variant="destructive" size="sm" onClick={action.onClick} className="mr-1" disabled={action.disabled || loading} title="Reject & Return to Draft">{loading ? <LoaderIcon /> : <XCircle size={16}/>}</Button>;
      case 'delete':
        return <Button variant="destructive" size="sm" onClick={action.onClick} className="bg-red-700 hover:bg-red-800 mr-1" disabled={action.disabled || loading} title="Delete Article">{loading ? <LoaderIcon /> : <Trash2 size={16}/>}</Button>;
      default:
        return null;
    }
  };
  
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
          {/* Añade la cabecera de la columna si la función existe */}
          {getActionsForArticle && <TableHead className="text-right">Actions</TableHead>}
          {onStatusChange && <TableHead>Change Status</TableHead>}
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
            {getActionsForArticle && (
              <TableCell className="text-right">
                <div className="flex justify-end items-center space-x-1">
                  {getActionsForArticle(article).map((action, index) => (
                    <React.Fragment key={`${action.type}-${index}`}>
                      {renderActionButton(action, article)}
                    </React.Fragment>
                  ))}
                </div>
              </TableCell>
            )}
            {/* Añade la celda con el selector si la función existe */}
            {onStatusChange && (
              <TableCell>
                <Select
                  value={article.status}
                  onValueChange={(newStatus: Article['status']) => onStatusChange(article.id, newStatus)}
                  disabled={isLoading?.[`status-${article.id}`]}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Change status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending_review">Pending Review</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
