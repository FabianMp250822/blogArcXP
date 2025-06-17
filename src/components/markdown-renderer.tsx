'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      className={cn(
        'prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none dark:prose-invert',
        'prose-headings:font-headline prose-headings:tracking-tight',
        'prose-p:text-foreground/80 prose-li:text-foreground/80',
        'prose-a:text-primary hover:prose-a:text-accent transition-colors',
        'prose-strong:text-foreground',
        'prose-blockquote:border-primary prose-blockquote:text-foreground/70',
        'prose-code:bg-muted prose-code:text-foreground prose-code:p-1 prose-code:rounded-sm prose-code:font-code',
        'prose-pre:bg-muted prose-pre:p-4 prose-pre:rounded-md',
        className
      )}
      remarkPlugins={[remarkGfm]}
    >
      {content}
    </ReactMarkdown>
  );
}
