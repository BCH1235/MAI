import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  where,
  limit,
  setDoc,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';

import { db } from '../lib/firebase';
import { uploadMusicToStorage, isFirebaseStorageUrl } from './storageApi';

const COLLECTION_TRACKS = 'tracks';
const COLLECTION_BEATS = 'beats';

function normalizeDoc(snapshot, type) {
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  return {
    id: snapshot.id,
    type,
    ...data,
  };
}

export function subscribeToUserLibrary(userId, { onUpdate, onError } = {}) {
  if (!userId) return () => {};

  const tracksQuery = query(
    collection(db, COLLECTION_TRACKS),
    where('ownerId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(200)
  );

  const beatsQuery = query(
    collection(db, COLLECTION_BEATS),
    where('ownerId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(200)
  );

  let currentTracks = [];
  let currentBeats = [];

  const emit = () => {
    const combined = [...currentTracks, ...currentBeats].sort((a, b) => {
      const aDate = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
      const bDate = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
      return bDate - aDate;
    });
    onUpdate?.(combined);
  };

  const unsubTracks = onSnapshot(
    tracksQuery,
    (snap) => {
      currentTracks = snap.docs
        .map((docSnap) => normalizeDoc(docSnap, 'track'))
        .filter(Boolean);
      emit();
    },
    (error) => {
      console.warn('[libraryApi] tracks subscription error', error);
      onError?.(error);
    }
  );

  const unsubBeats = onSnapshot(
    beatsQuery,
    (snap) => {
      currentBeats = snap.docs
        .map((docSnap) => normalizeDoc(docSnap, 'beat'))
        .filter(Boolean);
      emit();
    },
    (error) => {
      console.warn('[libraryApi] beats subscription error', error);
      onError?.(error);
    }
  );

  return () => {
    unsubTracks?.();
    unsubBeats?.();
  };
}

/**
 * 음악을 라이브러리에 추가
 * @param {string} userId - 사용자 ID
 * @param {object} musicData - 음악 데이터
 * @returns {Promise<string>} - 저장된 문서 ID
 */
export async function addMusicToLibrary(userId, musicData) {
  if (!userId) {
    throw new Error('User ID is required');
  }

  if (!musicData) {
    throw new Error('Music data is required');
  }

  // 음악 타입에 따라 컬렉션 선택 (tracks 또는 beats)
  const collectionName = musicData.type === 'beat' ? COLLECTION_BEATS : COLLECTION_TRACKS;
  
  // 문서 ID 생성 (기존 ID가 있으면 사용, 없으면 자동 생성)
  const docId = musicData.id || doc(collection(db, collectionName)).id;
  const docRef = doc(db, collectionName, docId);

  // 중복 확인
  const existingDoc = await getDoc(docRef);
  if (existingDoc.exists()) {
    throw new Error('This music already exists in your library');
  }

  // Firestore에 저장할 데이터 준비
  const dataToSave = {
    ...musicData,
    ownerId: userId,
    createdAt: musicData.createdAt ? new Date(musicData.createdAt) : serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  // id 필드는 문서 ID로 사용하므로 제거
  delete dataToSave.id;

  // Firestore에 저장
  await setDoc(docRef, dataToSave);

  console.log(`Music added to library: ${docId}`);
  return docId;
}

/**
 * 라이브러리에서 음악 삭제
 * @param {string} userId - 사용자 ID
 * @param {string} musicId - 음악 ID
 * @param {string} musicType - 음악 타입 ('track' 또는 'beat')
 */
export async function removeMusicFromLibrary(userId, musicId, musicType = 'track') {
  if (!userId || !musicId) {
    throw new Error('User ID and Music ID are required');
  }

  const collectionName = musicType === 'beat' ? COLLECTION_BEATS : COLLECTION_TRACKS;
  const docRef = doc(db, collectionName, musicId);

  // 소유권 확인
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    throw new Error('Music not found');
  }

  const data = docSnap.data();
  if (data.ownerId !== userId) {
    throw new Error('You do not have permission to delete this music');
  }

  // 삭제 (실제로는 deleteDoc 사용해야 하지만, 여기서는 setDoc으로 deleted 플래그 설정)
  const { deleteDoc } = await import('firebase/firestore');
  await deleteDoc(docRef);

  console.log(`Music removed from library: ${musicId}`);
}

export function getTrackDocRef(trackId) {
  return doc(db, COLLECTION_TRACKS, trackId);
}

export function getBeatDocRef(beatId) {
  return doc(db, COLLECTION_BEATS, beatId);
}

export default {
  subscribeToUserLibrary,
  addMusicToLibrary,
  removeMusicFromLibrary,
  getTrackDocRef,
  getBeatDocRef,
};