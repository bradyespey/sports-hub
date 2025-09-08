// scripts/seed-week1-picks.ts
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, Timestamp } from 'firebase/firestore';
import { config } from 'dotenv';

// Load environment variables
config();

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

// Week 1 picks from the markdown file
const WEEK1_PICKS = [
  { gameId: '2025-W01-DAL-PHI', jenny: 'PHI', brady: 'PHI' },
  { gameId: '2025-W01-KC-LAC', jenny: 'KC', brady: 'KC' },
  { gameId: '2025-W01-TB-ATL', jenny: 'TB', brady: 'TB' },
  { gameId: '2025-W01-CIN-CLE', jenny: 'CIN', brady: 'CIN' },
  { gameId: '2025-W01-MIA-IND', jenny: 'MIA', brady: 'MIA' },
  { gameId: '2025-W01-CAR-JAX', jenny: 'JAX', brady: 'CAR' }, // Note: Brady picked NC (Carolina)
  { gameId: '2025-W01-LV-NE', jenny: 'NE', brady: 'NE' },
  { gameId: '2025-W01-ARI-NO', jenny: 'ARI', brady: 'ARI' },
  { gameId: '2025-W01-PIT-NYJ', jenny: 'PIT', brady: 'NYJ' },
  { gameId: '2025-W01-NYG-WAS', jenny: 'WAS', brady: 'WAS' },
  { gameId: '2025-W01-TEN-DEN', jenny: 'DEN', brady: 'DEN' },
  { gameId: '2025-W01-SF-SEA', jenny: 'SF', brady: 'SEA' },
  { gameId: '2025-W01-DET-GB', jenny: 'DET', brady: 'DET' },
  { gameId: '2025-W01-HOU-LAR', jenny: 'LAR', brady: 'LAR' },
  { gameId: '2025-W01-BAL-BUF', jenny: 'BAL', brady: 'BUF' },
  { gameId: '2025-W01-MIN-CHI', jenny: 'MIN', brady: 'CHI' }
];

// User IDs
const JENNY_UID = 'SAMXEs1HopNiPK62qpZnP29SITz2'; // Jenny's Firebase Auth UID
const BRADY_UID = 'mrm4SKisEqM4hWcqet5lf9irnbB3'; // Brady's Firebase Auth UID

async function seedWeek1Picks() {
  console.log('🏈 Seeding Week 1 picks...');

  for (const pick of WEEK1_PICKS) {
    // Jenny's pick
    const jennyPickId = `${pick.gameId}_${JENNY_UID}`;
    await setDoc(doc(db, 'picks', jennyPickId), {
      gameId: pick.gameId,
      uid: JENNY_UID,
      selection: pick.jenny,
      createdAt: new Date('2025-09-04T12:00:00Z'), // Before games started
      locked: true,
      revealed: true
    });

    // Brady's pick
    const bradyPickId = `${pick.gameId}_${BRADY_UID}`;
    await setDoc(doc(db, 'picks', bradyPickId), {
      gameId: pick.gameId,
      uid: BRADY_UID,
      selection: pick.brady,
      createdAt: new Date('2025-09-04T12:00:00Z'), // Before games started
      locked: true,
      revealed: true
    });

    console.log(`✓ Seeded picks for ${pick.gameId}: Jenny=${pick.jenny}, Brady=${pick.brady}`);
  }

  console.log('✅ Week 1 picks seeded successfully!');
  console.log('📝 Note: Update JENNY_UID and BRADY_UID with actual Firebase Auth UIDs');
}

async function main() {
  try {
    await seedWeek1Picks();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

main();
