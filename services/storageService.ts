import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

export const uploadProfilePhoto = async (userId: string, file: File): Promise<string> => {
  const fileRef = ref(storage, `profile_photos/${userId}/${file.name}`);
  await uploadBytes(fileRef, file);
  return await getDownloadURL(fileRef);
};
