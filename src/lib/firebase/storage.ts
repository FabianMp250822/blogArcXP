import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './config';

export async function uploadFile(file: File, path: string): Promise<string> {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);
  return downloadURL;
}
