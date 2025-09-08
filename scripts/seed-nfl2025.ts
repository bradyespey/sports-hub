// scripts/seed-nfl2025.ts
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, Timestamp } from 'firebase/firestore';
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
  status: 'scheduled' | 'live' | 'final';
  sportsbook?: {
    spreadHome: number;
    spreadAway: number;
    total: number;
    provider: string;
  };
}

async function seedWeeks() {
  console.log('Seeding NFL 2025 weeks...');
  
  const weeks: WeekData[] = [
    {
      season: 2025,
      week: 1,
      startDateUtc: '2025-09-04T00:00:00Z',
      endDateUtc: '2025-09-10T23:59:59Z'
    },
    {
      season: 2025,
      week: 2,
      startDateUtc: '2025-09-11T00:00:00Z',
      endDateUtc: '2025-09-17T23:59:59Z'
    },
    {
      season: 2025,
      week: 3,
      startDateUtc: '2025-09-18T00:00:00Z',
      endDateUtc: '2025-09-24T23:59:59Z'
    },
    {
      season: 2025,
      week: 4,
      startDateUtc: '2025-09-25T00:00:00Z',
      endDateUtc: '2025-10-01T23:59:59Z'
    },
    {
      season: 2025,
      week: 5,
      startDateUtc: '2025-10-02T00:00:00Z',
      endDateUtc: '2025-10-08T23:59:59Z'
    },
    {
      season: 2025,
      week: 6,
      startDateUtc: '2025-10-09T00:00:00Z',
      endDateUtc: '2025-10-15T23:59:59Z'
    },
    {
      season: 2025,
      week: 7,
      startDateUtc: '2025-10-16T00:00:00Z',
      endDateUtc: '2025-10-22T23:59:59Z'
    },
    {
      season: 2025,
      week: 8,
      startDateUtc: '2025-10-23T00:00:00Z',
      endDateUtc: '2025-10-29T23:59:59Z'
    },
    {
      season: 2025,
      week: 9,
      startDateUtc: '2025-10-30T00:00:00Z',
      endDateUtc: '2025-11-05T23:59:59Z'
    },
    {
      season: 2025,
      week: 10,
      startDateUtc: '2025-11-06T00:00:00Z',
      endDateUtc: '2025-11-12T23:59:59Z'
    },
    {
      season: 2025,
      week: 11,
      startDateUtc: '2025-11-13T00:00:00Z',
      endDateUtc: '2025-11-19T23:59:59Z'
    },
    {
      season: 2025,
      week: 12,
      startDateUtc: '2025-11-20T00:00:00Z',
      endDateUtc: '2025-11-26T23:59:59Z'
    },
    {
      season: 2025,
      week: 13,
      startDateUtc: '2025-11-27T00:00:00Z',
      endDateUtc: '2025-12-03T23:59:59Z'
    },
    {
      season: 2025,
      week: 14,
      startDateUtc: '2025-12-04T00:00:00Z',
      endDateUtc: '2025-12-10T23:59:59Z'
    },
    {
      season: 2025,
      week: 15,
      startDateUtc: '2025-12-11T00:00:00Z',
      endDateUtc: '2025-12-17T23:59:59Z'
    },
    {
      season: 2025,
      week: 16,
      startDateUtc: '2025-12-18T00:00:00Z',
      endDateUtc: '2025-12-24T23:59:59Z'
    },
    {
      season: 2025,
      week: 17,
      startDateUtc: '2025-12-25T00:00:00Z',
      endDateUtc: '2025-12-31T23:59:59Z'
    },
    {
      season: 2025,
      week: 18,
      startDateUtc: '2026-01-01T00:00:00Z',
      endDateUtc: '2026-01-07T23:59:59Z'
    }
  ];

  for (const week of weeks) {
    const weekId = `${week.season}_${week.week.toString().padStart(2, '0')}`;
    await setDoc(doc(db, 'weeks', weekId), {
      season: week.season,
      week: week.week,
      startDateUtc: Timestamp.fromDate(new Date(week.startDateUtc)),
      endDateUtc: Timestamp.fromDate(new Date(week.endDateUtc))
    });
    console.log(`✓ Week ${week.week} seeded`);
  }
}

