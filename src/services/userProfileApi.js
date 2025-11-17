import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

const USERS_COLLECTION = 'users';
const AVATAR_VARIATIONS = 8;

export const getUserProfileRef = (userId) =>
  doc(db, USERS_COLLECTION, userId);

export async function ensureUserProfileDocument(firebaseUser) {
  if (!firebaseUser?.uid) return null;

  const userRef = getUserProfileRef(firebaseUser.uid);
  const existing = await getDoc(userRef);
  if (existing.exists()) {
    const data = existing.data();
    if (typeof data.avatarIndex !== 'number') {
      const avatarIndex = Math.floor(Math.random() * AVATAR_VARIATIONS);
      const updated = {
        avatarIndex,
        updatedAt: serverTimestamp(),
      };
      await setDoc(userRef, updated, { merge: true });
      return { ...data, ...updated };
    }
    return data;
  }

  const fallbackName =
    firebaseUser.displayName ||
    firebaseUser.email?.split('@')?.[0] ||
    `creator-${firebaseUser.uid.slice(0, 5)}`;

  const payload = {
    uid: firebaseUser.uid,
    displayName: fallbackName,
    nickname: fallbackName,
    email: firebaseUser.email || '',
    avatarIndex: Math.floor(Math.random() * AVATAR_VARIATIONS),
    photoURL: firebaseUser.photoURL || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(userRef, payload, { merge: true });
  return payload;
}

export function subscribeToUserProfile(userId, { onUpdate, onError } = {}) {
  if (!userId) {
    onUpdate?.(null);
    return () => {};
  }

  const userRef = getUserProfileRef(userId);
  return onSnapshot(
    userRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onUpdate?.(null);
        return;
      }
      onUpdate?.({ id: snapshot.id, ...snapshot.data() });
    },
    (error) => {
      console.warn('[userProfileApi] subscribe error', error);
      onError?.(error);
    }
  );
}

export default {
  getUserProfileRef,
  ensureUserProfileDocument,
  subscribeToUserProfile,
};
