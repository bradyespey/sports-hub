import { collection, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { GameOdds } from '@/types';

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

interface APIUsage {
  used: number;
  remaining: number;
  lastCost: number;
  lastUpdate: Date;
}

export class SnapshotService {
  
  async getWeekSnapshot(season: number, week: number, dataType: 'odds' | 'scores'): Promise<WeekSnapshot | null> {
    try {
      const snapshotRef = doc(
        db,
        'weeks',
        `${season}_W${week.toString().padStart(2, '0')}`,
        'snapshots',
        dataType
      );
      
      const snapshotDoc = await getDoc(snapshotRef);
      
      if (snapshotDoc.exists()) {
        const data = snapshotDoc.data();
        return {
          ...data,
          fetchedAt: data.fetchedAt.toDate()
        } as WeekSnapshot;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting snapshot:', error);
      return null;
    }
  }

  subscribeToWeekSnapshot(
    season: number, 
    week: number, 
    dataType: 'odds' | 'scores',
    callback: (snapshot: WeekSnapshot | null) => void
  ): () => void {
    const snapshotRef = doc(
      db,
      'weeks',
      `${season}_W${week.toString().padStart(2, '0')}`,
      'snapshots',
      dataType
    );

    return onSnapshot(snapshotRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        callback({
          ...data,
          fetchedAt: data.fetchedAt.toDate()
        } as WeekSnapshot);
      } else {
        callback(null);
      }
    });
  }

  async getAPIUsage(): Promise<APIUsage | null> {
    try {
      const usageRef = doc(db, 'system', 'api_usage');
      const usageDoc = await getDoc(usageRef);
      
      if (usageDoc.exists()) {
        const data = usageDoc.data();
        return {
          ...data,
          lastUpdate: data.lastUpdate.toDate()
        } as APIUsage;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting API usage:', error);
      return null;
    }
  }

  async triggerPulse(season: number, week: number): Promise<void> {
    try {
      const response = await fetch(`/.netlify/functions/pulse?action=pulse&season=${season}&week=${week}`, {
        method: 'GET'
      });
      
      if (!response.ok) {
        throw new Error(`Pulse trigger failed: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Pulse triggered:', result);
    } catch (error) {
      console.error('Error triggering pulse:', error);
    }
  }

  transformOddsSnapshot(snapshot: WeekSnapshot): GameOdds[] {
    if (!snapshot.odds) return [];

    return snapshot.odds.map((game: any) => {
      // Transform The Odds API format to our GameOdds format
      const homeMarket = game.bookmakers?.[0]?.markets?.find((m: any) => m.key === 'h2h');
      const homeOutcome = homeMarket?.outcomes?.find((o: any) => o.name === game.home_team);
      const awayOutcome = homeMarket?.outcomes?.find((o: any) => o.name === game.away_team);

      // Normalize team names
      const homeTeam = this.normalizeTeamName(game.home_team);
      const awayTeam = this.normalizeTeamName(game.away_team);

      // Generate possible game IDs
      const season = snapshot.season;
      const week = snapshot.week;
      const gameId1 = `${season}-W${week.toString().padStart(2, '0')}-${awayTeam}-${homeTeam}`;
      const gameId2 = `${season}-W${week.toString().padStart(2, '0')}-${homeTeam}-${awayTeam}`;

      // Create odds for both possible game ID formats
      const baseOdds = {
        spreadHome: homeOutcome?.point || 0,
        spreadAway: awayOutcome?.point || 0,
        total: 0, // h2h market doesn't have totals
        provider: 'The Odds API (Snapshot)'
      };

      return [
        { gameId: gameId1, ...baseOdds },
        { gameId: gameId2, ...baseOdds }
      ];
    }).flat();
  }

  getDataFreshness(snapshot: WeekSnapshot | null): string {
    if (!snapshot) return 'No data';
    
    const now = new Date();
    const fetchedAt = new Date(snapshot.fetchedAt);
    const ageMinutes = Math.floor((now.getTime() - fetchedAt.getTime()) / (1000 * 60));
    
    if (ageMinutes < 1) return 'Just now';
    if (ageMinutes < 60) return `${ageMinutes}m ago`;
    
    const ageHours = Math.floor(ageMinutes / 60);
    if (ageHours < 24) return `${ageHours}h ago`;
    
    const ageDays = Math.floor(ageHours / 24);
    return `${ageDays}d ago`;
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
