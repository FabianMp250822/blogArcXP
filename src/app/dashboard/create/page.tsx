'use client';

import { useEffect, useState, useActionState, useTransition } from 'react'; 
import { useFormStatus } from 'react-dom';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
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
import { Loader2, UploadCloud, PlusCircle, CheckCircle, AlertTriangle, FileText, ImagePlus, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/hooks/use-auth'; 
import { RichTextEditor } from '@/components/RichTextEditor';
import { SimpleTextEditor } from '@/components/SimpleTextEditor';
import { useClientOnly } from '@/hooks/use-client-only';

const CREATE_NEW_CATEGORY_VALUE = '__CREATE_NEW__';

// --- MODIFICADO: Esquema Zod dinámico ---
const FormSchema = z.object({
  publicationType: z.enum(['markdown', 'pdf', 'sequence']),
  title: z.string().min(5, 'El título debe tener al menos 5 caracteres.'),
  categoryId: z.string().min(1, 'Se requiere seleccionar o crear una categoría.'),
  newCategoryName: z.string().optional(),
  excerpt: z.string().optional(),
  content: z.string().optional(),
  // Validación de archivo portada: acepta FileList en frontend, pero valida que tenga al menos 1 archivo y sea imagen
  coverImage: z
    .custom<FileList>((v) => typeof FileList !== "undefined" ? v instanceof FileList : true, {
      message: "Se requiere una imagen de portada.",
    })
    .refine(files => files && files.length === 1, 'Se requiere una imagen de portada.')
    .refine(files => !files || files[0]?.size <= 5 * 1024 * 1024, 'La imagen de portada debe ser menor a 5MB.')
    .refine(files => !files || files[0]?.type.startsWith('image/'), 'Solo se permiten archivos de imagen.'),
  pdfFile: z
    .custom<FileList>((v) => typeof FileList !== "undefined" ? v instanceof FileList : true)
    .optional(),
  sections: z.array(z.object({
    image: z
      .custom<FileList>((v) => typeof FileList !== "undefined" ? v instanceof FileList : true)
      .refine(files => files && files.length === 1, 'Se requiere una imagen.'),
    text: z.string().min(10, 'El texto debe tener al menos 10 caracteres.'),
  })).optional(),
}).superRefine((data, ctx) => {
  if (data.categoryId === CREATE_NEW_CATEGORY_VALUE && (!data.newCategoryName || data.newCategoryName.trim().length < 2)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'El nombre de la nueva categoría debe tener al menos 2 caracteres.',
      path: ['newCategoryName'],
    });
  }
  switch (data.publicationType) {
    case 'markdown':
      if (!data.excerpt || data.excerpt.length < 10) ctx.addIssue({ code: 'custom', message: 'El extracto debe tener al menos 10 caracteres.', path: ['excerpt'] });
      if (data.excerpt && data.excerpt.length > 300) ctx.addIssue({ code: 'custom', message: 'Máximo 300 caracteres.', path: ['excerpt']});
      if (!data.content || data.content.length < 50) ctx.addIssue({ code: 'custom', message: 'El contenido debe tener al menos 50 caracteres.', path: ['content'] });
      break;
    case 'pdf':
      if (!data.pdfFile || data.pdfFile.length !== 1) ctx.addIssue({ code: 'custom', message: 'Se requiere un archivo PDF.', path: ['pdfFile'] });
      else if (data.pdfFile?.[0]?.size > 25 * 1024 * 1024) ctx.addIssue({ code: 'custom', message: 'El archivo PDF debe ser menor a 25MB.', path: ['pdfFile'] });
      else if (data.pdfFile?.[0]?.type !== 'application/pdf') ctx.addIssue({ code: 'custom', message: 'Solo se permiten archivos PDF.', path: ['pdfFile'] });
      break;
    case 'sequence':
      if (!data.sections || data.sections.length < 1) {
        ctx.addIssue({ code: 'custom', message: 'Se requiere al menos una sección.', path: ['sections'] });
      }
      data.sections?.forEach((section, index) => {
        if (!section.image || section.image.length !== 1) {
            ctx.addIssue({ code: 'custom', message: 'Se requiere una imagen para esta sección.', path: [`sections.${index}.image`] });
        }
        if (!section.text || section.text.length < 10) {
            ctx.addIssue({ code: 'custom', message: 'El texto debe tener al menos 10 caracteres.', path: [`sections.${index}.text`] });
        }
      });
      break;
  }
});

type FormValues = z.infer<typeof FormSchema>;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {pending ? 'Guardando Publicación...' : 'Guardar como Borrador'}
    </Button>
  );
}

