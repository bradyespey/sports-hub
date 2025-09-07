// scripts/seed.ts
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

// Firebase config - make sure to set your actual config
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

interface WeekData {
  season: number;
  week: number;
  startDateUtc: string;
  endDateUtc: string;
}

interface GameData {
  season: number;
  week: number;
  gameId: string;
  kickoffUtc: string;
  homeTeam: string;
  awayTeam: string;
  sportsbook?: {
    spreadHome: number;
    spreadAway: number;
    total: number;
    provider: string;
  };
}

async function seedWeeks() {
  console.log('Seeding weeks...');
  
  const weeks: WeekData[] = [
    {
      season: 2025,
      week: 1,
      startDateUtc: '2025-01-13T00:00:00Z',
      endDateUtc: '2025-01-27T00:00:00Z'
    },
    {
      season: 2025,
      week: 2,
      startDateUtc: '2025-01-28T00:00:00Z',
      endDateUtc: '2025-02-10T00:00:00Z'
    }
  ];

  for (const week of weeks) {
    const weekId = `${week.season}_${week.week.toString().padStart(2, '0')}`;
    await setDoc(doc(db, 'weeks', weekId), {
      ...week,
      startDateUtc: new Date(week.startDateUtc),
      endDateUtc: new Date(week.endDateUtc)
    });
    console.log(`✓ Week ${week.week} seeded`);
  }
}

async function seedGames() {
  console.log('Seeding games...');
  
  // Load schedule from devdata
  const schedulePath = path.join(__dirname, '../src/devdata/schedule.json');
  const scheduleData = JSON.parse(fs.readFileSync(schedulePath, 'utf8'));
  
  // Load odds from devdata
  const oddsPath = path.join(__dirname, '../src/devdata/odds.json');
  const oddsData = JSON.parse(fs.readFileSync(oddsPath, 'utf8'));

  for (const [weekKey, games] of Object.entries(scheduleData)) {
    const weekOdds = oddsData[weekKey] || [];
    
    for (const game of games as any[]) {
      const gameOdds = weekOdds.find((odd: any) => odd.gameId === game.gameId);
      
      const gameDoc = {
        season: game.season,
        week: game.week,
        gameId: game.gameId,
        kickoffUtc: new Date(game.kickoffUtc),
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        sportsbook: gameOdds ? {
          spreadHome: gameOdds.spreadHome,
          spreadAway: gameOdds.spreadAway,
          total: gameOdds.total,
          provider: gameOdds.provider
        } : undefined
      };

      await setDoc(doc(db, 'games', game.gameId), gameDoc);
      console.log(`✓ Game ${game.gameId} seeded`);
    }
  }
}

async function main() {
  try {
    console.log('🌱 Starting seed process...');
    await seedWeeks();
    await seedGames();
    console.log('✅ Seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

main();