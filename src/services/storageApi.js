// services/storageApi.js
import { 
  ref as storageRef, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { storage } from '../lib/firebase';

/**
 * URL에서 Blob 로드
 */
async function loadBlobFromUrl(url) {
  if (!url) return null;
  const response = await fetch(url);
  if (!response.ok) throw new Error('오디오 파일을 불러오지 못했습니다.');
  return response.blob();
}

/**
 * 로컬 서버의 음악 파일을 Firebase Storage에 업로드
 * @param {string} userId - 사용자 ID
 * @param {string} localUrl - 로컬 서버 URL (예: http://127.0.0.1:5000/api/audio/xxx.wav)
 * @param {string} fileName - 저장할 파일명
 * @param {string} folder - 저장 폴더 (기본: 'tracks')
 * @returns {Promise<string>} - Firebase Storage의 영구 URL
 */
export async function uploadMusicToStorage(userId, localUrl, fileName, folder = 'tracks') {
  try {
    // 1. 로컬 서버에서 파일 다운로드
    console.log('Fetching audio from:', localUrl);
    const blob = await loadBlobFromUrl(localUrl);
    
    if (!blob) {
      throw new Error('Failed to load audio blob');
    }
    
    // 2. Firebase Storage 경로 생성
    // 경로: audio/{folder}/{userId}/{timestamp}_{fileName}
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `audio/${folder}/${userId}/${timestamp}_${sanitizedFileName}`;
    const ref = storageRef(storage, storagePath);
    
    // 3. Firebase Storage에 업로드
    console.log('Uploading to Firebase Storage:', storagePath);
    const snapshot = await uploadBytes(ref, blob, {
      contentType: blob.type || 'audio/wav',
    });
    
    // 4. 다운로드 URL 가져오기 (영구 URL)
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log('Upload successful! Download URL:', downloadURL);
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading to Firebase Storage:', error);
    throw error;
  }
}

/**
 * Firebase Storage에서 파일 삭제
 * @param {string} fileUrl - Firebase Storage URL
 */
export async function deleteFileFromStorage(fileUrl) {
  try {
    // URL에서 파일 경로 추출
    const url = new URL(fileUrl);
    const pathMatch = url.pathname.match(/\/o\/(.+?)\?/);
    if (!pathMatch) {
      throw new Error('Invalid Firebase Storage URL');
    }
    
    const filePath = decodeURIComponent(pathMatch[1]);
    const fileRef = storageRef(storage, filePath);
    
    await deleteObject(fileRef);
    console.log('File deleted from Firebase Storage');
  } catch (error) {
    console.error('Error deleting from Firebase Storage:', error);
    throw error;
  }
}

/**
 * URL이 Firebase Storage URL인지 확인
 * @param {string} url - 확인할 URL
 * @returns {boolean}
 */
export function isFirebaseStorageUrl(url) {
  return url && url.includes('firebasestorage.googleapis.com');
}

/**
 * URL이 로컬 서버 URL인지 확인
 * @param {string} url - 확인할 URL
 * @returns {boolean}
 */
export function isLocalServerUrl(url) {
  return url && (url.includes('127.0.0.1') || url.includes('localhost'));
}

export default {
  uploadMusicToStorage,
  deleteFileFromStorage,
  isFirebaseStorageUrl,
  isLocalServerUrl,
};