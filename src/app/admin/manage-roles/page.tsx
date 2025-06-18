
'use client';

import { useEffect, useActionState } from 'react'; 
import { useFormStatus } from 'react-dom'; 
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { manageUserRoleAction, type ManageUserRoleFormState } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import type { UserProfile } from '@/types';
import { useAuth } from '@/hooks/use-auth'; // Import useAuth

const FormSchema = z.object({
  userEmail: z.string().email('Please enter a valid email address.'),
  newRole: z.enum(['user', 'journalist', 'admin'], {
    required_error: 'Please select a role.',
  }),
});

type FormValues = z.infer<typeof FormSchema>;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {pending ? 'Updating Role...' : 'Update User Role'}
    </Button>
  );
}

export default function ManageUserRolesPage() {
  const { toast } = useToast();
  const { user } = useAuth(); // Get current admin user

  const { control, register, handleSubmit, formState: { errors }, reset } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      userEmail: '',
      newRole: 'user',
    },
  });

  const initialState: ManageUserRoleFormState = { message: '', success: false, errors: {} };
  const [state, formAction] = useActionState(manageUserRoleAction, initialState); 

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
        title: 'Error',
        description: state.message || 'Failed to update role. Please check the form.',
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
      const idToken = await user.getIdToken(); // Get admin's ID token
      const formData = new FormData();
      formData.append('userEmail', data.userEmail);
      formData.append('newRole', data.newRole);
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
        <CardTitle className="text-3xl font-headline text-primary">Manage User Roles</CardTitle>
        <CardDescription>Assign or update roles for users in the system. Changes will update Firestore profiles and Firebase Auth custom claims.</CardDescription>
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
            <Label htmlFor="userEmail" className="font-medium">User Email</Label>
            <Input 
              id="userEmail" 
              type="email"
              {...register('userEmail')} 
              aria-invalid={errors.userEmail ? "true" : "false"} 
              className="mt-1"
              placeholder="Enter email of existing user"
            />
            {errors.userEmail && <p className="text-sm text-destructive mt-1">{errors.userEmail.message}</p>}
          </div>

          <div>
            <Label htmlFor="newRole" className="font-medium">New Role</Label>
            <Controller
              name="newRole"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value as UserProfile['role']}>
                  <SelectTrigger id="newRole" className="mt-1" aria-invalid={errors.newRole ? "true" : "false"}>
                    <SelectValue placeholder="Select new role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="journalist">Journalist</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.newRole && <p className="text-sm text-destructive mt-1">{errors.newRole.message}</p>}
          </div>
          
          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  );
}
