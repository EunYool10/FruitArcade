import { initializeApp, getApps, getApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Local testing only (VITE_FIREBASE_EMULATOR=1 npm run dev); compiled out of real builds
if (import.meta.env.VITE_FIREBASE_EMULATOR) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  // Browser tests sign in as a fake Google user
  (window as any).__emulatorSignIn = (sub: string, name: string) =>
    signInWithCredential(auth, GoogleAuthProvider.credential(JSON.stringify({ sub, name, email: sub + '@example.com', email_verified: true })));
}

// Firestore lives in ./firestore.ts so it is only downloaded once someone signs in
export { firebaseConfig };
export default app;
