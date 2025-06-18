
'use client';

import { useEffect, useState, useActionState, useTransition } from 'react'; 
import { useParams, useRouter } from 'next/navigation';
import { useFormStatus } from 'react-dom'; 
import { useForm, Controller } from 'react-hook-form';
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
import { Loader2, UploadCloud, AlertTriangle, CheckCircle } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/hooks/use-auth';

const FormSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters long.'),
  excerpt: z.string().min(10, 'Excerpt must be at least 10 characters.').max(300, 'Max 300 characters.'),
  content: z.string().min(50, 'Content must be at least 50 characters long.'),
  categoryId: z.string().min(1, 'Category is required.'),
  coverImage: z.instanceof(FileList).optional() 
    .refine(files => !files || files.length === 0 || files?.[0]?.size <= 5 * 1024 * 1024, 'Cover image must be less than 5MB.')
    .refine(files => !files || files.length === 0 || files?.[0]?.type.startsWith('image/'), 'Only image files are allowed.'),
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

  const [article, setArticle] = useState<Article | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [_isActionPending, startActionTransition] = useTransition();


  const { control, register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
        title: '',
        excerpt: '',
        content: '',
        categoryId: '',
    }
  });

  const initialState: UpdateArticleFormState = { message: '', success: false, errors: {} };
  const [state, formAction] = useActionState(updateArticleAction, initialState); 

  const coverImageFile = watch('coverImage');

  useEffect(() => {
    if (coverImageFile && coverImageFile.length > 0) {
      const file = coverImageFile[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => setImagePreview(reader.result as string);
        reader.readAsDataURL(file);
      }
    } else if (article && !coverImageFile?.length) {
      setImagePreview(article.coverImageUrl || null);
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
        
        setValue('title', fetchedArticle.title);
        setValue('excerpt', fetchedArticle.excerpt);
        setValue('content', fetchedArticle.content);
        setValue('categoryId', fetchedArticle.categoryId);
        setImagePreview(fetchedArticle.coverImageUrl);

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
        className: 'bg-green-500 text-white',
        icon: <CheckCircle className="h-5 w-5" />
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
        variant: 'destructive',
        icon: <AlertTriangle className="h-5 w-5" />,
      });
    }
  }, [state, toast, router]);

  const onSubmit = (data: FormValues) => {
    const formData = new FormData();
    formData.append('articleId', articleId);
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'coverImage' && value instanceof FileList && value.length > 0) {
        formData.append(key, value[0]);
      } else if (typeof value === 'string' && value.trim() !== '') { 
        formData.append(key, value);
      }
    });
    startActionTransition(() => {
      formAction(formData);
    });
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
            <Label htmlFor="title" className="font-medium">Title</Label>
            <Input id="title" {...register('title')} aria-invalid={errors.title ? "true" : "false"} className="mt-1"/>
            {errors.title && <p className="text-sm text-destructive mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <Label htmlFor="excerpt" className="font-medium">Excerpt</Label>
            <Textarea id="excerpt" {...register('excerpt')} aria-invalid={errors.excerpt ? "true" : "false"} className="mt-1" rows={3}/>
            {errors.excerpt && <p className="text-sm text-destructive mt-1">{errors.excerpt.message}</p>}
          </div>

          <div>
            <Label htmlFor="content" className="font-medium">Content (Markdown)</Label>
            <Textarea id="content" {...register('content')} aria-invalid={errors.content ? "true" : "false"} className="mt-1" rows={10}/>
            {errors.content && <p className="text-sm text-destructive mt-1">{errors.content.message}</p>}
          </div>
          
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
          
          <div>
            <Label htmlFor="coverImage" className="font-medium">Cover Image (Optional: leave empty to keep existing)</Label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md border-input hover:border-primary transition-colors">
              <div className="space-y-1 text-center">
                {imagePreview ? (
                   <div className="relative w-full h-48 mb-2">
                     <Image src={imagePreview} alt="Cover image preview" layout="fill" objectFit="contain" />
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
          
          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  );
}
    