async function seedWeek1Games() {
  console.log('Seeding NFL 2025 Week 1 games...');
  
  // Load Week 1 data
  const schedulePath = path.join(__dirname, '../src/devdata/nfl2025-week1.json');
  const oddsPath = path.join(__dirname, '../src/devdata/nfl2025-week1-odds.json');
  
  const scheduleData = JSON.parse(fs.readFileSync(schedulePath, 'utf8'));
  const oddsData = JSON.parse(fs.readFileSync(oddsPath, 'utf8'));

  const week1Games = scheduleData['2025_01'];
  const week1Odds = oddsData['2025_01'];

  for (const game of week1Games) {
    const gameOdds = week1Odds.find((odd: any) => odd.gameId === game.gameId);
    
    const gameDoc = {
      season: game.season,
      week: game.week,
      gameId: game.gameId,
      kickoffUtc: Timestamp.fromDate(new Date(game.kickoffUtc)),
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      status: game.status,
      sportsbook: gameOdds ? {
        spreadHome: gameOdds.spreadHome,
        spreadAway: gameOdds.spreadAway,
        total: gameOdds.total,
        provider: gameOdds.provider
      } : null
    };

    await setDoc(doc(db, 'games', game.gameId), gameDoc);
    console.log(`✓ Game ${game.gameId} (${game.awayTeam} @ ${game.homeTeam}) seeded`);
  }
}

async function seedTeamLogos() {
  console.log('Seeding team logo URLs...');
  
  const teamLogos = {
    'ARI': 'https://a.espncdn.com/i/teamlogos/nfl/500/ari.png',
    'ATL': 'https://a.espncdn.com/i/teamlogos/nfl/500/atl.png',
    'BAL': 'https://a.espncdn.com/i/teamlogos/nfl/500/bal.png',
    'BUF': 'https://a.espncdn.com/i/teamlogos/nfl/500/buf.png',
    'CAR': 'https://a.espncdn.com/i/teamlogos/nfl/500/car.png',
    'CHI': 'https://a.espncdn.com/i/teamlogos/nfl/500/chi.png',
    'CIN': 'https://a.espncdn.com/i/teamlogos/nfl/500/cin.png',
    'CLE': 'https://a.espncdn.com/i/teamlogos/nfl/500/cle.png',
    'DAL': 'https://a.espncdn.com/i/teamlogos/nfl/500/dal.png',
    'DEN': 'https://a.espncdn.com/i/teamlogos/nfl/500/den.png',
    'DET': 'https://a.espncdn.com/i/teamlogos/nfl/500/det.png',
    'GB': 'https://a.espncdn.com/i/teamlogos/nfl/500/gb.png',
    'HOU': 'https://a.espncdn.com/i/teamlogos/nfl/500/hou.png',
    'IND': 'https://a.espncdn.com/i/teamlogos/nfl/500/ind.png',
    'JAX': 'https://a.espncdn.com/i/teamlogos/nfl/500/jax.png',
    'KC': 'https://a.espncdn.com/i/teamlogos/nfl/500/kc.png',
    'LAC': 'https://a.espncdn.com/i/teamlogos/nfl/500/lac.png',
    'LAR': 'https://a.espncdn.com/i/teamlogos/nfl/500/lar.png',
    'LV': 'https://a.espncdn.com/i/teamlogos/nfl/500/lv.png',
    'MIA': 'https://a.espncdn.com/i/teamlogos/nfl/500/mia.png',
    'MIN': 'https://a.espncdn.com/i/teamlogos/nfl/500/min.png',
    'NE': 'https://a.espncdn.com/i/teamlogos/nfl/500/ne.png',
    'NO': 'https://a.espncdn.com/i/teamlogos/nfl/500/no.png',
    'NYG': 'https://a.espncdn.com/i/teamlogos/nfl/500/nyg.png',
    'NYJ': 'https://a.espncdn.com/i/teamlogos/nfl/500/nyj.png',
    'PHI': 'https://a.espncdn.com/i/teamlogos/nfl/500/phi.png',
    'PIT': 'https://a.espncdn.com/i/teamlogos/nfl/500/pit.png',
    'SEA': 'https://a.espncdn.com/i/teamlogos/nfl/500/sea.png',
    'SF': 'https://a.espncdn.com/i/teamlogos/nfl/500/sf.png',
    'TB': 'https://a.espncdn.com/i/teamlogos/nfl/500/tb.png',
    'TEN': 'https://a.espncdn.com/i/teamlogos/nfl/500/ten.png',
    'WAS': 'https://a.espncdn.com/i/teamlogos/nfl/500/wsh.png'
  };

  await setDoc(doc(db, 'config', 'teamLogos'), teamLogos);
  console.log('✓ Team logos seeded');
}

async function main() {
  try {
    console.log('🏈 Starting NFL 2025 seed process...');
    await seedWeeks();
    await seedWeek1Games();
    await seedTeamLogos();
    console.log('✅ NFL 2025 seed completed successfully!');
    console.log('📊 Week 1 games are now available with real spreads and team logos');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

main();
