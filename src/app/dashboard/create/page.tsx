
'use client';

import { useEffect, useState, useActionState } from 'react'; 
import { useFormStatus } from 'react-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createArticleAction, type CreateDashboardArticleFormState } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { getAllCategories } from '@/lib/firebase/firestore'; 
import type { Category } from '@/types'; 
import { Loader2, UploadCloud, PlusCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/hooks/use-auth'; 

const CREATE_NEW_CATEGORY_VALUE = '__CREATE_NEW__';

const FormSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters long.'),
  excerpt: z.string().min(10, 'Excerpt must be at least 10 characters.').max(300, 'Max 300 characters.'),
  content: z.string().min(50, 'Content must be at least 50 characters long.'),
  categoryId: z.string().min(1, 'Category selection or creation is required.'),
  newCategoryName: z.string().optional(),
  coverImage: z.instanceof(FileList)
    .refine(files => files?.length === 1, 'Cover image is required.')
    .refine(files => files?.[0]?.size <= 5 * 1024 * 1024, 'Cover image must be less than 5MB.')
    .refine(files => files?.[0]?.type.startsWith('image/'), 'Only image files are allowed.'),
}).superRefine((data, ctx) => {
  if (data.categoryId === CREATE_NEW_CATEGORY_VALUE && (!data.newCategoryName || data.newCategoryName.trim().length < 2)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'New category name must be at least 2 characters.',
      path: ['newCategoryName'],
    });
  }
});

type FormValues = z.infer<typeof FormSchema>;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {pending ? 'Saving Article...' : 'Save Article as Draft'}
    </Button>
  );
}

export default function CreateDashboardArticlePage() {
  const { toast } = useToast();
  const { user } = useAuth(); 
  const [categories, setCategories] = useState<Category[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);

  const { control, register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      title: '',
      excerpt: '',
      content: '',
      categoryId: '',
      newCategoryName: '',
    },
  });

  const initialState: CreateDashboardArticleFormState = { message: '', success: false, errors: {} };
  const [state, formAction] = useActionState(createArticleAction, initialState);

  const coverImageFile = watch('coverImage');
  const selectedCategoryId = watch('categoryId');

  useEffect(() => {
    if (selectedCategoryId === CREATE_NEW_CATEGORY_VALUE) {
      setShowNewCategoryInput(true);
    } else {
      setShowNewCategoryInput(false);
      setValue('newCategoryName', ''); 
    }
  }, [selectedCategoryId, setValue]);

  useEffect(() => {
    if (coverImageFile && coverImageFile.length > 0) {
      const file = coverImageFile[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    } else {
      setImagePreview(null);
    }
  }, [coverImageFile]);

  const fetchInitialData = async () => {
    try {
      const fetchedCategories = await getAllCategories();
      setCategories(fetchedCategories);
    } catch (error) {
      toast({
        title: 'Error fetching categories',
        description: 'Could not load categories.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, [toast]);

  useEffect(() => {
    if (!state) return;
    if (state.success) {
      toast({
        title: 'Success!',
        description: state.message,
        variant: 'default',
        className: 'bg-green-500 text-white',
        icon: <CheckCircle className="h-5 w-5 text-white" />,
      });
      reset(); 
      setImagePreview(null);
      setShowNewCategoryInput(false);
      fetchInitialData(); 
    } else if (state.message && !state.success && (state.errors || state.message !== '')) {
       toast({
        title: 'Error Creating Article',
        description: state.message || state.errors?._form?.join(', ') || 'Failed to create article. Please check the form.',
        variant: 'destructive',
        icon: <AlertTriangle className="h-5 w-5" />,
      });
    }
  }, [state, toast, reset]);
  
  const onSubmit = async (data: FormValues) => { // Make onSubmit async
    if (!user?.uid) {
      toast({ title: 'Authentication Error', description: 'You must be logged in to create an article.', variant: 'destructive'});
      return;
    }
    try {
      const idToken = await user.getIdToken(); // Get ID token
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (key === 'coverImage' && value instanceof FileList && value.length > 0) {
          formData.append(key, value[0]);
        } else if (value !== undefined && value !== null && key !== 'newCategoryName') {
          formData.append(key, String(value));
        }
      });
      if (data.categoryId === CREATE_NEW_CATEGORY_VALUE && data.newCategoryName) {
          formData.append('newCategoryName', data.newCategoryName);
      }
      formData.append('authorId', user.uid); 
      formData.append('idToken', idToken); // Add ID token to form data
      formAction(formData);
    } catch (error) {
      console.error("Error getting ID token:", error);
      toast({ title: 'Authentication Error', description: 'Could not verify your session. Please try again.', variant: 'destructive'});
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-headline text-primary">Create New Article</CardTitle>
        <CardDescription>Articles will be saved as 'draft' by default.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {state?.errors?._form && (
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
                <Select onValueChange={field.onChange} value={field.value || ""}>
                  <SelectTrigger id="categoryId" className="mt-1" aria-invalid={errors.categoryId ? "true" : "false"}>
                    <SelectValue placeholder="Select category or create new" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                    ))}
                    <SelectItem value={CREATE_NEW_CATEGORY_VALUE}>
                      <span className="flex items-center">
                        <PlusCircle className="mr-2 h-4 w-4 text-primary" /> Create new category...
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.categoryId && <p className="text-sm text-destructive mt-1">{errors.categoryId.message}</p>}
          </div>

          {showNewCategoryInput && (
            <div>
              <Label htmlFor="newCategoryName" className="font-medium">New Category Name</Label>
              <Input 
                id="newCategoryName" 
                {...register('newCategoryName')} 
                aria-invalid={errors.newCategoryName ? "true" : "false"} 
                className="mt-1"
                placeholder="Enter name for the new category"
              />
              {errors.newCategoryName && <p className="text-sm text-destructive mt-1">{errors.newCategoryName.message}</p>}
            </div>
          )}
          
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
                    <span>Upload a file</span>
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
