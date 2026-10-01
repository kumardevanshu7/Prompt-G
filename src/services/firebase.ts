import { initializeApp, getApps, getApp } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import type { Auth, User } from 'firebase/auth';
import {
  getFirestore,
  collection,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import type { PromptItem, UserProfile } from '../types/prompt';

// Exact Firebase configuration with Vercel env support & fallbacks
export const defaultFirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBMaWrimk6WBXWKJURV2Yrlg4L-2u11LMU",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "pro11-promptg.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "pro11-promptg",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "pro11-promptg.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "526933224279",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:526933224279:web:866cf039ea844203f3ec12",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-3LL775CP5F"
};

// Initialize Firebase App
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(defaultFirebaseConfig);
} else {
  app = getApp();
}

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// ==========================================
// Authentication Methods
// ==========================================

export const signInWithGoogle = async (): Promise<User> => {
  googleProvider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
};

export const logoutUser = async (): Promise<void> => {
  await firebaseSignOut(auth);
};

export const onAuthChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// ==========================================
// User Profile Methods (Firestore `users` collection)
// ==========================================

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return userDoc.data() as UserProfile;
    }
    return null;
  } catch (err) {
    console.error('Error fetching user profile:', err);
    return null;
  }
};

export const saveUserProfile = async (profile: UserProfile): Promise<void> => {
  await setDoc(doc(db, 'users', profile.uid), {
    ...profile,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
};

// ==========================================
// Prompts Methods (Scoped to authenticated user)
// ==========================================

const mapPromptDoc = (id: string, data: Record<string, any>): PromptItem => ({
  id,
  title: data.title || '',
  description: data.description || '',
  prompt: data.prompt || '',
  images: Array.isArray(data.images) ? data.images : (data.images ? [data.images] : []),
  labels: Array.isArray(data.labels) ? data.labels : (data.labels ? [data.labels] : []),
  created_at: data.created_at || new Date().toISOString(),
  updated_at: data.updated_at,
  userId: data.userId || '',
  userName: data.userName || '',
  enableCheckmark: data.enableCheckmark === true,
  isUsed: data.isUsed === true,
});

export const fetchFirebasePrompts = async (userId: string): Promise<PromptItem[]> => {
  if (!userId) return [];
  try {
    const q = query(collection(db, 'prompts'), where('userId', '==', userId));
    const snap = await getDocs(q);

    const items = snap.docs.map((d) => mapPromptDoc(d.id, d.data()));
    items.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    return items;
  } catch (err) {
    console.error('Error fetching prompts from Firestore:', err);
    return [];
  }
};

export const insertFirebasePrompt = async (
  prompt: Omit<PromptItem, 'id' | 'created_at'>
): Promise<PromptItem> => {
  const currentUid = auth.currentUser?.uid || prompt.userId;
  if (!currentUid) {
    throw new Error('User must be signed in to save prompts.');
  }

  const row = {
    title: prompt.title,
    description: prompt.description,
    prompt: prompt.prompt,
    images: prompt.images,
    labels: prompt.labels,
    created_at: new Date().toISOString(),
    userId: currentUid,
    userName: prompt.userName || auth.currentUser?.displayName || 'Creator',
    enableCheckmark: Boolean(prompt.enableCheckmark),
    isUsed: Boolean(prompt.isUsed),
  };

  const docRef = await addDoc(collection(db, 'prompts'), row);
  return {
    id: docRef.id,
    ...row,
  };
};

export const updateFirebasePrompt = async (
  id: string,
  updates: Partial<PromptItem>
): Promise<void> => {
  await setDoc(
    doc(db, 'prompts', id),
    {
      ...updates,
      updated_at: new Date().toISOString(),
    },
    { merge: true }
  );
};

export const deleteFirebasePrompt = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'prompts', id));
};

/**
 * Real-time listener: Returns parsed PromptItem[] directly to eliminate double reads.
 */
export const subscribeFirebasePrompts = (
  userId: string,
  onUpdate: (prompts: PromptItem[]) => void,
  onError?: (err: Error) => void
) => {
  if (!userId) return () => {};

  const q = query(collection(db, 'prompts'), where('userId', '==', userId));

  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => mapPromptDoc(d.id, d.data()));
      items.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
      onUpdate(items);
    },
    (err) => {
      console.warn('Firestore real-time listener error:', err.message);
      onError?.(err);
    }
  );
};
