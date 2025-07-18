'use client';

import { useEffect, useActionState, useTransition } from 'react'; 
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
import { useAuth } from '@/hooks/use-auth'; 

const FormSchema = z.object({
  userEmail: z.string().email('Por favor, introduce un correo electrónico válido.'),
  newRole: z.enum(['user', 'journalist', 'admin'], {
    required_error: 'Por favor, selecciona un rol.',
  }),
});

type FormValues = z.infer<typeof FormSchema>;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {pending ? 'Actualizando rol...' : 'Actualizar rol de usuario'}
    </Button>
  );
}

export default function ManageUserRolesPage() {
  const { toast } = useToast();
  const { user } = useAuth(); 
  const [_isActionPending, startActionTransition] = useTransition();


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
        title: '¡Éxito!',
        description: state.message,
        variant: 'default',
        className: 'bg-green-500 text-white',
        icon: <CheckCircle className="h-5 w-5 text-white" />,
      });
      reset(); 
    } else if (state.message && !state.success && (state.errors || state.message !== '')) {
       toast({
        title: 'Error',
        description: state.message || 'No se pudo actualizar el rol. Por favor revisa el formulario.',
        variant: 'destructive',
        icon: <AlertTriangle className="h-5 w-5" />,
      });
    }
  }, [state, toast, reset]);
  
  const onSubmit = async (data: FormValues) => { 
    if (!user) {
      toast({ title: 'Authentication Error', description: 'Admin not authenticated.', variant: 'destructive'});
      return;
    }
    try {
      const idToken = await user.getIdToken(); 
      const formData = new FormData();
      formData.append('userEmail', data.userEmail);
      formData.append('newRole', data.newRole);
      formData.append('idToken', idToken); 
      
      startActionTransition(() => {
        formAction(formData);
      });
    } catch (error) {
      console.error("Error getting admin ID token:", error);
      toast({ title: 'Authentication Error', description: 'Could not verify admin session.', variant: 'destructive'});
    }
  };

  return (
    <Card className="w-full max-w-xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-headline text-primary">Gestionar Roles de Usuario</CardTitle>
        <CardDescription>Asigna o actualiza roles para los usuarios del sistema. Los cambios actualizarán los perfiles en Firestore y los claims personalizados en Firebase Auth.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {state.message && !state.success && state.errors?._form && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error en el formulario</AlertTitle>
              <AlertDescription>{state.errors._form.join(', ')}</AlertDescription>
            </Alert>
          )}

          <div>
            <Label htmlFor="userEmail" className="font-medium">Correo electrónico del usuario</Label>
            <Input 
              id="userEmail" 
              type="email"
              {...register('userEmail')} 
              aria-invalid={errors.userEmail ? "true" : "false"} 
              className="mt-1"
              placeholder="Introduce el correo del usuario existente"
            />
            {errors.userEmail && <p className="text-sm text-destructive mt-1">{errors.userEmail.message}</p>}
          </div>

          <div>
            <Label htmlFor="newRole" className="font-medium">Nuevo rol</Label>
            <Controller
              name="newRole"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value as UserProfile['role']}>
                  <SelectTrigger id="newRole" className="mt-1" aria-invalid={errors.newRole ? "true" : "false"}>
                    <SelectValue placeholder="Selecciona el nuevo rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuario</SelectItem>
                    <SelectItem value="journalist">Periodista</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
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