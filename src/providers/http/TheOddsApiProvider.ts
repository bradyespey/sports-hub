// src/providers/http/TheOddsApiProvider.ts
import { OddsProvider } from '../interfaces';
import { GameOdds } from '@/types';

export class TheOddsApiProvider implements OddsProvider {
  private apiKey = import.meta.env.VITE_ODDS_API_KEY;
  private baseUrl = 'https://api.the-odds-api.com/v4';

  async getWeekOdds({ season, week }: { season: number; week: number }): Promise<GameOdds[]> {
    if (!this.apiKey) {
      console.warn('The Odds API key not configured, falling back to mock data');
      return [];
    }

    try {
      // The Odds API endpoint for NFL odds
      // Fetching odds data
      const response = await fetch(
        `${this.baseUrl}/sports/americanfootball_nfl/odds?apiKey=${this.apiKey}&regions=us&markets=spreads,totals&oddsFormat=american&dateFormat=iso`
      );

      if (!response.ok) {
        console.error(`The Odds API error: ${response.status} ${response.statusText}`);
        throw new Error(`The Odds API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Transform The Odds API data to our format
      return data.map((game: any) => {
        const spreadMarket = game.bookmakers?.[0]?.markets?.find((m: any) => m.key === 'spreads');
        const totalsMarket = game.bookmakers?.[0]?.markets?.find((m: any) => m.key === 'totals');
        
        const homeTeam = this.normalizeTeamName(game.home_team);
        const awayTeam = this.normalizeTeamName(game.away_team);
        
        // Generate gameId to match our format
        const gameId = `${season}-W${week.toString().padStart(2, '0')}-${awayTeam}-${homeTeam}`;
        
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

        return {
          gameId,
          spreadHome,
          spreadAway,
          total,
          provider: game.bookmakers?.[0]?.title || 'The Odds API'
        };
      }).filter((odds: GameOdds) => {
        // Filter to only include games for the requested week
        // This is a simple filter - in production you'd want more sophisticated date matching
        return true;
      });

      // Successfully loaded odds data

    } catch (error) {
      console.error('Error fetching odds from The Odds API:', error);
      return [];
    }
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
