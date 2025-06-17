import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './config';

export async function uploadFile(file: File, path: string): Promise<string> {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);
  return downloadURL;
}

export async function deleteFileByUrl(fileUrl: string): Promise<void> {
  if (!fileUrl || !fileUrl.startsWith('https://firebasestorage.googleapis.com')) {
    console.warn('Invalid or non-Firebase Storage URL provided for deletion:', fileUrl);
    return;
  }
  try {
    const storageRef = ref(storage, fileUrl);
    await deleteObject(storageRef);
    console.log('File deleted successfully from Firebase Storage:', fileUrl);
  } catch (error: any) {
    if (error.code === 'storage/object-not-found') {
      console.warn('File not found in Firebase Storage, could not delete:', fileUrl);
    } else {
      console.error('Error deleting file from Firebase Storage:', error);
      throw error; // Re-throw for the caller to handle if needed
    }
  }
}
