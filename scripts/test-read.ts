// scripts/test-read.ts
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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

async function testRead() {
  console.log('🧪 Testing Firestore read access...');

  try {
    // Try to read from picks collection
    const picksRef = collection(db, 'picks');
    const snapshot = await getDocs(picksRef);
    
    console.log(`✅ Successfully read ${snapshot.size} picks from Firestore`);
    
    if (snapshot.size > 0) {
      snapshot.forEach(doc => {
        console.log(`- ${doc.id}:`, doc.data());
      });
    }
  } catch (error) {
    console.error('❌ Read failed:', error);
  }
}

testRead();
