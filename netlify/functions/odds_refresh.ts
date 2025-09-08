import { Handler } from '@netlify/functions';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// Initialize Firebase Admin (only once)
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();

interface GameDoc {
  season: number;
  week: number;
  gameId: string;
  kickoffUtc: Date;
  homeTeam: string;
  awayTeam: string;
  status: 'scheduled' | 'live' | 'final';
}

interface OddsDoc {
  gameId: string;
  market: 'h2h';
  provider: 'oddsapi';
  data: any;
  fetchedAt: Date;
  locked: boolean;
}

interface WeekDoc {
  season: number;
  week: number;
  hasAnyOdds: boolean;
  lastOddsFetchAt?: Date;
}

interface OddsRefreshRequest {
  season?: number;
  week?: number;
  mode: 'manual' | 'daily' | 'bootstrap';
}

class OddsRefreshService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.ODDS_API_KEY || '';
    this.baseUrl = 'https://api.the-odds-api.com/v4';
  }

  getCurrentNFLWeek(): { season: number; week: number } {
    // Simple calculation - in production this would be more sophisticated
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // NFL season starts first Thursday of September
    // For now, use a simple week calculation
    const seasonStart = new Date(currentYear, 8, 7); // Sept 7th approx
    const weeksPassed = Math.floor((now.getTime() - seasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
    
    return {
      season: currentYear,
      week: Math.max(1, Math.min(22, weeksPassed + 1))
    };
  }

  async getGamesForWeek(season: number, week: number): Promise<GameDoc[]> {
    const gamesRef = db.collection('games');
    const snapshot = await gamesRef
      .where('season', '==', season)
      .where('week', '==', week)
      .get();

    return snapshot.docs.map(doc => ({
      ...doc.data(),
      kickoffUtc: doc.data().kickoffUtc.toDate()
    })) as GameDoc[];
  }

  async getExistingOdds(gameIds: string[]): Promise<Map<string, OddsDoc>> {
    const oddsMap = new Map<string, OddsDoc>();
    
    for (const gameId of gameIds) {
      const oddsDoc = await db.collection('odds').doc(gameId).get();
      if (oddsDoc.exists) {
        const data = oddsDoc.data()!;
        oddsMap.set(gameId, {
          ...data,
          fetchedAt: data.fetchedAt.toDate()
        } as OddsDoc);
      }
    }
    
    return oddsMap;
  }

  async getWeekDoc(season: number, week: number): Promise<WeekDoc | null> {
    const weekRef = db.collection('weeks').doc(`${season}_W${week.toString().padStart(2, '0')}`);
    const weekDoc = await weekRef.get();
    
    if (weekDoc.exists) {
      const data = weekDoc.data()!;
      return {
        ...data,
        lastOddsFetchAt: data.lastOddsFetchAt?.toDate()
      } as WeekDoc;
    }
    
    return null;
  }

  partitionGames(games: GameDoc[], existingOdds: Map<string, OddsDoc>, now: Date) {
    const missingLocked: GameDoc[] = [];
    const eligible: GameDoc[] = [];
    const alreadyLocked: GameDoc[] = [];
    const notEligible: GameDoc[] = [];

    for (const game of games) {
      const hasOdds = existingOdds.has(game.gameId);
      const isLocked = game.kickoffUtc < now;
      
      if (isLocked && !hasOdds) {
        missingLocked.push(game);
      } else if (isLocked && hasOdds) {
        alreadyLocked.push(game);
      } else if (!isLocked) {
        eligible.push(game);
      } else {
        notEligible.push(game);
      }
    }

    return { missingLocked, eligible, alreadyLocked, notEligible };
  }

  async fetchOddsFromProvider(): Promise<{ data: any[], cost: number }> {
    const response = await fetch(
      `${this.baseUrl}/sports/americanfootball_nfl/odds?apiKey=${this.apiKey}&regions=us&markets=h2h&oddsFormat=american&dateFormat=iso`
    );

    if (!response.ok) {
      throw new Error(`Odds API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const cost = parseInt(response.headers.get('x-requests-last') || '1');
    
    // Update usage tracking
    const used = parseInt(response.headers.get('x-requests-used') || '0');
    const remaining = parseInt(response.headers.get('x-requests-remaining') || '0');
    
    await this.updateUsage(used, remaining, cost);

    return { data, cost };
  }

  async updateUsage(used: number, remaining: number, lastCost: number): Promise<void> {
    await db.collection('system').doc('usage').set({
      used,
      remaining,
      lastCost,
      lastRequestAt: Timestamp.now()
    });
  }

  async saveOdds(games: GameDoc[], providerData: any[], isLocked: boolean): Promise<number> {
    let savedCount = 0;
    const batch = db.batch();

    for (const game of games) {
      // Find matching odds in provider data
      const matchingOdds = providerData.find(odds => 
        this.normalizeTeamName(odds.home_team) === game.homeTeam &&
        this.normalizeTeamName(odds.away_team) === game.awayTeam
      );

      if (matchingOdds) {
        const oddsRef = db.collection('odds').doc(game.gameId);
        batch.set(oddsRef, {
          gameId: game.gameId,
          market: 'h2h',
          provider: 'oddsapi',
          data: matchingOdds,
          fetchedAt: Timestamp.now(),
          locked: isLocked
        });
        savedCount++;
      }
    }

    await batch.commit();
    return savedCount;
  }

  async updateWeekDoc(season: number, week: number): Promise<void> {
    const weekRef = db.collection('weeks').doc(`${season}_W${week.toString().padStart(2, '0')}`);
    await weekRef.set({
      season,
      week,
      hasAnyOdds: true,
      lastOddsFetchAt: Timestamp.now()
    }, { merge: true });
  }

  private normalizeTeamName(teamName: string): string {
    const teamMap: Record<string, string> = {
      'Arizona Cardinals': 'ARI',
      'Atlanta Falcons': 'ATL',
      'Baltimore Ravens': 'BAL',
      'Buffalo Bills': 'BUF',
      'Carolina Panthers': 'CAR',
      'Chicago Bears': 'CHI',
      'Cincinnati Bengals': 'CIN',
      'Cleveland Browns': 'CLE',
      'Dallas Cowboys': 'DAL',
      'Denver Broncos': 'DEN',
      'Detroit Lions': 'DET',
      'Green Bay Packers': 'GB',
      'Houston Texans': 'HOU',
      'Indianapolis Colts': 'IND',
      'Jacksonville Jaguars': 'JAX',
      'Kansas City Chiefs': 'KC',
      'Las Vegas Raiders': 'LV',
      'Los Angeles Chargers': 'LAC',
      'Los Angeles Rams': 'LAR',
      'Miami Dolphins': 'MIA',
      'Minnesota Vikings': 'MIN',
      'New England Patriots': 'NE',
      'New Orleans Saints': 'NO',
      'New York Giants': 'NYG',
      'New York Jets': 'NYJ',
      'Philadelphia Eagles': 'PHI',
      'Pittsburgh Steelers': 'PIT',
      'San Francisco 49ers': 'SF',
      'Seattle Seahawks': 'SEA',
      'Tampa Bay Buccaneers': 'TB',
      'Tennessee Titans': 'TEN',
      'Washington Commanders': 'WAS'
    };

    return teamMap[teamName] || teamName;
  }
}

export const handler: Handler = async (event, context) => {
  try {
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

    const request: OddsRefreshRequest = JSON.parse(event.body || '{}');
    const service = new OddsRefreshService();
    const now = new Date();

    // Resolve target week
    const currentWeek = service.getCurrentNFLWeek();
    const targetSeason = request.season || currentWeek.season;
    const targetWeek = request.week || currentWeek.week;

    console.log(`Odds refresh: mode=${request.mode}, target=${targetSeason}_W${targetWeek}`);

    // Check if we should skip (bootstrap mode only)
    if (request.mode === 'bootstrap') {
      const weekDoc = await service.getWeekDoc(targetSeason, targetWeek);
      if (weekDoc?.hasAnyOdds) {
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: true,
            week: targetWeek,
            season: targetSeason,
            fetched: { missingLocked: 0, eligible: 0 },
            skipped: { alreadyLocked: 0, notEligible: 0 },
            usage: { remaining: 0, cost: 0 },
            message: 'Week already has odds, skipping bootstrap'
          })
        };
      }
    }

    // Get games for the week
    const games = await service.getGamesForWeek(targetSeason, targetWeek);
    const gameIds = games.map(g => g.gameId);
    const existingOdds = await service.getExistingOdds(gameIds);

    // Partition games
    const partitioned = service.partitionGames(games, existingOdds, now);

    // Determine what to fetch
    let gamesToFetch: GameDoc[] = [];
    
    // Always fetch missing locked games (fill once then lock)
    gamesToFetch.push(...partitioned.missingLocked);
    
    // Fetch eligible games for manual/daily/bootstrap modes
    if (['manual', 'daily', 'bootstrap'].includes(request.mode)) {
      gamesToFetch.push(...partitioned.eligible);
    }

    let totalCost = 0;
    let fetchedCounts = { missingLocked: 0, eligible: 0 };

    if (gamesToFetch.length > 0) {
      // Fetch from provider
      const { data, cost } = await service.fetchOddsFromProvider();
      totalCost = cost;

      // Save missing locked games (and lock them)
      if (partitioned.missingLocked.length > 0) {
        fetchedCounts.missingLocked = await service.saveOdds(partitioned.missingLocked, data, true);
      }

      // Save eligible games (don't lock them yet)
      if (partitioned.eligible.length > 0 && ['manual', 'daily', 'bootstrap'].includes(request.mode)) {
        fetchedCounts.eligible = await service.saveOdds(partitioned.eligible, data, false);
      }

      // Update week doc
      await service.updateWeekDoc(targetSeason, targetWeek);
    }

    // Get current usage for response
    const usageDoc = await db.collection('system').doc('usage').get();
    const usage = usageDoc.exists ? usageDoc.data() : { remaining: 500 };

    const response = {
      success: true,
      week: targetWeek,
      season: targetSeason,
      fetched: fetchedCounts,
      skipped: {
        alreadyLocked: partitioned.alreadyLocked.length,
        notEligible: partitioned.notEligible.length
      },
      usage: {
        remaining: usage?.remaining || 500,
        cost: totalCost
      }
    };

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('Odds refresh error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
