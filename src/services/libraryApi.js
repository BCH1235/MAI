import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  where,
  limit,
} from 'firebase/firestore';

import { db } from '../lib/firebase';

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

export function getTrackDocRef(trackId) {
  return doc(db, COLLECTION_TRACKS, trackId);
}

export function getBeatDocRef(beatId) {
  return doc(db, COLLECTION_BEATS, beatId);
}

export default {
  subscribeToUserLibrary,
  getTrackDocRef,
  getBeatDocRef,
};
