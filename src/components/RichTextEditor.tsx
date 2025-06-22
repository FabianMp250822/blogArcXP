'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { SimpleTextEditor } from './SimpleTextEditor';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Escribe aquí...',
  className = '',
}: RichTextEditorProps) {
  const [MDEditor, setMDEditor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadMDEditor = async () => {
      try {
        if (typeof window !== 'undefined') {
          const { default: MDEditorComponent } = await import('@uiw/react-md-editor');
          setMDEditor(() => MDEditorComponent);
        }
      } catch (err) {
        console.warn('Error loading MD Editor, falling back to SimpleTextEditor:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadMDEditor();
  }, []);

  const handleChange = useCallback(
    (val: string | undefined) => {
      onChange(val || '');
    },
    [onChange]
  );

  if (loading) {
    return (
      <div className="h-32 bg-muted animate-pulse rounded-md flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error || !MDEditor) {
    return (
      <SimpleTextEditor
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={className}
      />
    );
  }

  return (
    <div className={`rich-text-editor ${className}`} data-color-mode="light">
      <style
        dangerouslySetInnerHTML={{
          __html: `
          .rich-text-editor .w-md-editor {
            background-color: hsl(var(--background));
            border: 1px solid hsl(var(--border));
            border-radius: 8px;
          }
          .rich-text-editor .w-md-editor-text-container {
            background-color: hsl(var(--background));
          }
          .rich-text-editor .w-md-editor-text {
            color: hsl(var(--foreground)) !important;
            background-color: hsl(var(--background)) !important;
          }
          .rich-text-editor .w-md-editor-text::placeholder {
            color: hsl(var(--muted-foreground));
          }
          .rich-text-editor .w-md-editor-preview {
            background-color: hsl(var(--background));
            color: hsl(var(--foreground));
          }
          .rich-text-editor .w-md-editor-toolbar {
            background-color: hsl(var(--muted));
            border-bottom: 1px solid hsl(var(--border));
          }
          .rich-text-editor .w-md-editor-toolbar-divider {
            background-color: hsl(var(--border));
          }
        `,
        }}
      />
      <MDEditor
        value={value ?? ''}
        onChange={handleChange}
        placeholder={placeholder}
        preview="edit"
        height={200}
        data-color-mode="light"
      />
    </div>
  );
}

