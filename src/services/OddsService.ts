import { collection, doc, getDoc, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { OddsRefreshRequest, OddsRefreshResponse, OddsDoc, WeekDoc, UsageDoc } from '@/types/odds';

export class OddsService {
  
  async refreshOdds(request: OddsRefreshRequest): Promise<OddsRefreshResponse> {
    // Use different URLs for local dev vs production
    const baseUrl = import.meta.env.DEV 
      ? 'http://localhost:8888' 
      : '';
    
    const response = await fetch(`${baseUrl}/.netlify/functions/odds_refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`Odds refresh failed: ${response.status}`);
    }

    return response.json();
  }

  async getWeekDoc(season: number, week: number): Promise<WeekDoc | null> {
    try {
      const weekRef = doc(db, 'weeks', `${season}_W${week.toString().padStart(2, '0')}`);
      const weekDoc = await getDoc(weekRef);
      
      if (weekDoc.exists()) {
        const data = weekDoc.data();
        return {
          ...data,
          lastOddsFetchAt: data.lastOddsFetchAt?.toDate()
        } as WeekDoc;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting week doc:', error);
      return null;
    }
  }

  subscribeToWeekDoc(
    season: number, 
    week: number, 
    callback: (weekDoc: WeekDoc | null) => void
  ): () => void {
    const weekRef = doc(db, 'weeks', `${season}_W${week.toString().padStart(2, '0')}`);

    return onSnapshot(weekRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        callback({
          ...data,
          lastOddsFetchAt: data.lastOddsFetchAt?.toDate()
        } as WeekDoc);
      } else {
        callback(null);
      }
    });
  }

  async getOddsForWeek(season: number, week: number): Promise<Map<string, OddsDoc>> {
    try {
      // Get all games for the week first to know which odds to fetch
      const gamesRef = collection(db, 'games');
      const gamesQuery = query(
        gamesRef,
        where('season', '==', season),
        where('week', '==', week)
      );
      const gamesSnapshot = await getDocs(gamesQuery);
      const gameIds = gamesSnapshot.docs.map(doc => doc.id);

      // Get odds for these games
      const oddsMap = new Map<string, OddsDoc>();
      
      for (const gameId of gameIds) {
        const oddsRef = doc(db, 'odds', gameId);
        const oddsDoc = await getDoc(oddsRef);
        
        if (oddsDoc.exists()) {
          const data = oddsDoc.data();
          oddsMap.set(gameId, {
            ...data,
            fetchedAt: data.fetchedAt.toDate()
          } as OddsDoc);
        }
      }
      
      return oddsMap;
    } catch (error) {
      console.error('Error getting odds for week:', error);
      return new Map();
    }
  }

  subscribeToWeekOdds(
    season: number,
    week: number,
    callback: (odds: Map<string, OddsDoc>) => void
  ): () => void {
    // This is a simplified version - in practice you'd want to set up
    // listeners for all the individual odds docs for the week
    const unsubscribeFunctions: (() => void)[] = [];

    // First get the game IDs for this week
    const gamesRef = collection(db, 'games');
    const gamesQuery = query(
      gamesRef,
      where('season', '==', season),
      where('week', '==', week)
    );

    getDocs(gamesQuery).then(gamesSnapshot => {
      const gameIds = gamesSnapshot.docs.map(doc => doc.id);
      const oddsMap = new Map<string, OddsDoc>();

      // Set up listeners for each game's odds
      gameIds.forEach(gameId => {
        const oddsRef = doc(db, 'odds', gameId);
        const unsubscribe = onSnapshot(oddsRef, (doc) => {
          if (doc.exists()) {
            const data = doc.data();
            oddsMap.set(gameId, {
              ...data,
              fetchedAt: data.fetchedAt.toDate()
            } as OddsDoc);
          } else {
            oddsMap.delete(gameId);
          }
          callback(new Map(oddsMap));
        });
        unsubscribeFunctions.push(unsubscribe);
      });
    });

    return () => {
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    };
  }

  async getUsage(): Promise<UsageDoc | null> {
    try {
      const usageRef = doc(db, 'system', 'usage');
      const usageDoc = await getDoc(usageRef);
      
      if (usageDoc.exists()) {
        const data = usageDoc.data();
        return {
          ...data,
          lastRequestAt: data.lastRequestAt.toDate()
        } as UsageDoc;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting usage:', error);
      return null;
    }
  }

  transformOddsToGameData(oddsDoc: OddsDoc): any {
    if (!oddsDoc.data?.bookmakers?.[0]?.markets?.[0]?.outcomes) {
      return null;
    }

    const market = oddsDoc.data.bookmakers[0].markets[0];
    const outcomes = market.outcomes;
    
    // Find home and away outcomes
    const homeOutcome = outcomes.find((o: any) => 
      o.name === oddsDoc.data.home_team
    );
    const awayOutcome = outcomes.find((o: any) => 
      o.name === oddsDoc.data.away_team
    );

    return {
      spreadHome: homeOutcome?.point || 0,
      spreadAway: awayOutcome?.point || 0,
      homeOdds: homeOutcome?.price || 0,
      awayOdds: awayOutcome?.price || 0,
      provider: 'The Odds API',
      fetchedAt: oddsDoc.fetchedAt,
      locked: oddsDoc.locked
    };
  }

  getDataFreshness(fetchedAt: Date): string {
    const now = new Date();
    const ageMinutes = Math.floor((now.getTime() - fetchedAt.getTime()) / (1000 * 60));
    
    if (ageMinutes < 1) return 'Just now';
    if (ageMinutes < 60) return `${ageMinutes}m ago`;
    
    const ageHours = Math.floor(ageMinutes / 60);
    if (ageHours < 24) return `${ageHours}h ago`;
    
    const ageDays = Math.floor(ageHours / 24);
    return `${ageDays}d ago`;
  }
}
