'use client';

import { useEffect, useState, useActionState, useTransition } from 'react'; 
import { useFormStatus } from 'react-dom'; 
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
// --- CORRECCIÓN: Importa todas las acciones necesarias ---
import { createCategoryAction, updateCategoryAction, deleteCategoryAction, type CreateCategoryFormState } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { getAllCategories } from '@/lib/firebase/firestore';
import type { Category } from '@/types';
import { Loader2, AlertTriangle, CheckCircle, ListChecks, Pencil, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth'; 
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from '@/components/ui/dialog';

const FormSchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters long.'),
});
type FormValues = z.infer<typeof FormSchema>;

function SubmitButton({ text, pendingText }: { text: string, pendingText: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {pending ? pendingText : text}
    </Button>
  );
}

// --- AÑADE ESTE NUEVO COMPONENTE ---
function DeleteSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Sí, Eliminar
    </Button>
  );
}


export default function ManageCategoriesPage() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  // --- AÑADE ESTA LÍNEA ---
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: { name: '' },
  });

  // --- Hooks de acción para cada formulario ---
  const [createState, createFormAction] = useActionState(createCategoryAction, { message: '', success: false });
  const [updateState, updateFormAction] = useActionState(updateCategoryAction, { message: '', success: false });
  const [deleteState, deleteFormAction] = useActionState(deleteCategoryAction, { message: '', success: false });

  // Función para recargar las categorías desde Firestore
  const fetchCategories = async () => {
    setLoadingCategories(true);
    try {
      const fetchedCategories = await getAllCategories();
      setCategories(fetchedCategories);
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudieron cargar las categorías.', variant: 'destructive' });
    } finally {
      setLoadingCategories(false);
    }
  };

  // Carga inicial
  useEffect(() => {
    fetchCategories();
  }, []);

  // --- ¡ESTA ES LA MAGIA! ---
  // Este efecto se ejecuta cada vez que el estado de la acción de eliminar cambia.
  useEffect(() => {
    if (deleteState.message) {
      toast({
        title: deleteState.success ? 'Éxito' : 'Error',
        description: deleteState.message,
        variant: deleteState.success ? 'default' : 'destructive'
      });
      // Si la acción fue exitosa...
      if (deleteState.success) {
        setDeletingCategory(null); // Cierra el diálogo
        fetchCategories(); // ¡Vuelve a cargar los datos para actualizar la lista!
      }
    }
  }, [deleteState, toast]); // Dependencias del efecto

  // --- Efectos para mostrar notificaciones (toasts) ---
  useEffect(() => {
    if (createState.message) {
      toast({ title: createState.success ? 'Success!' : 'Error', description: createState.message, variant: createState.success ? 'default' : 'destructive' });
      if (createState.success) { reset(); fetchCategories(); }
    }
  }, [createState]);

  useEffect(() => {
    if (updateState.message) {
      toast({ title: updateState.success ? 'Success!' : 'Error', description: updateState.message, variant: updateState.success ? 'default' : 'destructive' });
      if (updateState.success) { setEditingCategory(null); fetchCategories(); }
    }
  }, [updateState]);

  // --- AÑADE ESTA FUNCIÓN ---
  // Esta función se ejecuta cuando el formulario de creación es válido.
  // Prepara los datos y llama a la Server Action.
  const onCreateSubmit = (data: FormValues) => { 
    const formData = new FormData();
    formData.append('name', data.name);
    // Inicia la transición para la acción del servidor
    startActionTransition(() => createFormAction(formData));
  };

  return (
    <div className="grid md:grid-cols-2 gap-8 items-start p-4">
      <Card className="w-full shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Create New Category</CardTitle>
          <CardDescription>Add a new category for organizing articles.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="name">Category Name</Label>
              <Input id="name" {...register('name')} placeholder="e.g., Technology, Sports" />
              {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
            </div>
            <SubmitButton text="Create Category" pendingText="Creating..." />
          </form>
        </CardContent>
      </Card>

      <Card className="w-full shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center"><ListChecks className="mr-2"/> Existing Categories</CardTitle>
          <CardDescription>Manage all current categories.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingCategories ? (
            <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : (
            <ScrollArea className="h-72 pr-4">
              <ul className="space-y-2">
                {categories.map(category => (
                  <li key={category.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <span className="font-medium">{category.name}</span>
                      <Badge variant="secondary" className="ml-2">{category.slug}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => setEditingCategory(category)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeletingCategory(category)} disabled={category.slug === 'general'}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Diálogo para Editar Categoría */}
      <Dialog open={!!editingCategory} onOpenChange={() => setEditingCategory(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Categoría</DialogTitle></DialogHeader>
          <form action={updateFormAction}>
            {/* --- CORRECCIÓN: Enviamos el ID en lugar del slug --- */}
            <input type="hidden" name="id" value={editingCategory?.id || ''} />
            
            <div className="py-4 space-y-4">
              {/* --- NUEVO: Mostramos el slug para mayor claridad --- */}
              <div>
                <Label>Slug (no se puede cambiar)</Label>
                <p className="text-sm font-mono p-2 bg-muted rounded-md mt-1">
                  {editingCategory?.slug}
                </p>
              </div>

              <div>
                <Label htmlFor="name">Nuevo Nombre de la Categoría</Label>
                <Input id="name" name="name" defaultValue={editingCategory?.name || ''} required />
              </div>
            </div>

            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="secondary">Cancelar</Button></DialogClose>
              <SubmitButton text="Guardar Cambios" pendingText="Guardando..." />
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Diálogo para Eliminar Categoría */}
      <Dialog open={!!deletingCategory} onOpenChange={() => setDeletingCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Estás seguro?</DialogTitle>
            <DialogDescription>
              Esto eliminará la categoría "{deletingCategory?.name}". Los artículos serán movidos a "General". Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <form action={deleteFormAction}>
            <input type="hidden" name="slug" value={deletingCategory?.slug || ''} />
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="secondary">Cancelar</Button></DialogClose>
              <DeleteSubmitButton />
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
