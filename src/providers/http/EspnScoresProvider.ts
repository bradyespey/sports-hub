// src/providers/http/EspnScoresProvider.ts
import { ScoresProvider } from '../interfaces';
import { GameMeta, GameScore } from '@/types';
import { getCurrentNFLWeek } from '@/lib/dayjs';

// Simple cache to prevent excessive ESPN API calls
class ESPNCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  
  set(key: string, data: any, ttlMs: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    });
  }
  
  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
}

const espnCache = new ESPNCache();

export class EspnScoresProvider implements ScoresProvider {
  private baseUrl = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';

  async getWeekSchedule({ season, week }: { season: number; week: number }): Promise<GameMeta[]> {
    try {
      // Check cache first (30 minutes for schedule data)
      const cacheKey = `schedule_${season}_${week}`;
      const cachedData = espnCache.get(cacheKey);
      
      let data: any;
      if (cachedData) {
        data = cachedData;
      } else {
        // ESPN API endpoint for NFL schedule
        const response = await fetch(
          `${this.baseUrl}/scoreboard?seasontype=2&week=${week}`
        );

        if (!response.ok) {
          console.error(`ESPN API error: ${response.status} ${response.statusText}`);
          throw new Error(`ESPN API error: ${response.status} ${response.statusText}`);
        }

        data = await response.json();
        
        // Cache for 30 minutes (schedule doesn't change frequently)
        espnCache.set(cacheKey, data, 30 * 60 * 1000);
      }
      
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
          status: this.mapGameStatus(competition.status.type.name, competition),
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
      if (gameIds.length === 0) return [];
      
      // Extract week from the first gameId (format: 2025-W01-TEAM-TEAM)
      const weekMatch = gameIds[0].match(/W(\d+)/);
      const week = weekMatch ? parseInt(weekMatch[1]) : getCurrentNFLWeek();
      
      // Check cache first (shorter cache for live scores - 30 seconds)
      const cacheKey = `scores_live_week${week}`;
      const cachedData = espnCache.get(cacheKey);
      
      let data: any;
      if (cachedData) {
        data = cachedData;
      } else {
        // For live scores, we'll fetch the requested week's scoreboard
        // ESPN doesn't have a direct endpoint for specific game IDs, so we fetch all and filter
        const response = await fetch(
          `${this.baseUrl}/scoreboard?seasontype=2&week=${week}`
        );

        if (!response.ok) {
          throw new Error(`ESPN API error: ${response.status} ${response.statusText}`);
        }

        data = await response.json();
        
        // Cache for only 30 seconds (scores change frequently during games)
        espnCache.set(cacheKey, data, 30 * 1000);
      }
      
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
          status: this.mapGameStatus(competition.status.type.name, competition),
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

  private mapGameStatus(espnStatus: string, competition?: any): 'scheduled' | 'live' | 'final' {
    const statusMap: Record<string, 'scheduled' | 'live' | 'final'> = {
      'STATUS_SCHEDULED': 'scheduled',
      'STATUS_IN_PROGRESS': 'live',
      'STATUS_HALFTIME': 'live',
      'STATUS_END_PERIOD': 'live',
      'STATUS_FINAL': 'final',
      'STATUS_FINAL_OVERTIME': 'final'
    };

    let mappedStatus = statusMap[espnStatus] || 'scheduled';
    
    // Additional check: if ESPN says in progress but it's been more than 4 hours since start
    // and we have a final score, mark as final
    if (mappedStatus === 'live' && competition) {
      const startTime = new Date(competition.date);
      const now = new Date();
      const hoursElapsed = (now.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      
      // If more than 4 hours have passed, likely the game is finished
      if (hoursElapsed > 4) {
        mappedStatus = 'final';
      }
    }
    
    return mappedStatus;
  }
}
