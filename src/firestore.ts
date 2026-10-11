import { getFirestore } from 'firebase/firestore';
import app, { firebaseConfig } from './firebase';

// Initialize Firestore with specific database ID if configured
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);
