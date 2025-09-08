import { TeamsProvider } from '@/providers/TeamsProvider';
import { ESPNTeam, Team } from '@/types/teams';

// Simple cache for ESPN teams data
class ESPNTeamsCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  set(key: string, data: any, ttl: number = 30 * 60 * 1000): void {
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

const espnTeamsCache = new ESPNTeamsCache();

export class EspnTeamsProvider implements TeamsProvider {
  private baseUrl = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';

  // Division mappings
  private divisionMap: Record<string, string> = {
    'AFC East': 'AFC East',
    'AFC North': 'AFC North', 
    'AFC South': 'AFC South',
    'AFC West': 'AFC West',
    'NFC East': 'NFC East',
    'NFC North': 'NFC North',
    'NFC South': 'NFC South',
    'NFC West': 'NFC West'
  };

  async getAllTeams(): Promise<Team[]> {
    try {
      // Check cache first (teams data doesn't change often - cache for 24 hours)
      const cacheKey = 'all_teams';
      const cachedData = espnTeamsCache.get(cacheKey);
      
      let data: any;
      if (cachedData) {
        data = cachedData;
      } else {
        const response = await fetch(`${this.baseUrl}/teams`);
        
        if (!response.ok) {
          console.error(`ESPN Teams API error: ${response.status} ${response.statusText}`);
          throw new Error(`ESPN Teams API error: ${response.status} ${response.statusText}`);
        }

        data = await response.json();
        
        // Cache for 24 hours
        espnTeamsCache.set(cacheKey, data, 24 * 60 * 60 * 1000);
      }

      const teams: Team[] = [];
      
      if (data.sports?.[0]?.leagues?.[0]?.teams) {
        for (const espnTeam of data.sports[0].leagues[0].teams) {
          teams.push(this.transformESPNTeam(espnTeam));
        }
      }

      return teams.sort((a, b) => a.displayName.localeCompare(b.displayName));
      
    } catch (error) {
      console.error('Error fetching teams from ESPN:', error);
      return [];
    }
  }

  async getTeam(teamId: string): Promise<Team | null> {
    try {
      const cacheKey = `team_${teamId}`;
      const cachedData = espnTeamsCache.get(cacheKey);
      
      let data: any;
      if (cachedData) {
        data = cachedData;
      } else {
        const response = await fetch(`${this.baseUrl}/teams/${teamId}`);
        
        if (!response.ok) {
          console.error(`ESPN Team API error: ${response.status} ${response.statusText}`);
          return null;
        }

        data = await response.json();
        
        // Cache for 24 hours
        espnTeamsCache.set(cacheKey, data, 24 * 60 * 60 * 1000);
      }

      if (data.team) {
        return this.transformESPNTeam({ team: data.team });
      }

      return null;
      
    } catch (error) {
      console.error(`Error fetching team ${teamId} from ESPN:`, error);
      return null;
    }
  }

  async getTeamByAbbreviation(abbreviation: string): Promise<Team | null> {
    const teams = await this.getAllTeams();
    return teams.find(team => 
      team.abbreviation.toLowerCase() === abbreviation.toLowerCase()
    ) || null;
  }

  private transformESPNTeam(espnTeam: ESPNTeam): Team {
    const team = espnTeam.team;
    
    // Get the best logo URL
    const logoUrl = team.logos?.find(logo => 
      logo.rel.includes('full') && logo.rel.includes('default')
    )?.href || team.logos?.[0]?.href || '';

    // Find relevant links
    const clubhouseUrl = team.links?.find(link => link.rel.includes('clubhouse'))?.href;
    const rosterUrl = team.links?.find(link => link.rel.includes('roster'))?.href;
    const depthChartUrl = team.links?.find(link => link.rel.includes('depthchart'))?.href;

    // Determine division based on team
    const division = this.getDivisionForTeam(team.abbreviation);

    return {
      id: team.id,
      abbreviation: team.abbreviation,
      displayName: team.displayName,
      shortDisplayName: team.shortDisplayName,
      name: team.name,
      location: team.location,
      color: `#${team.color}`,
      alternateColor: `#${team.alternateColor}`,
      logoUrl,
      division,
      conference: division?.split(' ')[0], // AFC or NFC
      clubhouseUrl,
      rosterUrl,
      depthChartUrl
    };
  }

  private getDivisionForTeam(abbreviation: string): string | undefined {
    const divisionMapping: Record<string, string> = {
      'BUF': 'AFC East', 'MIA': 'AFC East', 'NE': 'AFC East', 'NYJ': 'AFC East',
      'BAL': 'AFC North', 'CIN': 'AFC North', 'CLE': 'AFC North', 'PIT': 'AFC North',
      'HOU': 'AFC South', 'IND': 'AFC South', 'JAX': 'AFC South', 'TEN': 'AFC South',
      'DEN': 'AFC West', 'KC': 'AFC West', 'LV': 'AFC West', 'LAC': 'AFC West',
      'DAL': 'NFC East', 'NYG': 'NFC East', 'PHI': 'NFC East', 'WSH': 'NFC East', 'WAS': 'NFC East',
      'CHI': 'NFC North', 'DET': 'NFC North', 'GB': 'NFC North', 'MIN': 'NFC North',
      'ATL': 'NFC South', 'CAR': 'NFC South', 'NO': 'NFC South', 'TB': 'NFC South',
      'ARI': 'NFC West', 'LAR': 'NFC West', 'SF': 'NFC West', 'SEA': 'NFC West'
    };

    return divisionMapping[abbreviation];
  }
}
