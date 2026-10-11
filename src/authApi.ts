// Loaded right after the first paint (see App.tsx) to keep the initial bundle small
export { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
export { auth, googleProvider } from './firebase';
