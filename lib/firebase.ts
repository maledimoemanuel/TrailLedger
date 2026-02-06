import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getFirebaseApp(): FirebaseApp | null {
  if (typeof window === "undefined") return null;
  if (getApps().length === 0) {
    return initializeApp(firebaseConfig);
  }
  return getApps()[0] as FirebaseApp;
}

export const app = getFirebaseApp();
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export const storage = app ? getStorage(app) : null;

// Optional: use emulators in development
export function connectEmulators() {
  if (!app || process.env.NODE_ENV !== "development") return;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  if (auth && authDomain?.includes("localhost")) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099");
  }
  if (db) {
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
  }
}
