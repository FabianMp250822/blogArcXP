'use client';

import { useEffect, useState, useActionState, useTransition } from 'react'; 
import { useParams, useRouter } from 'next/navigation';
import { useFormStatus } from 'react-dom'; 
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { updateArticleAction, type UpdateArticleFormState } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { getArticleById, getAllCategories } from '@/lib/firebase/firestore';
import type { Article, Category } from '@/types';
import { Loader2, UploadCloud, AlertTriangle, FileText, Trash2, PlusCircle } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/hooks/use-auth';
import { RichTextEditor } from '@/components/RichTextEditor';
import { SimpleTextEditor } from '@/components/SimpleTextEditor';
import { useClientOnly } from '@/hooks/use-client-only';

// --- MODIFICADO: Esquema Zod dinámico para manejar múltiples tipos ---
const FormSchema = z.object({
  publicationType: z.enum(['markdown', 'standard', 'pdf', 'sequence']),
  title: z.string().min(5, 'Title must be at least 5 characters long.'),
  categoryId: z.string().min(1, 'Category is required.'),
  
  // --- CAMBIO: coverImage obligatorio si no hay imagen previa ---
  coverImage: z.instanceof(FileList).optional()
    .refine(
      // Si no hay archivo, se permite solo si ya existe una imagen previa (validación en el submit)
      files => !files || files.length === 0 || files?.[0]?.size <= 5 * 1024 * 1024,
      'Cover image must be less than 5MB.'
    )
    .refine(
      files => !files || files.length === 0 || files?.[0]?.type.startsWith('image/'),
      'Only image files are allowed.'
    ),

  // Campos para Markdown/Standard
  excerpt: z.string().optional(),
  content: z.string().optional(),

  // Campos para PDF
  pdfFile: z.instanceof(FileList).optional(),

  // Campos para Secuencia
  sections: z.array(z.object({
    image: z.instanceof(FileList).optional(),
    text: z.string().min(10, 'Text must be at least 10 characters.'),
  })).optional(),

}).superRefine((data, ctx) => {
  switch (data.publicationType) {
    case 'markdown':
    case 'standard':
      if (!data.excerpt || data.excerpt.length < 10) ctx.addIssue({ code: 'custom', message: 'Excerpt must be at least 10 characters.', path: ['excerpt'] });
      if (data.excerpt && data.excerpt.length > 300) ctx.addIssue({ code: 'custom', message: 'Max 300 characters.', path: ['excerpt'] });
      if (!data.content || data.content.length < 50) ctx.addIssue({ code: 'custom', message: 'Content must be at least 50 characters.', path: ['content'] });
      break;
    case 'pdf':
      // Para edición, el PDF no es obligatorio si ya existe
      break;
    case 'sequence':
      if (!data.sections || data.sections.length < 1) {
        ctx.addIssue({ code: 'custom', message: 'At least one section is required.', path: ['sections'] });
      }
      break;
  }
});

type FormValues = z.infer<typeof FormSchema>;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {pending ? 'Saving Changes...' : 'Save Changes'}
    </Button>
  );
}

