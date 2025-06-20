'use client';

import { useEffect, useActionState, useTransition } from 'react';
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
import { useAuth } from '@/hooks/use-auth';

// El esquema debe coincidir con el del backend, pero sin el idToken
const FormSchema = z.object({
  email: z.string().email('Por favor, introduce un correo electrónico válido.'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
  displayName: z.string().optional(),
  role: z.enum(['journalist', 'user', 'admin']).default('journalist'),
});

type FormValues = z.infer<typeof FormSchema>;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {pending ? 'Creando Usuario...' : 'Crear Usuario'}
    </Button>
  );
}

export default function CreateUserPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [_isActionPending, startActionTransition] = useTransition();

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
        title: '¡Éxito!',
        description: (
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 mr-2" />
            <span>{state.message}</span>
          </div>
        ),
        className: 'bg-green-500 text-white border-green-600',
      });
      reset();
    } else if (state.message && !state.success && (state.errors || state.message !== '')) {
      toast({
        variant: 'destructive',
        title: 'Error al Crear Usuario',
        description: (
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <span>{state.message || 'No se pudo crear el usuario. Revisa el formulario.'}</span>
          </div>
        ),
      });
    }
  }, [state, toast, reset]);

  const onSubmit = async (data: FormValues) => {
    if (!user) {
      toast({ title: 'Error de Autenticación', description: 'Administrador no autenticado.', variant: 'destructive'});
      return;
    }
    try {
      const idToken = await user.getIdToken();
      const formData = new FormData();
      formData.append('email', data.email);
      formData.append('password', data.password);
      if (data.displayName) {
        formData.append('displayName', data.displayName);
      }
      formData.append('role', data.role);
      formData.append('idToken', idToken);

      startActionTransition(() => {
        formAction(formData);
      });
    } catch (error) {
      console.error("Error obteniendo el token del admin:", error);
      toast({ title: 'Error de Autenticación', description: 'No se pudo verificar la sesión del administrador.', variant: 'destructive'});
    }
  };

  return (
    <Card className="w-full max-w-xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-headline text-primary flex items-center">
         <UserPlus className="mr-3 h-8 w-8" /> Crear Nuevo Usuario
        </CardTitle>
        <CardDescription>
          Crea una nueva cuenta de usuario. El usuario se creará en Firebase Auth, se le asignará un rol y se creará un perfil en Firestore.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {state.errors?._form && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error en el Formulario</AlertTitle>
              <AlertDescription>{state.errors._form.join(', ')}</AlertDescription>
            </Alert>
          )}

          <div>
            <Label htmlFor="email" className="font-medium">Correo Electrónico del Usuario</Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              aria-invalid={errors.email ? "true" : "false"}
              className="mt-1"
              placeholder="ej., periodista@ejemplo.com"
            />
            {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <Label htmlFor="password" className="font-medium">Contraseña</Label>
            <Input
              id="password"
              type="password"
              {...register('password')}
              aria-invalid={errors.password ? "true" : "false"}
              className="mt-1"
              placeholder="Mínimo 8 caracteres"
            />
            {errors.password && <p className="text-sm text-destructive mt-1">{errors.password.message}</p>}
          </div>

          <div>
            <Label htmlFor="displayName" className="font-medium">Nombre a Mostrar (Opcional)</Label>
            <Input
              id="displayName"
              type="text"
              {...register('displayName')}
              aria-invalid={errors.displayName ? "true" : "false"}
              className="mt-1"
              placeholder="ej., Juan Pérez"
            />
            {errors.displayName && <p className="text-sm text-destructive mt-1">{errors.displayName.message}</p>}
          </div>

          <div>
            <Label htmlFor="role" className="font-medium">Rol</Label>
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value as UserProfile['role']}>
                  <SelectTrigger id="role" className="mt-1" aria-invalid={errors.role ? "true" : "false"}>
                    <SelectValue placeholder="Seleccionar rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="journalist">Periodista (Journalist)</SelectItem>
                    <SelectItem value="user">Usuario (User)</SelectItem>
                    <SelectItem value="admin">Administrador (Admin)</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.role && <p className="text-sm text-destructive mt-1">{errors.role.message}</p>}
            <p className="text-xs text-muted-foreground mt-1">
              El rol 'Periodista' será el más utilizado.
            </p>
          </div>

          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  );
}
