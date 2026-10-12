/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Set to use the local Firebase emulators (auth :9099, firestore :8085) */
  readonly VITE_FIREBASE_EMULATOR?: string;
}
