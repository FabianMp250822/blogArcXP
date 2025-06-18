
'use client';

import { useEffect, useState, useActionState } from 'react'; // Changed
import { useFormStatus } from 'react-dom'; // useFormStatus is still from react-dom
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createCategoryAction, type CreateCategoryFormState } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { getAllCategories } from '@/lib/firebase/firestore';
import type { Category } from '@/types';
import { Loader2, AlertTriangle, CheckCircle, ListChecks } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

const FormSchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters long.'),
});
type FormValues = z.infer<typeof FormSchema>;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {pending ? 'Creating Category...' : 'Create Category'}
    </Button>
  );
}

export default function ManageCategoriesPage() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: { name: '' },
  });

  const initialState: CreateCategoryFormState = { message: '', success: false, errors: {} };
  const [state, formAction] = useActionState(createCategoryAction, initialState); // Changed

  const fetchCategories = async () => {
    setLoadingCategories(true);
    try {
      const fetchedCategories = await getAllCategories();
      setCategories(fetchedCategories);
    } catch (error) {
      toast({
        title: 'Error fetching categories',
        description: 'Could not load existing categories.',
        variant: 'destructive',
      });
    } finally {
      setLoadingCategories(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [toast]); // Removed fetchCategories from dependency array to avoid loop with toast

  useEffect(() => {
    if (state.success) {
      toast({
        title: 'Success!',
        description: state.message,
        variant: 'default',
        className: 'bg-green-500 text-white',
        icon: <CheckCircle className="h-5 w-5 text-white" />,
      });
      reset(); 
      fetchCategories(); 
    } else if (state.message && !state.success && (state.errors || state.message !== '')) {
       toast({
        title: 'Error',
        description: state.message || 'Failed to create category.',
        variant: 'destructive',
        icon: <AlertTriangle className="h-5 w-5" />,
      });
    }
  }, [state, toast, reset]); // Added fetchCategories back, ensure it's stable or memoized if it causes issues
  
  const onSubmit = (data: FormValues) => {
    const formData = new FormData();
    formData.append('name', data.name);
    formAction(formData);
  };

  return (
    <div className="grid md:grid-cols-2 gap-8 items-start">
      <Card className="w-full shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-headline text-primary">Create New Category</CardTitle>
          <CardDescription>Add a new category for organizing articles.</CardDescription>
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
              <Label htmlFor="name" className="font-medium">Category Name</Label>
              <Input 
                id="name" 
                type="text"
                {...register('name')} 
                aria-invalid={errors.name ? "true" : "false"} 
                className="mt-1"
                placeholder="e.g., Technology, Sports"
              />
              {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
            </div>
            
            <SubmitButton />
          </form>
        </CardContent>
      </Card>

      <Card className="w-full shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-primary flex items-center">
            <ListChecks className="mr-2 h-6 w-6"/> Existing Categories
          </CardTitle>
          <CardDescription>List of all current categories.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingCategories ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : categories.length === 0 ? (
            <p className="text-muted-foreground text-center">No categories created yet.</p>
          ) : (
            <ScrollArea className="h-72">
              <ul className="space-y-2">
                {categories.map(category => (
                  <li key={category.id} className="p-3 bg-muted rounded-md">
                    <span className="font-medium">{category.name}</span>
                    <Badge variant="outline" className="ml-2 text-xs">{category.slug}</Badge>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </CardContent>
         <CardFooter>
          <p className="text-xs text-muted-foreground">
            Categories help users find relevant content.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

    