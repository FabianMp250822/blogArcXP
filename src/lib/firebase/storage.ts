'use server-only';
import admin from '@/lib/firebase/admin';
import { getStorage } from 'firebase-admin/storage';

/**
 * Sube un archivo a Firebase Storage usando el SDK de Admin.
 * Esta función está diseñada para ser usada ÚNICAMENTE en el lado del servidor (Server Actions).
 * @param file El objeto File a subir.
 * @param path La ruta completa (incluyendo el nombre del archivo) donde se guardará en el bucket.
 * @returns La URL pública del archivo subido.
 */
export async function uploadFile(file: File, path: string): Promise<string> {
  // Asegurarse de que el SDK de Admin esté inicializado
  if (!admin.apps.length) {
    throw new Error('Firebase Admin SDK no está inicializado.');
  }

  // Obtener el bucket por defecto desde las variables de entorno
  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (!bucketName) {
    throw new Error('La variable de entorno NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET no está configurada.');
  }
  
  const bucket = getStorage().bucket(bucketName);

  // Convertir el archivo a un Buffer para que el SDK de Admin pueda manejarlo
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  // Crear una referencia al archivo en el bucket
  const fileUpload = bucket.file(path);

  // Guardar el buffer del archivo en Storage
  await fileUpload.save(fileBuffer, {
    metadata: {
      contentType: file.type,
    },
  });

  // Hacer el archivo público para que se pueda acceder a él a través de la URL
  await fileUpload.makePublic();

  // Devolver la URL pública del archivo
  return fileUpload.publicUrl();
}

/**
 * Elimina un archivo de Firebase Storage usando su URL pública.
 * Esta función está diseñada para ser usada ÚNICAMENTE en el lado del servidor (Server Actions).
 * @param fileUrl La URL pública del archivo a eliminar.
 */
export async function deleteFileByUrl(fileUrl: string): Promise<void> {
  // Si la URL no es una URL válida de Google Storage, no hacer nada.
  if (!fileUrl || !fileUrl.startsWith('https://storage.googleapis.com/')) {
    console.warn(`URL no válida o no es de Google Storage, se omite la eliminación: ${fileUrl}`);
    return;
  }

  if (!admin.apps.length) {
    console.error('Intento de eliminar archivo sin el SDK de Admin inicializado.');
    return; // No lanzar un error para no detener la acción principal (ej. eliminar post).
  }

  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (!bucketName) {
    console.error('La variable de entorno NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET no está configurada.');
    return;
  }

  try {
    // Extraer la ruta del archivo de la URL.
    // Formato: https://storage.googleapis.com/BUCKET_NAME/FILE_PATH
    const url = new URL(fileUrl);
    const filePath = decodeURIComponent(url.pathname.replace(`/${bucketName}/`, ''));

    if (!filePath) {
      console.warn(`No se pudo extraer la ruta del archivo de la URL: ${fileUrl}`);
      return;
    }

    const bucket = getStorage().bucket(bucketName);
    await bucket.file(filePath).delete();

    console.log(`Archivo de Storage eliminado exitosamente: ${filePath}`);
  } catch (error: any) {
    // Si el error es 'object not found' (código 404), lo ignoramos.
    // El objetivo es que el archivo no exista, así que si ya no está, la misión está cumplida.
    if (error.code === 404) {
      console.log(`El archivo en la URL ${fileUrl} no se encontró. Probablemente ya fue eliminado.`);
      return;
    }
    // Para otros errores, los registramos pero no detenemos la ejecución.
    console.error(`Error al eliminar el archivo de Storage (${fileUrl}):`, error);
  }
}
