import type { Handler } from "@netlify/functions";
import * as admin from "firebase-admin";

let app: admin.app.App | null = null;

function getDb() {
  if (!app) {
    app = admin.initializeApp({
      credential: admin.credential.cert({
        project_id: process.env.FIREBASE_PROJECT_ID,
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        private_key: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
      }),
    });
  }
  return admin.firestore();
}

interface APIUsage {
  used: number;
  remaining: number;
  lastCost: number;
  lastUpdate: Date;
}

interface WeekSnapshot {
  season: number;
  week: number;
  odds?: any[];
  scores?: any[];
  fetchedAt: Date;
  dataType: 'odds' | 'scores';
  provider: string;
  markets?: string;
  regions?: string;
}

class OddsAPIClient {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.ODDS_API_KEY || '';
    this.baseUrl = 'https://api.the-odds-api.com/v4';
  }

  async getUsage(): Promise<APIUsage | null> {
    try {
      const db = getDb();
      const usageDoc = await db.collection('system').doc('api_usage').get();
      return usageDoc.exists ? usageDoc.data() as APIUsage : null;
    } catch (error) {
      console.error('Error getting usage:', error);
      return null;
    }
  }

  async updateUsage(used: number, remaining: number, lastCost: number): Promise<void> {
    try {
      const db = getDb();
      await db.collection('system').doc('api_usage').set({
        used,
        remaining,
        lastCost,
        lastUpdate: new Date()
      });
    } catch (error) {
      console.error('Error updating usage:', error);
    }
  }

  async getWeekSnapshot(season: number, week: number, dataType: 'odds' | 'scores'): Promise<WeekSnapshot | null> {
    try {
      const db = getDb();
      const snapshotDoc = await db
        .collection('weeks')
        .doc(`${season}_W${week.toString().padStart(2, '0')}`)
        .collection('snapshots')
        .doc(dataType)
        .get();
      
      return snapshotDoc.exists ? snapshotDoc.data() as WeekSnapshot : null;
    } catch (error) {
      console.error('Error getting snapshot:', error);
      return null;
    }
  }

  async saveWeekSnapshot(snapshot: WeekSnapshot): Promise<void> {
    try {
      const db = getDb();
      await db
        .collection('weeks')
        .doc(`${snapshot.season}_W${snapshot.week.toString().padStart(2, '0')}`)
        .collection('snapshots')
        .doc(snapshot.dataType)
        .set(snapshot);
    } catch (error) {
      console.error('Error saving snapshot:', error);
    }
  }

  async fetchOdds(season: number, week: number): Promise<any[]> {
    const response = await fetch(
      `${this.baseUrl}/sports/americanfootball_nfl/odds?apiKey=${this.apiKey}&regions=us&markets=h2h&oddsFormat=american&dateFormat=iso`
    );

    if (!response.ok) {
      throw new Error(`Odds API error: ${response.status}`);
    }

    // Update usage tracking
    const used = parseInt(response.headers.get('x-requests-used') || '0');
    const remaining = parseInt(response.headers.get('x-requests-remaining') || '0');
    const lastCost = parseInt(response.headers.get('x-requests-last') || '1');
    
    await this.updateUsage(used, remaining, lastCost);

    return response.json();
  }

  async fetchScores(includePast: boolean = false): Promise<any[]> {
    let url = `${this.baseUrl}/sports/americanfootball_nfl/scores?apiKey=${this.apiKey}&dateFormat=iso`;
    if (includePast) {
      url += '&daysFrom=1';
    }

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Scores API error: ${response.status}`);
    }

    // Update usage tracking
    const used = parseInt(response.headers.get('x-requests-used') || '0');
    const remaining = parseInt(response.headers.get('x-requests-remaining') || '0');
    const lastCost = parseInt(response.headers.get('x-requests-last') || '1');
    
    await this.updateUsage(used, remaining, lastCost);

    return response.json();
  }

  shouldFetchOdds(snapshot: WeekSnapshot | null): boolean {
    if (!snapshot) return true;
    
    const now = new Date();
    const fetchedAt = new Date(snapshot.fetchedAt);
    const ageMinutes = (now.getTime() - fetchedAt.getTime()) / (1000 * 60);
    
    // Fetch odds every 15-30 minutes during pre-game window
    return ageMinutes > 15;
  }

  shouldFetchScores(snapshot: WeekSnapshot | null): boolean {
    if (!snapshot) return true;
    
    const now = new Date();
    const fetchedAt = new Date(snapshot.fetchedAt);
    const ageMinutes = (now.getTime() - fetchedAt.getTime()) / (1000 * 60);
    
    // Fetch scores every 1-2 minutes during games
    return ageMinutes > 1;
  }
}

export const handler: Handler = async (event, context) => {
  try {
    const { action = 'pulse', season = 2025, week = 1 } = event.queryStringParameters || {};
    const client = new OddsAPIClient();

    // Check current usage
    const usage = await client.getUsage();
    if (usage && usage.remaining < 50) {
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          message: 'API quota low, using cached data only',
          usage 
        })
      };
    }

    if (action === 'pulse') {
      const results: any = { season, week, updated: [] };

      // Check if we should fetch odds
      const oddsSnapshot = await client.getWeekSnapshot(season, week, 'odds');
      if (client.shouldFetchOdds(oddsSnapshot)) {
        try {
          const odds = await client.fetchOdds(season, week);
          await client.saveWeekSnapshot({
            season,
            week,
            odds,
            fetchedAt: new Date(),
            dataType: 'odds',
            provider: 'The Odds API',
            markets: 'h2h',
            regions: 'us'
          });
          results.updated.push('odds');
        } catch (error) {
          console.error('Failed to fetch odds:', error);
        }
      }

      // Check if we should fetch scores
      const scoresSnapshot = await client.getWeekSnapshot(season, week, 'scores');
      if (client.shouldFetchScores(scoresSnapshot)) {
        try {
          const scores = await client.fetchScores();
          await client.saveWeekSnapshot({
            season,
            week,
            scores,
            fetchedAt: new Date(),
            dataType: 'scores',
            provider: 'The Odds API'
          });
          results.updated.push('scores');
        } catch (error) {
          console.error('Failed to fetch scores:', error);
        }
      }

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(results)
      };
    }

    if (action === 'usage') {
      const usage = await client.getUsage();
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(usage || { message: 'No usage data available' })
      };
    }

    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid action' })
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
