import {
  addDoc,
  collection,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';

import { db, storage } from '../lib/firebase';

async function uploadAudioBlob({ ownerId, docId, blob, folder }) {
  if (!blob) return null;
  const ref = storageRef(storage, `audio/${folder}/${ownerId}/${docId}.wav`);
  await uploadBytes(ref, blob, { contentType: 'audio/wav' });
  return getDownloadURL(ref);
}

async function loadBlobFromUrl(url) {
  if (!url) return null;
  const response = await fetch(url);
  if (!response.ok) throw new Error('오디오 파일을 불러오지 못했습니다.');
  return response.blob();
}

export async function saveGeneratedTrack({
  ownerId,
  title,
  genres,
  moods,
  description,
  durationSec,
  prompt,
  sourceUrl,
}) {
  const payload = {
    ownerId,
    title,
    genres,
    moods,
    description,
    duration: durationSec,
    prompt,
    source: 'musicgen',
    createdAt: serverTimestamp(),
  };

  const tracksCol = collection(db, 'tracks');
  const docRef = await addDoc(tracksCol, payload);

  try {
    const blob = await loadBlobFromUrl(sourceUrl);
    const url = await uploadAudioBlob({ ownerId, docId: docRef.id, blob, folder: 'tracks' });
    await updateDoc(docRef, { audioUrl: url, sourceUrl });
  } catch (error) {
    // 업로드 실패 시에도 문서 기본 정보는 유지되도록 로그만 남김
    console.warn('[libraryWriter] track audio upload failed', error);
  }

  return docRef.id;
}

export async function saveBeatItem({
  ownerId,
  title,
  bpm,
  bars,
  pattern,
  audioBlob,
  presetMeta,
}) {
  const payload = {
    ownerId,
    title,
    bpm,
    bars,
    pattern,
    presetMeta,
    source: 'beatmaker',
    createdAt: serverTimestamp(),
  };

  const beatsCol = collection(db, 'beats');
  const docRef = await addDoc(beatsCol, payload);

  try {
    const url = await uploadAudioBlob({ ownerId, docId: docRef.id, blob: audioBlob, folder: 'beats' });
    await updateDoc(docRef, { audioUrl: url });
  } catch (error) {
    console.warn('[libraryWriter] beat audio upload failed', error);
  }

  return docRef.id;
}

export default {
  saveGeneratedTrack,
  saveBeatItem,
};
