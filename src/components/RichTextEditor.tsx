'use client';

import { Editor } from '@tinymce/tinymce-react';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  outputFormat?: 'html' | 'markdown' | 'text';
  className?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Escribe aquí...',
  outputFormat = 'html',
  className = '',
}: RichTextEditorProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Simulate loading for 1 second
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleChange = (val: string | undefined) => {
    // Si el outputFormat es 'html', asegúrate de pasar HTML
    if (outputFormat === 'html') {
      onChange(val || ''); // content debe ser HTML
    }
    // Si necesitas soportar otros formatos, puedes agregar lógica aquí
  };

  if (loading) {
    return (
      <div className="h-32 bg-muted animate-pulse rounded-md flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
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
      <Editor
        apiKey="fw0bk0wkih2w0esgp70qreagiclmty3187kokrumd30f26hi"
        value={value}
        init={{
          height: 400,
          menubar: false,
          plugins: [
            'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview', 'anchor',
            'searchreplace', 'visualblocks', 'code', 'fullscreen',
            'insertdatetime', 'media', 'table', 'help', 'wordcount'
          ],
          toolbar:
            'undo redo | formatselect | bold italic underline | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | removeformat | help',
          paste_data_images: true,
          paste_as_text: false,
          paste_word_valid_elements: 'b,strong,i,em,h1,h2,h3,h4,h5,h6,p,ul,ol,li,table,tr,td,th,thead,tbody,span,div,br',
          paste_enable_default_filters: true,
          content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:16px }',
        }}
        onEditorChange={handleChange}
        placeholder={placeholder}
      />
    </div>
  );
}
