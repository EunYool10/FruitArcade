import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import app, { firebaseConfig } from './firebase';

// Initialize Firestore with specific database ID if configured
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

if (import.meta.env.VITE_FIREBASE_EMULATOR) connectFirestoreEmulator(db, '127.0.0.1', 8085);
