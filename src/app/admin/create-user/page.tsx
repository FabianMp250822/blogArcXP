
'use client';

import { useEffect, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createUserAction, type CreateUserFormState } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle, CheckCircle, UserPlus } from 'lucide-react';
import type { UserProfile } from '@/types';
import { useAuth } from '@/hooks/use-auth'; // Import useAuth

const FormSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters long.'),
  displayName: z.string().optional(),
  role: z.enum(['journalist', 'user', 'admin']).default('journalist'),
});

type FormValues = z.infer<typeof FormSchema>;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {pending ? 'Creating User...' : 'Create User'}
    </Button>
  );
}

export default function CreateUserPage() {
  const { toast } = useToast();
  const { user } = useAuth(); // Get current admin user from useAuth

  const { control, register, handleSubmit, formState: { errors }, reset } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      email: '',
      password: '',
      displayName: '',
      role: 'journalist',
    },
  });

  const initialState: CreateUserFormState = { message: '', success: false, errors: {} };
  const [state, formAction] = useActionState(createUserAction, initialState);

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
    } else if (state.message && !state.success && (state.errors || state.message !== '')) {
       toast({
        title: 'Error Creating User',
        description: state.message || 'Failed to create user. Please check the form.',
        variant: 'destructive',
        icon: <AlertTriangle className="h-5 w-5" />,
      });
    }
  }, [state, toast, reset]);
  
  const onSubmit = async (data: FormValues) => { // Make onSubmit async
    if (!user) {
      toast({ title: 'Authentication Error', description: 'Admin not authenticated.', variant: 'destructive'});
      return;
    }
    try {
      const idToken = await user.getIdToken(); // Get ID token from current admin
      const formData = new FormData();
      formData.append('email', data.email);
      formData.append('password', data.password);
      if (data.displayName) {
        formData.append('displayName', data.displayName);
      }
      formData.append('role', data.role);
      formData.append('idToken', idToken); // Add admin's ID token
      formAction(formData);
    } catch (error) {
      console.error("Error getting admin ID token:", error);
      toast({ title: 'Authentication Error', description: 'Could not verify admin session.', variant: 'destructive'});
    }
  };

  return (
    <Card className="w-full max-w-xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-headline text-primary flex items-center">
         <UserPlus className="mr-3 h-8 w-8" /> Create New User
        </CardTitle>
        <CardDescription>
          Create a new user account. The user will be created in Firebase Authentication, 
          a custom claim for their role will be set, and a profile will be created in Firestore.
        </CardDescription>
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
            <Label htmlFor="email" className="font-medium">User Email</Label>
            <Input 
              id="email" 
              type="email"
              {...register('email')} 
              aria-invalid={errors.email ? "true" : "false"} 
              className="mt-1"
              placeholder="e.g., journalist@example.com"
            />
            {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
          </div>
          
          <div>
            <Label htmlFor="password" className="font-medium">Password</Label>
            <Input 
              id="password" 
              type="password"
              {...register('password')} 
              aria-invalid={errors.password ? "true" : "false"} 
              className="mt-1"
              placeholder="Min. 8 characters"
            />
            {errors.password && <p className="text-sm text-destructive mt-1">{errors.password.message}</p>}
          </div>

          <div>
            <Label htmlFor="displayName" className="font-medium">Display Name (Optional)</Label>
            <Input 
              id="displayName" 
              type="text"
              {...register('displayName')} 
              aria-invalid={errors.displayName ? "true" : "false"} 
              className="mt-1"
              placeholder="e.g., Jane Doe"
            />
            {errors.displayName && <p className="text-sm text-destructive mt-1">{errors.displayName.message}</p>}
          </div>

          <div>
            <Label htmlFor="role" className="font-medium">Role</Label>
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value as UserProfile['role']}>
                  <SelectTrigger id="role" className="mt-1" aria-invalid={errors.role ? "true" : "false"}>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="journalist">Journalist</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin (Use with caution)</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.role && <p className="text-sm text-destructive mt-1">{errors.role.message}</p>}
            <p className="text-xs text-muted-foreground mt-1">
              The 'journalist' role will typically be used.
            </p>
          </div>
          
          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  );
}
