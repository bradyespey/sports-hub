import { DepthChartProvider } from '@/providers/DepthChartProvider';
import { DepthChart, ProcessedDepthChart, PlayerReference } from '@/types/teams';

// Simple cache for ESPN depth chart data
class ESPNDepthChartCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  set(key: string, data: any, ttl: number = 60 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }
}

const espnDepthChartCache = new ESPNDepthChartCache();

export class EspnDepthChartProvider implements DepthChartProvider {
  private baseUrl = 'https://sports.core.api.espn.com/v2/sports/football/leagues/nfl';

  async getDepthChart(teamId: string, season: number = 2025): Promise<DepthChart | null> {
    try {
      // Check cache first (depth charts change somewhat frequently - cache for 1 hour)
      const cacheKey = `depthchart_${teamId}_${season}`;
      const cachedData = espnDepthChartCache.get(cacheKey);
      
      let data: any;
      if (cachedData) {
        data = cachedData;
      } else {
        const response = await fetch(
          `${this.baseUrl}/seasons/${season}/teams/${teamId}/depthcharts`
        );
        
        if (!response.ok) {
          console.error(`ESPN Depth Chart API error: ${response.status} ${response.statusText}`);
          return null;
        }

        data = await response.json();
        
        // Cache for 1 hour
        espnDepthChartCache.set(cacheKey, data, 60 * 60 * 1000);
      }

      return data as DepthChart;
      
    } catch (error) {
      console.error(`Error fetching depth chart for team ${teamId}:`, error);
      return null;
    }
  }

  async getProcessedDepthChart(teamId: string, season: number = 2025): Promise<ProcessedDepthChart | null> {
    const rawDepthChart = await this.getDepthChart(teamId, season);
    
    if (!rawDepthChart) {
      return null;
    }

    const processed: ProcessedDepthChart = {
      offense: {},
      defense: {},
      specialTeams: {}
    };

    // Position mapping from ESPN abbreviations to our standard abbreviations
    const positionMapping: Record<string, string> = {
      // Offense
      'QB': 'QB',
      'RB': 'RB', 
      'WR': 'WR',
      'TE': 'TE',
      'FB': 'FB',
      'LT': 'LT',
      'LG': 'LG',
      'C': 'C',
      'RG': 'RG',
      'RT': 'RT',
      // Defense
      'LDE': 'LDE',
      'LDT': 'NT', // ESPN uses LDT for nose tackle
      'RDT': 'NT', // ESPN uses RDT for nose tackle  
      'RDE': 'RDE',
      'WLB': 'WLB',
      'MLB': 'LILB', // ESPN uses MLB for middle linebacker
      'SLB': 'SLB',
      'LCB': 'LCB',
      'SS': 'SS',
      'FS': 'FS',
      'RCB': 'RCB',
      'NB': 'NB',
      // Special Teams
      'PK': 'PK',
      'P': 'P',
      'H': 'H',
      'PR': 'PR',
      'KR': 'KR',
      'LS': 'LS'
    };

    // Process each depth chart unit (offense, defense, special teams)
    for (const unit of rawDepthChart.items) {
      const unitName = unit.name.toLowerCase();
      
      // Categorize the unit
      let category: 'offense' | 'defense' | 'specialTeams';
      if (unitName.includes('special')) {
        category = 'specialTeams';
      } else if (unitName.includes('defense') || unitName.includes('4-3') || unitName.includes('3-4')) {
        category = 'defense';
      } else {
        category = 'offense';
      }

      // Process each position in the unit
      for (const [positionKey, positionData] of Object.entries(unit.positions)) {
        const position = positionData.position;
        const espnAbbreviation = position.abbreviation || position.displayName;
        const mappedPosition = positionMapping[espnAbbreviation] || espnAbbreviation;

        // Extract player references (we'll need to fetch full player data separately if needed)
        const players: PlayerReference[] = positionData.athletes
          .sort((a, b) => a.rank - b.rank)
          .map(athlete => {
            // Extract player ID from the $ref URL
            const playerId = athlete.athlete.$ref.split('/').pop()?.split('?')[0] || '';
            
            return {
              id: playerId,
              // We'll populate name and other details when we fetch full player data
            };
          });

        processed[category][mappedPosition] = players;
      }
    }

    return processed;
  }

  // Helper method to fetch player details
  async getPlayerDetails(playerId: string, season: number = 2025): Promise<PlayerReference | null> {
    try {
      const cacheKey = `player_${playerId}_${season}`;
      const cachedData = espnDepthChartCache.get(cacheKey);
      
      let data: any;
      if (cachedData) {
        data = cachedData;
      } else {
        const response = await fetch(
          `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/${season}/athletes/${playerId}`
        );
        
        if (!response.ok) {
          console.error(`ESPN Player API error: ${response.status} ${response.statusText}`);
          return null;
        }

        data = await response.json();
        
        // Cache player data for 6 hours
        espnDepthChartCache.set(cacheKey, data, 6 * 60 * 60 * 1000);
      }

      return {
        id: data.id,
        name: data.name || data.displayName,
        displayName: data.displayName,
        position: data.position?.abbreviation,
        jerseyNumber: data.jersey
      };
      
    } catch (error) {
      console.error(`Error fetching player ${playerId}:`, error);
      return null;
    }
  }

  // Enhanced method that includes player names
  async getEnhancedDepthChart(teamId: string, season: number = 2025): Promise<ProcessedDepthChart | null> {
    const processed = await this.getProcessedDepthChart(teamId, season);
    
    if (!processed) {
      return null;
    }

    // Enhance with player details
    for (const category of ['offense', 'defense', 'specialTeams'] as const) {
      for (const [position, players] of Object.entries(processed[category])) {
        const enhancedPlayers = await Promise.all(
          players.map(async (player) => {
            const details = await this.getPlayerDetails(player.id, season);
            return details || player;
          })
        );
        
        processed[category][position] = enhancedPlayers;
      }
    }

    return processed;
  }
}
