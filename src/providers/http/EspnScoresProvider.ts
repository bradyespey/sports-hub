// src/providers/http/EspnScoresProvider.ts
import { ScoresProvider } from '../interfaces';
import { GameMeta, GameScore } from '@/types';

export class EspnScoresProvider implements ScoresProvider {
  private baseUrl = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';

  async getWeekSchedule({ season, week }: { season: number; week: number }): Promise<GameMeta[]> {
    try {
      // ESPN API endpoint for NFL schedule
      // Fetching ESPN schedule
      const response = await fetch(
        `${this.baseUrl}/scoreboard?seasontype=2&week=${week}`
      );

      if (!response.ok) {
        console.error(`ESPN API error: ${response.status} ${response.statusText}`);
        throw new Error(`ESPN API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      const events = data.events?.map((event: any) => {
        const competition = event.competitions[0];
        const homeTeam = competition.competitors.find((c: any) => c.homeAway === 'home');
        const awayTeam = competition.competitors.find((c: any) => c.homeAway === 'away');
        
        // Normalize team abbreviations to match our data
        const normalizedAway = this.normalizeTeamAbbreviation(awayTeam.team.abbreviation);
        const normalizedHome = this.normalizeTeamAbbreviation(homeTeam.team.abbreviation);
        
        // Extract broadcast information if available
        const broadcast = competition.broadcasts?.[0];
        const network = broadcast?.names?.[0] || broadcast?.network || null;

        return {
          gameId: `${season}-W${week.toString().padStart(2, '0')}-${normalizedAway}-${normalizedHome}`,
          season,
          week,
          kickoffUtc: new Date(event.date),
          homeTeam: normalizedHome,
          awayTeam: normalizedAway,
          status: this.mapGameStatus(competition.status.type.name),
          network
        };
      }) || [];

      // Successfully loaded schedule
      return events;

    } catch (error) {
      console.error('Error fetching schedule from ESPN:', error);
      return [];
    }
  }

  async getLiveScores({ gameIds }: { gameIds: string[] }): Promise<GameScore[]> {
    try {
      // For live scores, we'll fetch the current week's scoreboard
      // ESPN doesn't have a direct endpoint for specific game IDs, so we fetch all and filter
      // Fetching live scores
      // Fetch current week's scoreboard instead of today's date
      const response = await fetch(
        `${this.baseUrl}/scoreboard?seasontype=2&week=1`
      );

      if (!response.ok) {
        throw new Error(`ESPN API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      const scores = data.events?.map((event: any) => {
        const competition = event.competitions[0];
        const homeTeam = competition.competitors.find((c: any) => c.homeAway === 'home');
        const awayTeam = competition.competitors.find((c: any) => c.homeAway === 'away');
        
        // Extract game ID from our format
        const normalizedAway = this.normalizeTeamAbbreviation(awayTeam.team.abbreviation);
        const normalizedHome = this.normalizeTeamAbbreviation(homeTeam.team.abbreviation);
        
        const gameId = gameIds.find(id => {
          const parts = id.split('-');
          return parts.length >= 4 && 
                 parts[2] === normalizedAway && 
                 parts[3] === normalizedHome;
        });

        if (!gameId) return null;

        // Extract broadcast information if available
        const broadcast = competition.broadcasts?.[0];
        const network = broadcast?.names?.[0] || broadcast?.network || null;

        return {
          gameId,
          homeScore: parseInt(homeTeam.score) || 0,
          awayScore: parseInt(awayTeam.score) || 0,
          status: this.mapGameStatus(competition.status.type.name),
          quarter: competition.status.period || undefined,
          timeRemaining: competition.status.displayClock || undefined,
          possession: this.getPossession(competition),
          network
        };
      }).filter(Boolean) || [];

      // Successfully loaded live scores
      return scores;

    } catch (error) {
      console.error('Error fetching live scores from ESPN:', error);
      return [];
    }
  }

  private normalizeTeamAbbreviation(abbrev: string): string {
    // Map ESPN abbreviations to our standard format
    const teamMap: Record<string, string> = {
      'WSH': 'WAS',  // Washington Commanders
      'LAR': 'LAR',  // Los Angeles Rams (already correct)
      'LAC': 'LAC',  // Los Angeles Chargers (already correct)
    };

    return teamMap[abbrev] || abbrev;
  }

  private getPossession(competition: any): string | undefined {
    // Try to get possession information from ESPN data
    const situation = competition.situation;
    if (situation && situation.possession) {
      const possessionTeam = competition.competitors.find((c: any) => 
        c.id === situation.possession
      );
      if (possessionTeam) {
        return this.normalizeTeamAbbreviation(possessionTeam.team.abbreviation);
      }
    }
    return undefined;
  }

  private mapGameStatus(espnStatus: string): 'scheduled' | 'live' | 'final' {
    const statusMap: Record<string, 'scheduled' | 'live' | 'final'> = {
      'STATUS_SCHEDULED': 'scheduled',
      'STATUS_IN_PROGRESS': 'live',
      'STATUS_HALFTIME': 'live',
      'STATUS_END_PERIOD': 'live',
      'STATUS_FINAL': 'final',
      'STATUS_FINAL_OVERTIME': 'final'
    };

    return statusMap[espnStatus] || 'scheduled';
  }
}
