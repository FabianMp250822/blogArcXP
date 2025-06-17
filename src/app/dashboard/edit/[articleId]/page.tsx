
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
// import { useFormState } from 'react-dom';
// import { useForm, Controller } from 'react-hook-form';
// import { zodResolver } from '@hookform/resolvers/zod';
// import { z } from 'zod';
// import { updateArticleAction, type UpdateDashboardArticleFormState } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { getArticleById, getAllCategories } from '@/lib/firebase/firestore';
import type { Article, Category } from '@/types';
import { Loader2, UploadCloud } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/hooks/use-auth';

// Placeholder: Zod schema and form values would be similar to create page
// const FormSchema = z.object({ ... });
// type FormValues = z.infer<typeof FormSchema>;

export default function EditDashboardArticlePage() {
  const { toast } = useToast();
  const { user, role } = useAuth();
  const params = useParams();
  const router = useRouter();
  const articleId = params.articleId as string;

  const [article, setArticle] = useState<Article | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Placeholder for form state and actions
  // const initialState: UpdateDashboardArticleFormState = { message: '', success: false };
  // const [state, formAction] = useFormState(updateArticleAction, initialState);

  // Placeholder for react-hook-form
  // const { control, register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<FormValues>({ ... });

  useEffect(() => {
    async function fetchData() {
      if (!articleId) return;
      setLoading(true);
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

        // Authorization check
        if (role !== 'admin' && fetchedArticle.authorId !== user?.uid) {
           toast({ title: 'Unauthorized', description: 'You do not have permission to edit this article.', variant: 'destructive' });
           router.push('/dashboard');
           return;
        }
        
        setArticle(fetchedArticle);
        setCategories(fetchedCategories);
        setImagePreview(fetchedArticle.coverImageUrl);
        
        // Placeholder: setValue for form fields
        // setValue('title', fetchedArticle.title);
        // ... other fields

      } catch (error) {
        toast({ title: 'Error fetching data', description: 'Could not load article or categories.', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    }
    if (user && role) fetchData();
  }, [articleId, toast, router, user, role]);

  // Placeholder for effects related to form submission state and image preview

  const onSubmit = (data: any /* FormValues */) => {
    // Placeholder: Call formAction
    // const formData = new FormData(); ...
    // formData.append('articleId', articleId);
    // formAction(formData);
    toast({ title: 'Note', description: 'Edit functionality is a placeholder.', variant: 'default' });
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-[300px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!article) {
    return <div className="text-center py-10">Article not loaded or not found.</div>;
  }

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-headline text-primary">Edit Article</CardTitle>
        <CardDescription>Update the details of your article. Current status: <span className="font-semibold">{article.status}</span></CardDescription>
      </CardHeader>
      <CardContent>
        {/* <form onSubmit={handleSubmit(onSubmit)} className="space-y-6"> */}
        <form onSubmit={(e) => { e.preventDefault(); onSubmit({}); }} className="space-y-6">
          {/* Placeholder: Form fields similar to create page, pre-filled with article data */}
          <div>
            <Label htmlFor="title" className="font-medium">Title</Label>
            <Input id="title" defaultValue={article.title} className="mt-1"/>
            {/* {errors.title && <p className="text-sm text-destructive mt-1">{errors.title.message}</p>} */}
          </div>

          <div>
            <Label htmlFor="excerpt" className="font-medium">Excerpt</Label>
            <Textarea id="excerpt" defaultValue={article.excerpt} className="mt-1" rows={3}/>
            {/* {errors.excerpt && <p className="text-sm text-destructive mt-1">{errors.excerpt.message}</p>} */}
          </div>

          <div>
            <Label htmlFor="content" className="font-medium">Content (Markdown)</Label>
            <Textarea id="content" defaultValue={article.content} className="mt-1" rows={10}/>
            {/* {errors.content && <p className="text-sm text-destructive mt-1">{errors.content.message}</p>} */}
          </div>
          
          <div>
            <Label htmlFor="categoryId" className="font-medium">Category</Label>
            <Select defaultValue={article.categoryId}>
              <SelectTrigger id="categoryId" className="mt-1">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* {errors.categoryId && <p className="text-sm text-destructive mt-1">{errors.categoryId.message}</p>} */}
          </div>
          
          <div>
            <Label htmlFor="coverImage" className="font-medium">Cover Image</Label>
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
                    <span>Change image</span>
                    <input id="coverImage" type="file" className="sr-only" accept="image/*" />
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 5MB</p>
              </div>
            </div>
            {/* {errors.coverImage && <p className="text-sm text-destructive mt-1">{errors.coverImage.message}</p>} */}
          </div>
          
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
            Save Changes (Placeholder)
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