export default function EditDashboardArticlePage() {
  const { toast } = useToast();
  const { user, role } = useAuth();
  const params = useParams();
  const router = useRouter();
  const articleId = params.articleId as string;
  const isClient = useClientOnly();
  const [useSimpleEditor, setUseSimpleEditor] = useState(false);

  const [article, setArticle] = useState<Article | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [_isActionPending, startActionTransition] = useTransition();

  const { control, register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      publicationType: 'markdown',
      title: '',
      excerpt: '',
      content: '',
      categoryId: '',
      sections: [],
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "sections"
  });

  const initialState: UpdateArticleFormState = { message: '', success: false, errors: {} };
  const [state, formAction] = useActionState(updateArticleAction, initialState); 

  const coverImageFile = watch('coverImage');
  const publicationType = watch('publicationType');

  useEffect(() => {
    if (coverImageFile && coverImageFile.length > 0) {
      const file = coverImageFile[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => setImagePreview(reader.result as string);
        reader.readAsDataURL(file);
      }
    } else if (article && !coverImageFile?.length) {
      setImagePreview((article as any).coverImageUrl || null);
    }
  }, [coverImageFile, article]);

  useEffect(() => {
    async function fetchData() {
      if (!articleId) return;
      setDataLoading(true);
      try {
        const [fetchedArticle, fetchedCategories] = await Promise.all([
          getArticleById(articleId),
          getAllCategories(),
        ]);
        
        if (!fetchedArticle) {
          toast({ title: 'Error', description: 'Article not found.', variant: 'destructive' });
          router.push('/dashboard');
          return;
        }

        if (role !== 'admin' && fetchedArticle.authorId !== user?.uid) {
           toast({ title: 'Unauthorized', description: 'You do not have permission to edit this article.', variant: 'destructive' });
           router.push('/dashboard');
           return;
        }
        
        setArticle(fetchedArticle);
        setCategories(fetchedCategories);
        
        // Determinar el tipo de publicación
        const articleType = (fetchedArticle as any).type || (fetchedArticle as any).publicationType || 'markdown';
        setValue('publicationType', articleType);
        setValue('title', fetchedArticle.title);
        setValue('categoryId', fetchedArticle.categoryId);
        
        // Cargar datos específicos según el tipo
        if (articleType === 'markdown' || articleType === 'standard') {
          setValue('excerpt', (fetchedArticle as any).excerpt || '');
          setValue('content', (fetchedArticle as any).content || '');
        } else if (articleType === 'sequence') {
          const sections = (fetchedArticle as any).sections || [];
          setValue('sections', sections.map((s: any) => ({ text: s.text, image: new DataTransfer().files })));
        }
        
        setImagePreview((fetchedArticle as any).coverImageUrl);

      } catch (error) {
        toast({ title: 'Error fetching data', description: 'Could not load article or categories.', variant: 'destructive' });
      } finally {
        setDataLoading(false);
      }
    }
    if (user && role && articleId) fetchData();
  }, [articleId, toast, router, user, role, setValue]);


  useEffect(() => {
    if (state.success) {
      toast({
        title: 'Success!',
        description: state.message,
        variant: 'default',
        className: 'bg-green-500 text-white'
      });
      if (state.updatedArticleSlug) {
        router.push(`/articles/${state.updatedArticleSlug}`);
      } else {
        router.push('/dashboard');
      }
    } else if (state.message && !state.success && (state.errors || state.message !== '')) {
      toast({
        title: 'Error',
        description: state.message || 'Failed to update article. Please check the form.',
        variant: 'destructive'
      });
    }
  }, [state, toast, router]);

  const onSubmit = async (data: FormValues) => {
    if (!user?.uid) {
      toast({ title: 'Authentication Error', description: 'You must be logged in to edit an article.', variant: 'destructive'});
      return;
    }

    // Si no hay imagen previa y no se subió una nueva, error
    if (
      (!article || !(article as any).coverImageUrl) &&
      (!data.coverImage || data.coverImage.length === 0)
    ) {
      toast({ title: 'Cover Image Required', description: 'You must upload a cover image.', variant: 'destructive' });
      return;
    }

    try {
      const idToken = await user.getIdToken();
      const formData = new FormData();
      
      formData.append('articleId', articleId);
      formData.append('publicationType', data.publicationType);
      formData.append('title', data.title);
      formData.append('categoryId', data.categoryId);
      formData.append('idToken', idToken); // <-- Agregar el token

      // Imagen de portada
      if (data.coverImage && data.coverImage.length > 0) {
        formData.append('coverImage', data.coverImage[0]);
      }

      // Campos específicos según el tipo
      switch (data.publicationType) {
        case 'markdown':
        case 'standard':
          if (data.excerpt) formData.append('excerpt', data.excerpt);
          if (data.content) formData.append('content', data.content);
          break;
        case 'pdf':
          if (data.pdfFile && data.pdfFile.length > 0) {
            formData.append('pdfFile', data.pdfFile[0]);
          }
          break;
        case 'sequence':
          data.sections?.forEach((section, index) => {
            if (section.image && section.image.length > 0) {
              formData.append(`sections[${index}][image]`, section.image[0]);
            }
            formData.append(`sections[${index}][text]`, section.text);
          });
          break;
      }

      startActionTransition(() => {
        formAction(formData);
      });
    } catch (error) {
      console.error("Error getting ID token:", error);
      toast({ title: 'Authentication Error', description: 'Could not verify your session. Please try logging in again.', variant: 'destructive'});
    }
  };

  if (dataLoading) {
    return <div className="flex justify-center items-center min-h-[300px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!article) {
    return <div className="text-center py-10">Article not loaded or you do not have permission.</div>;
  }

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-headline text-primary">Edit Article</CardTitle>
        <CardDescription>Update the details of your article. Current status: <span className="font-semibold capitalize">{article.status.replace('_', ' ')}</span></CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {state.message && !state.success && state.errors?._form && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Form Error</AlertTitle>
              <AlertDescription>{state.errors._form.join(', ')}</AlertDescription>
            </Alert>
          )}

          <div>
            <Label htmlFor="publicationType" className="font-medium">Publication Type</Label>
            <Controller
              name="publicationType"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value} disabled>
                  <SelectTrigger id="publicationType" className="mt-1">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="markdown">Markdown Article</SelectItem>
                    <SelectItem value="standard">Standard Article</SelectItem>
                    <SelectItem value="pdf">PDF Document</SelectItem>
                    <SelectItem value="sequence">Image Sequence</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <p className="text-xs text-muted-foreground mt-1">Article type cannot be changed during editing</p>
          </div>

          <div>
            <Label htmlFor="title" className="font-medium">Title</Label>
            <Input id="title" {...register('title')} aria-invalid={errors.title ? "true" : "false"} className="mt-1"/>
            {errors.title && <p className="text-sm text-destructive mt-1">{errors.title.message}</p>}
          </div>

          {/* Imagen de portada (para todos los tipos) */}
          <div>
            <Label htmlFor="coverImage" className="font-medium">Cover Image (Optional: leave empty to keep existing)</Label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md border-input hover:border-primary transition-colors">
              <div className="space-y-1 text-center">
                {imagePreview ? (
                   <div className="relative w-full h-48 mb-2">
                     <Image src={imagePreview} alt="Cover image preview" fill style={{ objectFit: 'contain' }} />
                   </div>
                ) : (
                  <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
                )}
                <div className="flex text-sm text-muted-foreground">
                  <label
                    htmlFor="coverImage"
                    className="relative cursor-pointer rounded-md font-medium text-primary hover:text-accent focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-ring"
                  >
                    <span>Upload a new file</span>
                    <input id="coverImage" type="file" {...register('coverImage')} className="sr-only" accept="image/*" />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 5MB</p>
              </div>
            </div>
            {errors.coverImage && <p className="text-sm text-destructive mt-1">{errors.coverImage.message as string}</p>}
          </div>

          {/* Campos específicos según el tipo */}
          {(publicationType === 'markdown' || publicationType === 'standard') && (
            <>
              <div>
                <Label htmlFor="excerpt" className="font-medium">Excerpt</Label>
                <Textarea id="excerpt" {...register('excerpt')} aria-invalid={errors.excerpt ? "true" : "false"} className="mt-1" rows={3}/>
                {errors.excerpt && <p className="text-sm text-destructive mt-1">{errors.excerpt.message}</p>}
              </div>

              <div>
                <Label htmlFor="content" className="font-medium">Content</Label>
                {isClient ? (
                  <>
                    {!useSimpleEditor ? (
                      <Controller
                        name="content"
                        control={control}
                        render={({ field }) => (
                          <div>
                            <RichTextEditor
                              value={field.value || ''}
                              onChange={field.onChange}
                              placeholder="Puedes copiar y pegar desde Word. El formato (negritas, listas, títulos, tablas, etc.) se mantendrá."
                            />
                            <Button
                              type="button"
                              variant="link"
                              size="sm"
                              onClick={() => setUseSimpleEditor(true)}
                              className="mt-2 text-xs"
                            >
                              ¿Problemas con el editor? Cambiar a editor simple
                            </Button>
                          </div>
                        )}
                      />
                    ) : (
                      <Controller
                        name="content"
                        control={control}
                        render={({ field }) => (
                          <div>
                            <SimpleTextEditor
                              value={field.value || ''}
                              onChange={field.onChange}
                              placeholder="Escribe tu artículo aquí usando HTML o Markdown."
                            />
                            <Button
                              type="button"
                              variant="link"
                              size="sm"
                              onClick={() => setUseSimpleEditor(false)}
                              className="mt-2 text-xs"
                            >
                              Cambiar a editor visual
                            </Button>
                          </div>
                        )}
                      />
                    )}
                  </>
                ) : (
                  <div className="h-32 bg-muted animate-pulse rounded-md" />
                )}
                {errors.content && <p className="text-sm text-destructive mt-1">{errors.content.message}</p>}
              </div>
            </>
          )}

          {publicationType === 'pdf' && (
            <div>
              <Label htmlFor="pdfFile" className="font-medium">PDF File (Optional: leave empty to keep existing)</Label>
              <div className="mt-1 flex justify-center rounded-lg border border-dashed border-input px-6 py-10">
                <div className="text-center">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <label htmlFor="pdfFile" className="relative cursor-pointer rounded-md bg-background font-semibold text-primary focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 hover:text-primary/80">
                    <span>Upload a new PDF</span>
                    <input id="pdfFile" {...register('pdfFile')} type="file" className="sr-only" accept="application/pdf" />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                  <p className="text-xs leading-5 text-gray-600">PDF up to 25MB</p>
                </div>
              </div>
              {errors.pdfFile && <p className="text-sm text-destructive mt-1">{errors.pdfFile.message}</p>}
            </div>
          )}

          {publicationType === 'sequence' && (
            <div className="space-y-4">
              <Label className="font-medium">Story Sections</Label>
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-start gap-4 p-4 border rounded-lg relative">
                   <div className="flex-1 space-y-2">
                      <Label htmlFor={`sections.${index}.image`}>Section Image</Label>
                      <Input id={`sections.${index}.image`} {...register(`sections.${index}.image`)} type="file" accept="image/*" />
                      {errors.sections?.[index]?.image && <p className="text-sm text-destructive mt-1">{errors.sections[index].image?.message}</p>}
                      
                      <Label htmlFor={`sections.${index}.text`}>Section Text</Label>
                      <Textarea id={`sections.${index}.text`} {...register(`sections.${index}.text`)} placeholder="Describe the image or tell part of the story..."/>
                      {errors.sections?.[index]?.text && <p className="text-sm text-destructive mt-1">{errors.sections[index].text?.message}</p>}
                   </div>
                   <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="absolute top-2 right-2">
                      <Trash2 className="h-4 w-4 text-destructive" />
                   </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => append({ image: new DataTransfer().files, text: '' })}
                className="w-full"
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Add Section
              </Button>
              {errors.sections && !Array.isArray(errors.sections) && <p className="text-sm text-destructive mt-1">{errors.sections.message}</p>}
            </div>
          )}
          
          <div>
            <Label htmlFor="categoryId" className="font-medium">Category</Label>
             <Controller
                name="categoryId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || ""} defaultValue={article.categoryId}>
                    <SelectTrigger id="categoryId" className="mt-1" aria-invalid={errors.categoryId ? "true" : "false"}>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            {errors.categoryId && <p className="text-sm text-destructive mt-1">{errors.categoryId.message}</p>}
          </div>
          
          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  );
}

