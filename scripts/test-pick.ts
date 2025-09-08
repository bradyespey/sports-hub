// scripts/test-pick.ts
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';

// Firebase config
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testPick() {
  console.log('🧪 Testing single pick creation...');

  try {
    // Test with a simple pick
    const testPickId = 'test-pick-123';
    await setDoc(doc(db, 'picks', testPickId), {
      gameId: '2025-W01-DAL-PHI',
      uid: 'mrm4SKisEqM4hWcqet5lf9irnbB3',
      selection: 'PHI',
      createdAt: new Date(),
      locked: false,
      revealed: false
    });

    console.log('✅ Test pick created successfully!');
  } catch (error) {
    console.error('❌ Test pick failed:', error);
  }
}

testPick();