export default function CreateDashboardArticlePage() {
  const { toast } = useToast();
  const { user } = useAuth(); 
  const [categories, setCategories] = useState<Category[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [_isActionPending, startActionTransition] = useTransition();
  const isClient = useClientOnly();
  const [useSimpleEditor, setUseSimpleEditor] = useState(false);

  const { control, register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      publicationType: 'markdown',
      title: '',
      excerpt: '',
      content: '',
      categoryId: '',
      newCategoryName: '',
      sections: [],
      pdfFile: undefined, // <-- Añade esto
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "sections"
  });

  const initialState: CreateDashboardArticleFormState = { message: '', success: false, errors: {} };
  const [state, formAction] = useActionState(createArticleAction, initialState);

  const coverImageFile = watch('coverImage');
  const selectedCategoryId = watch('categoryId');
  const publicationType = watch('publicationType');

  // Limpia el campo pdfFile si el tipo no es PDF
  useEffect(() => {
    if (publicationType !== 'pdf') {
      setValue('pdfFile', undefined);
    }
  }, [publicationType, setValue]);

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
        title: '¡Éxito!',
        description: state.message,
        variant: 'default',
        className: 'bg-green-500 text-white',
      });
      reset(); 
      setImagePreview(null);
      setShowNewCategoryInput(false);
      setValue('sections', []);
      fetchInitialData(); 
    } else if (state.message && !state.success && (state.errors || state.message !== '')) {
       toast({
        title: 'Error al Crear Publicación',
        description: state.message || Object.values(state.errors || {}).flat().join(', ') || 'Falló la creación. Por favor revisa el formulario.',
        variant: 'destructive',
      });
    }
  }, [state, toast, reset, setValue]);
  
  const onSubmit = async (data: FormValues) => { 
    if (!user?.uid) {
      toast({ title: 'Authentication Error', description: 'You must be logged in to create an article.', variant: 'destructive'});
      return;
    }
    try {
      const idToken = await user.getIdToken(); 
      const formData = new FormData();

      // Siempre agrega la imagen de portada si existe
      if (data.coverImage?.[0]) {
        formData.append('coverImage', data.coverImage[0]);
      }

      formData.append('publicationType', data.publicationType);
      formData.append('title', data.title);
      formData.append('categoryId', data.categoryId);
      if (data.categoryId === CREATE_NEW_CATEGORY_VALUE && data.newCategoryName) {
        formData.append('newCategoryName', data.newCategoryName);
      }

      if (typeof data.excerpt === 'string') {
        formData.append('excerpt', data.excerpt);
      } else {
        formData.append('excerpt', '');
      }
      if (typeof data.content === 'string') {
        formData.append('content', data.content);
      } else {
        formData.append('content', '');
      }

      // PDF
      if (data.pdfFile?.[0]) formData.append('pdfFile', data.pdfFile[0]);
      // Sequence
      if (data.sections) {
        data.sections.forEach((section, index) => {
          if (section.image?.[0]) {
            formData.append(`sections[${index}][image]`, section.image[0]);
          }
          formData.append(`sections[${index}][text]`, section.text);
        });
      }

      formData.append('authorId', user.uid); 
      formData.append('idToken', idToken); 

      // DEBUG: Verifica el contenido del FormData
      for (let pair of formData.entries()) {
        console.log('FormData:', pair[0], pair[1]);
      }

      startActionTransition(() => {
        formAction(formData);
      });
    } catch (error) {
      console.error("Error getting ID token:", error);
      toast({ title: 'Authentication Error', description: 'Could not verify your session. Please try again.', variant: 'destructive'});
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-headline text-primary">Crear Nueva Publicación</CardTitle>
        <CardDescription>Las publicaciones se guardarán como borrador por defecto.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {state?.errors?._form && (
             <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error de Formulario</AlertTitle>
                <AlertDescription>{state.errors._form.join(', ')}</AlertDescription>
              </Alert>
          )}

          <div>
            <Label htmlFor="publicationType" className="font-medium">Tipo de Publicación</Label>
            <Controller
              name="publicationType"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger id="publicationType" className="mt-1">
                    <SelectValue placeholder="Selecciona un tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="markdown">Artículo Estándar (Markdown)</SelectItem>
                    <SelectItem value="pdf">Documento PDF</SelectItem>
                    <SelectItem value="sequence">Secuencia de Imágenes</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div>
            <Label htmlFor="title" className="font-medium">Título</Label>
            <Input id="title" {...register('title')} aria-invalid={errors.title ? "true" : "false"} className="mt-1"/>
            {errors.title && <p className="text-sm text-destructive mt-1">{errors.title.message}</p>}
          </div>

          {/* --- SIEMPRE mostrar el campo de imagen de portada --- */}
          <div>
            <Label htmlFor="coverImage" className="font-medium">Imagen de Portada</Label>
            <div className="mt-1 flex justify-center rounded-lg border border-dashed border-input px-6 py-10">
              <div className="text-center">
                {imagePreview ? (
                  <Image src={imagePreview} alt="Preview" width={200} height={200} className="mx-auto mb-4 rounded-md" />
                ) : (
                  <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                )}
                <label htmlFor="coverImage" className="relative cursor-pointer rounded-md bg-background font-semibold text-primary focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 hover:text-primary/80">
                  <span>Sube un archivo</span>
                  <input
                    id="coverImage"
                    type="file"
                    accept="image/*"
                    {...register('coverImage', { required: true })}
                    className="sr-only"
                  />
                </label>
                <p className="pl-1">o arrastra y suelta</p>
                <p className="text-xs leading-5 text-gray-600">PNG, JPG, GIF hasta 5MB</p>
              </div>
            </div>
            {errors.coverImage && <p className="text-sm text-destructive mt-1">{errors.coverImage.message}</p>}
          </div>

          {/* --- SIEMPRE mostrar el campo de extracto --- */}
          <div>
            <Label htmlFor="excerpt" className="font-medium">Extracto</Label>
            <Textarea
              id="excerpt"
              {...register('excerpt')}
              aria-invalid={errors.excerpt ? "true" : "false"}
              className="mt-1"
              placeholder="Un resumen corto y atractivo..."
            />
            {errors.excerpt && <p className="text-sm text-destructive mt-1">{errors.excerpt.message}</p>}
          </div>

          {/* Renderizado condicional de campos */}
          {publicationType === 'markdown' && (
            <>
              <div>
                <Label htmlFor="content" className="font-medium">Contenido</Label>
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

          {/* Siempre registra el input de PDF, pero solo lo muestra si corresponde */}
          <Input
            id="pdfFile"
            type="file"
            accept="application/pdf"
            style={{ display: 'none' }}
            {...register('pdfFile', { required: publicationType === 'pdf' })}
          />

          {publicationType === 'pdf' && (
            <div>
              <Label htmlFor="pdfFile" className="font-medium">Archivo PDF</Label>
              <div className="mt-1 flex justify-center rounded-lg border border-dashed border-input px-6 py-10">
                <div className="text-center">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <label htmlFor="pdfFile" className="relative cursor-pointer rounded-md bg-background font-semibold text-primary focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 hover:text-primary/80">
                    <span>Sube un archivo PDF</span>
                  </label>
                  <p className="pl-1">o arrastra y suelta</p>
                  <p className="text-xs leading-5 text-gray-600">PDF hasta 25MB</p>
                </div>
              </div>
              {watch('pdfFile')?.[0] && <p className="text-sm text-muted-foreground mt-2">Archivo seleccionado: {watch('pdfFile')?.[0].name}</p>}
              {errors.pdfFile && <p className="text-sm text-destructive mt-1">{errors.pdfFile.message}</p>}
            </div>
          )}

          {publicationType === 'sequence' && (
            <div className="space-y-4">
              <Label className="font-medium">Secciones de la Historia</Label>
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-start gap-4 p-4 border rounded-lg relative">
                   <div className="flex-1 space-y-2">
                      <Label htmlFor={`sections.${index}.image`}>Imagen de la Sección</Label>
                      <Input id={`sections.${index}.image`} {...register(`sections.${index}.image`)} type="file" accept="image/*" />
                      {errors.sections?.[index]?.image && <p className="text-sm text-destructive mt-1">{errors.sections[index].image.message}</p>}
                      
                      <Label htmlFor={`sections.${index}.text`}>Texto de la Sección</Label>
                      <Textarea id={`sections.${index}.text`} {...register(`sections.${index}.text`)} placeholder="Describe la imagen o cuenta parte de la historia..."/>
                      {errors.sections?.[index]?.text && <p className="text-sm text-destructive mt-1">{errors.sections[index].text.message}</p>}
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
                <PlusCircle className="mr-2 h-4 w-4" /> Añadir Sección
              </Button>
              {errors.sections && !errors.sections.length && <p className="text-sm text-destructive mt-1">{errors.sections.message}</p>}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="categoryId" className="font-medium">Categoría</Label>
              <Controller
                name="categoryId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="category" aria-invalid={errors.categoryId ? "true" : "false"}>
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={CREATE_NEW_CATEGORY_VALUE}>
                        <span className="flex items-center">
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Crear Nueva Categoría
                        </span>
                      </SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.categoryId && <p className="text-sm text-destructive mt-1">{errors.categoryId.message}</p>}
            </div>
            {showNewCategoryInput && (
              <div>
                <Label htmlFor="newCategoryName" className="font-medium">Nombre de Nueva Categoría</Label>
                <Input 
                  id="newCategoryName" 
                  {...register('newCategoryName')} 
                  aria-invalid={errors.newCategoryName ? "true" : "false"} 
                  className="mt-1"
                  placeholder="Ingresa el nombre para la nueva categoría"
                />
                {errors.newCategoryName && <p className="text-sm text-destructive mt-1">{errors.newCategoryName.message}</p>}
              </div>
            )}
          </div>
          
          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  );
}

