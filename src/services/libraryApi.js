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
  updateDoc,
} from 'firebase/firestore';

import { db } from '../lib/firebase';

const COLLECTION_TRACKS = 'tracks';
const COLLECTION_BEATS = 'beats';

function normalizeDoc(snapshot, type) {
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  return {
    id: snapshot.id,
    collectionType: type,
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

  const collectionType =
    musicData.collectionType ||
    (musicData.type === 'beat' ? 'beat' : 'track');

  const collectionName = collectionType === 'beat' ? COLLECTION_BEATS : COLLECTION_TRACKS;

  const docRefForAuto = doc(collection(db, collectionName));
  const docId = musicData.id ? String(musicData.id) : docRefForAuto.id;
  const docRef = doc(db, collectionName, docId);

  // 중복 확인
  const existingDoc = await getDoc(docRef);
  if (existingDoc.exists()) {
    throw new Error('This music already exists in your library');
  }

  // Firestore에 저장할 데이터 준비
  const dataToSave = {
    ...musicData,
    collectionType,
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

/**
 * 음악의 즐겨찾기 상태를 설정합니다.
 * @param {string} userId - 사용자 ID
 * @param {string} musicId - 음악 ID
 * @param {string} musicType - 음악 타입 ('track' 또는 'beat')
 * @param {boolean} newFavoriteStatus - 새로운 즐겨찾기 상태 (true/false)
 */
export async function setFavoriteStatus(userId, musicId, musicType, newFavoriteStatus) {
  if (!userId || !musicId) {
    throw new Error('User ID and Music ID are required');
  }

  const collectionName = musicType === 'beat' ? COLLECTION_BEATS : COLLECTION_TRACKS;
  const docRef = doc(db, collectionName, musicId);

  // (보안) 소유권 확인
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    throw new Error('Music not found');
  }
  const data = docSnap.data();
  if (data.ownerId !== userId) {
    throw new Error('You do not have permission to modify this music');
  }

  // 'isFavorite' 필드만 업데이트합니다.
  await updateDoc(docRef, {
    isFavorite: newFavoriteStatus
  });

  console.log(`Music favorite status updated: ${musicId} -> ${newFavoriteStatus}`);
}

export async function updateLibraryItemTitle({ userId, musicId, musicType, title }) {
  if (!userId || !musicId) {
    throw new Error('User ID and Music ID are required');
  }

  const collectionName = musicType === 'beat' ? COLLECTION_BEATS : COLLECTION_TRACKS;
  const docRef = doc(db, collectionName, musicId);

  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    throw new Error('Music not found');
  }
  const data = docSnap.data();
  if (data.ownerId !== userId) {
    throw new Error('You do not have permission to modify this music');
  }

  await updateDoc(docRef, {
    title,
    updatedAt: serverTimestamp(),
  });
}

export async function updateLibraryMusic({
  userId,
  musicId,
  musicType = 'track',
  data = {},
}) {
  if (!userId || !musicId) {
    throw new Error('User ID and Music ID are required');
  }
  const collectionName = musicType === 'beat' ? COLLECTION_BEATS : COLLECTION_TRACKS;
  const docRef = doc(db, collectionName, musicId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    throw new Error('Music not found');
  }
  const docData = docSnap.data();
  if (docData.ownerId !== userId) {
    throw new Error('You do not have permission to modify this music');
  }
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export function getTrackDocRef(trackId) {
  return doc(db, COLLECTION_TRACKS, trackId);
}

export function getBeatDocRef(beatId) {
  return doc(db, COLLECTION_BEATS, beatId);
}

const libraryApi = {
  subscribeToUserLibrary,
  addMusicToLibrary,
  removeMusicFromLibrary,
  setFavoriteStatus,
  updateLibraryItemTitle,
  updateLibraryMusic,
  getTrackDocRef,
  getBeatDocRef,
};

export default libraryApi;
