// src/lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// Check if Firebase environment variables are configured
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
];

const missingVars = requiredEnvVars.filter(varName => !import.meta.env[varName]);

// Export configuration status
export const isFirebaseConfigured = missingVars.length === 0;
export const firebaseConfigError = missingVars.length > 0 
  ? `Missing required Firebase environment variables: ${missingVars.join(', ')}. Please copy .env.example to .env and configure your Firebase settings.`
  : null;

let auth: Auth;
let db: Firestore;
let googleProvider: GoogleAuthProvider;

if (isFirebaseConfigured) {
  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };

  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  googleProvider = new GoogleAuthProvider();

  // Configure Google Auth
  googleProvider.setCustomParameters({
    prompt: 'select_account'
  });
} else {
  // Create placeholder exports to prevent import errors
  auth = null as any;
  db = null as any;
  googleProvider = null as any;
}

export { auth, db, googleProvider };