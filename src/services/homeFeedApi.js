// src/services/homeFeedApi.js
import {
  collection,
  orderBy,
  query,
  limit,
  getDocs,
  startAfter,
  where,
  onSnapshot,
} from 'firebase/firestore';

import { db } from '../lib/firebase';

const COLLECTION_TRACKS = 'tracks';
const COLLECTION_BEATS = 'beats';

// Firestore 문서를 공통 포맷으로 정리
function normalizeDoc(snapshot, type) {
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  return {
    id: snapshot.id,
    collectionType: type,          // 'track' | 'beat'
    ...data,
  };
}

const getCreatedAtValue = (item) => {
  if (!item?.createdAt) return 0;
  if (typeof item.createdAt === 'string') {
    const timestamp = new Date(item.createdAt).getTime();
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }
  if (item.createdAt instanceof Date) {
    return item.createdAt.getTime();
  }
  if (typeof item.createdAt === 'object' && typeof item.createdAt.toMillis === 'function') {
    return item.createdAt.toMillis();
  }
  return Number(item.createdAt) || 0;
};

/**
 * 홈 피드용 구독
 * - tracks + beats 컬렉션에서 최신순으로 가져옴
 * - 실제 Firestore 데이터만 사용 (더미 없음)
 */
function buildBaseQuery({ type, pageSize, lastDoc, viewFilter, userId, sortBy }) {
  const collectionName = type === 'beat' ? COLLECTION_BEATS : COLLECTION_TRACKS;
  let q = collection(db, collectionName);

  if (viewFilter === 'mine' && userId) {
    q = query(q, where('ownerId', '==', userId));
  } else if (viewFilter === 'others' && userId) {
    q = query(q, where('ownerId', '!=', userId));
  }

  const orderField = sortBy === 'title' ? 'title' : sortBy === 'duration' ? 'duration' : 'createdAt';
  q = query(q, orderBy(orderField, orderField === 'title' ? 'asc' : 'desc'), limit(pageSize));

  if (lastDoc) {
    q = query(q, startAfter(lastDoc));
  }

  return q;
}

export async function fetchHomeFeedPage({
  pageSize = 6,
  lastTrackDoc = null,
  lastBeatDoc = null,
  viewFilter = 'all',
  sortBy = 'latest',
  userId = null,
}) {
  try {
    const trackQuery = buildBaseQuery({ type: 'track', pageSize, lastDoc: lastTrackDoc, viewFilter, userId, sortBy });
    const beatQuery = buildBaseQuery({ type: 'beat', pageSize, lastDoc: lastBeatDoc, viewFilter, userId, sortBy });

    const [trackSnap, beatSnap] = await Promise.all([getDocs(trackQuery), getDocs(beatQuery)]);

    const tracks = trackSnap.docs.map((doc) => normalizeDoc(doc, 'track')).filter(Boolean);
    const beats = beatSnap.docs.map((doc) => normalizeDoc(doc, 'beat')).filter(Boolean);

    const merged = [...tracks, ...beats].sort((a, b) => {
      if (sortBy === 'duration') return (b.duration || 0) - (a.duration || 0);
      if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '');
      return getCreatedAtValue(b) - getCreatedAtValue(a);
    });

    const lastFetchedTrack = trackSnap.docs.at(-1) || null;
    const lastFetchedBeat = beatSnap.docs.at(-1) || null;

    return {
      items: merged,
      lastTrackDoc: lastFetchedTrack,
      lastBeatDoc: lastFetchedBeat,
      hasMore: tracks.length === pageSize || beats.length === pageSize,
    };
  } catch (error) {
    console.error('[homeFeedApi] fetchHomeFeedPage error', error);
    throw error;
  }
}

export function subscribeToHomeFeed({ limitCount = 60, onUpdate, onError } = {}) {
  const tracksQuery = query(
    collection(db, COLLECTION_TRACKS),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );

  const beatsQuery = query(
    collection(db, COLLECTION_BEATS),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );

  let currentTracks = [];
  let currentBeats = [];

  const emitMergedList = () => {
    const merged = [...currentTracks, ...currentBeats]
      .filter(Boolean)
      .sort((a, b) => getCreatedAtValue(b) - getCreatedAtValue(a));

    onUpdate?.(merged);
  };

  const unsubTracks = onSnapshot(
    tracksQuery,
    (snapshot) => {
      currentTracks = snapshot.docs.map((doc) => normalizeDoc(doc, 'track'));
      emitMergedList();
    },
    (error) => {
      console.error('[homeFeedApi] tracks snapshot error', error);
      onError?.(error);
    }
  );

  const unsubBeats = onSnapshot(
    beatsQuery,
    (snapshot) => {
      currentBeats = snapshot.docs.map((doc) => normalizeDoc(doc, 'beat'));
      emitMergedList();
    },
    (error) => {
      console.error('[homeFeedApi] beats snapshot error', error);
      onError?.(error);
    }
  );

  return () => {
    unsubTracks?.();
    unsubBeats?.();
  };
}
