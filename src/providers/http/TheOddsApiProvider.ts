// src/providers/http/TheOddsApiProvider.ts
import { OddsProvider } from '../interfaces';
import { GameOdds } from '@/types';
import { apiCache } from '@/lib/apiCache';

export class TheOddsApiProvider implements OddsProvider {
  private apiKey = import.meta.env.VITE_ODDS_API_KEY;
  private baseUrl = import.meta.env.VITE_ODDS_API_URL || 'https://api.the-odds-api.com/v4';
  private static callCount = 0;

  async getWeekOdds({ season, week }: { season: number; week: number }): Promise<GameOdds[]> {
    if (!this.apiKey) {
      throw new Error('The Odds API key not configured');
      return [];
    }

    // Check cache first
    const cacheKey = `odds_${season}_${week}`;
    const cachedData = apiCache.get<GameOdds[]>(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    if (week < 1) {
      return [];
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/sports/americanfootball_nfl/odds?apiKey=${this.apiKey}&regions=us&markets=spreads,totals&oddsFormat=american&dateFormat=iso`
      );

      if (!response.ok) {
        console.error(`The Odds API error: ${response.status} ${response.statusText}`);
        return [];
      }

      const data = await response.json();
      
      // Transform The Odds API data to our format
      const result = data.flatMap((game: any) => {
        const spreadMarket = game.bookmakers?.[0]?.markets?.find((m: any) => m.key === 'spreads');
        const totalsMarket = game.bookmakers?.[0]?.markets?.find((m: any) => m.key === 'totals');
        
        const homeTeam = this.normalizeTeamName(game.home_team);
        const awayTeam = this.normalizeTeamName(game.away_team);
        
        // Try both possible gameId formats since team order might vary
        const gameId1 = `${season}-W${week.toString().padStart(2, '0')}-${awayTeam}-${homeTeam}`;
        const gameId2 = `${season}-W${week.toString().padStart(2, '0')}-${homeTeam}-${awayTeam}`;
        
        // We'll use the first format as primary, but we'll check both during matching
        const gameId = gameId1;
        
        let spreadHome = 0;
        let spreadAway = 0;
        let total = 0;

        if (spreadMarket?.outcomes) {
          const homeSpread = spreadMarket.outcomes.find((o: any) => 
            this.normalizeTeamName(o.name) === homeTeam
          );
          const awaySpread = spreadMarket.outcomes.find((o: any) => 
            this.normalizeTeamName(o.name) === awayTeam
          );
          
          spreadHome = homeSpread?.point || 0;
          spreadAway = awaySpread?.point || 0;
        }

        if (totalsMarket?.outcomes?.[0]) {
          total = totalsMarket.outcomes[0].point || 0;
        }


        // Return both possible game ID formats for this game
        return [
          {
            gameId: gameId1,
            spreadHome,
            spreadAway,
            total,
            provider: game.bookmakers?.[0]?.title || 'The Odds API'
          },
          {
            gameId: gameId2,
            spreadHome,
            spreadAway,
            total,
            provider: game.bookmakers?.[0]?.title || 'The Odds API'
          }
        ];
      }); // flatMap already handles the flattening, no additional filter needed for now

      // Cache the successful result
      apiCache.set(cacheKey, result, 5 * 60 * 1000);

      return result;

    } catch (error) {
      console.error('Error fetching odds from The Odds API:', error);
      console.warn('API error occurred, returning empty odds data');
      // Return empty array - no fallback to mock data
      return [];
    }
  }

  private getWeekStartDate(week: number): Date {
    // For testing purposes, use current date + week offset
    // In production, this would be the actual NFL 2025 season dates
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + (week - 1) * 7);
    return weekStart;
  }

  private getWeekEndDate(week: number): Date {
    const weekStart = this.getWeekStartDate(week);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7); // 7 days later
    return weekEnd;
  }

  private normalizeTeamName(teamName: string): string {
    // Map full team names to abbreviations
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
