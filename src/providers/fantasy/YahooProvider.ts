// src/providers/fantasy/YahooProvider.ts
import { FantasyProvider } from '../interfaces';
import { FantasyLeague, FantasyMatchup } from '@/types';
import { getFantasyScoring } from '@/services/FantasyScoring';

interface YahooTeam {
  team_key: string;
  name: string;
  team_logos: Array<{ url: string }>;
  managers: Array<{ nickname: string }>;
}

interface YahooMatchup {
  matchup: {
    teams: {
      team: YahooTeam[];
    };
  };
}

export class YahooProvider implements FantasyProvider {
  private baseUrl = '/.netlify/functions/yahoo-fantasy';
  private leagueId = import.meta.env.VITE_YAHOO_LEAGUE_ID || '590446';
  private teamName = import.meta.env.VITE_YAHOO_TEAM_NAME || 'Espeys in the Endzone';
  private cachedTeamId: string | null = null;
  private scoringService = getFantasyScoring();

  private async fetchYahoo(endpoint: string, params: Record<string, string> = {}) {
    const url = new URL(this.baseUrl, window.location.origin);
    url.searchParams.set('endpoint', endpoint);
    url.searchParams.set('leagueId', this.leagueId);
    
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch Yahoo Fantasy data');
    }
    
    return response.json();
  }

  async getLeagueInfo(): Promise<FantasyLeague> {
    try {
      const data = await this.fetchYahoo('league');
      const league = data.fantasy_content?.league?.[0];
      
      // Load scoring settings when getting league info
      if (!this.scoringService.isLoaded()) {
        await this.scoringService.loadLeagueSettings(this.leagueId);
      }
      
      return {
        name: league?.name || 'Double Coverage League',
        season: parseInt(league?.season || '2024'),
      };
    } catch (error) {
      console.error('Failed to fetch league info:', error);
      // Return default values if API fails
      return {
        name: 'Double Coverage League',
        season: 2024,
      };
    }
  }

  private async getMyTeamId(): Promise<string> {
    if (this.cachedTeamId) {
      return this.cachedTeamId;
    }

    const data = await this.fetchYahoo('teams');
    const teams = data.fantasy_content?.league?.[1]?.teams;
    
    if (!teams) {
      throw new Error('No teams found in league');
    }

    // Find team by name
    for (let i = 0; i < teams.count; i++) {
      const teamData = teams[i]?.team?.[0];
      if (teamData && teamData[2]?.name === this.teamName) {
        this.cachedTeamId = teamData[0]?.team_key;
        return teamData[0]?.team_key;
      }
    }

    throw new Error(`Team "${this.teamName}" not found in league`);
  }

  async getUserTeams(): Promise<{ brady: string; jenny: string }> {
    const teamId = await this.getMyTeamId();
    // Since Brady and Jenny share the same team
    return {
      brady: teamId,
      jenny: teamId,
    };
  }

  async getWeekMatchups({ season, week }: { season: number; week: number }): Promise<FantasyMatchup[]> {
    try {
      const data = await this.fetchYahoo('scoreboard', { week: week.toString() });
      const scoreboard = data.fantasy_content?.league?.[1]?.scoreboard;
      
      if (!scoreboard || !scoreboard['0']?.matchups) {
        return [];
      }

      const matchups: FantasyMatchup[] = [];
      const matchupData = scoreboard['0'].matchups;

      for (let i = 0; i < matchupData.count; i++) {
        const matchup = matchupData[i]?.matchup;
        if (!matchup) continue;

        const teams = matchup['0']?.teams;
        if (!teams || teams.count < 2) continue;

        const team1 = teams['0']?.team;
        const team2 = teams['1']?.team;

        if (!team1 || !team2) continue;

        // Get team data
        const team1Key = team1[0]?.team_key;
        const team2Key = team2[0]?.team_key;
        const team1Points = parseFloat(team1[1]?.team_points?.total || '0');
        const team2Points = parseFloat(team2[1]?.team_points?.total || '0');

        // Determine status
        const matchupStatus = matchup.status;
        let status: 'not_started' | 'in_progress' | 'final' = 'not_started';
        if (matchupStatus === 'postevent') {
          status = 'final';
        } else if (matchupStatus === 'midevent') {
          status = 'in_progress';
        }

        // Add both sides of the matchup
        matchups.push({
          teamId: team1Key,
          opponentTeamId: team2Key,
          pointsFor: team1Points,
          pointsAgainst: team2Points,
          status,
        });

        matchups.push({
          teamId: team2Key,
          opponentTeamId: team1Key,
          pointsFor: team2Points,
          pointsAgainst: team1Points,
          status,
        });
      }

      return matchups;
    } catch (error) {
      console.error('Failed to fetch matchups:', error);
      return [];
    }
  }

  async getPlayerStats(playerKey: string, week: number): Promise<number> {
    try {
      // Ensure scoring settings are loaded
      if (!this.scoringService.isLoaded()) {
        await this.scoringService.loadLeagueSettings(this.leagueId);
      }

      const data = await this.fetchYahoo('player-stats', { 
        playerKey, 
        week: week.toString() 
      });
      
      // Parse the player stats response based on Yahoo API structure
      const playerArray = data.fantasy_content?.player;
      if (!playerArray || playerArray.length === 0) {
        console.warn(`No player data found for ${playerKey}`);
        return 0;
      }

      // Find player_stats in the array
      let statsData = null;
      for (const item of playerArray) {
        if (item?.player_stats) {
          statsData = item.player_stats;
          break;
        }
      }

      if (!statsData) {
        console.warn(`No stats found for player ${playerKey} in week ${week}`);
        return 0;
      }

      // Parse stats using the scoring service
      const statMap = this.scoringService.parseYahooStats(statsData);
      
      if (Object.keys(statMap).length === 0) {
        console.warn(`No stat values found for player ${playerKey}`);
        return 0;
      }

      // Calculate points using league-specific scoring
      const points = this.scoringService.calculatePoints(statMap);
      
      return points;
    } catch (error) {
      console.error(`Failed to fetch stats for player ${playerKey}:`, error);
      throw error;
    }
  }

  async getPlayerStatsWithDetails(playerKey: string, week: number): Promise<{ points: number; stats: string }> {
    try {
      // Ensure scoring settings are loaded
      if (!this.scoringService.isLoaded()) {
        await this.scoringService.loadLeagueSettings(this.leagueId);
      }

      const data = await this.fetchYahoo('player-week', { 
        playerKey, 
        week: week.toString() 
      });
      
      // Parse the player stats response based on Yahoo API structure
      const playerArray = data.fantasy_content?.player;
      if (!playerArray || playerArray.length === 0) {
        console.warn(`No player data found for ${playerKey}`);
        return { points: 0, stats: '—' };
      }

      // Find player_stats in the array
      let statsData = null;
      for (const item of playerArray) {
        if (item?.player_stats) {
          statsData = item.player_stats;
          break;
        }
      }

      if (!statsData) {
        console.warn(`No stats found for player ${playerKey} in week ${week}`);
        return { points: 0, stats: '—' };
      }

      // Parse stats using the scoring service
      const statMap = this.scoringService.parseYahooStats(statsData);
      
      if (Object.keys(statMap).length === 0) {
        console.warn(`No stat values found for player ${playerKey}`);
        return { points: 0, stats: '—' };
      }

      // Calculate points using league-specific scoring
      const points = this.scoringService.calculatePoints(statMap);
      
      // Format stats for display (similar to Yahoo's format)
      const statsString = this.formatStatsForDisplay(statMap);
      
      return { points, stats: statsString };
    } catch (error) {
      console.error(`Failed to fetch stats for player ${playerKey}:`, error);
      return { points: 0, stats: '—' };
    }
  }

  private formatStatsForDisplay(statMap: Record<string, number>): string {
    const stats: string[] = [];
    
    // Common stat mappings (you may need to adjust these based on your league settings)
    const statLabels: Record<string, string> = {
      'passing_yards': 'Pass Yds',
      'passing_touchdowns': 'Pass TD',
      'passing_interceptions': 'Int',
      'passing_2pt_conversions': '2-PT',
      'rushing_yards': 'Rush Yds',
      'rushing_touchdowns': 'Rush TD',
      'rushing_2pt_conversions': '2-PT',
      'receiving_yards': 'Rec Yds',
      'receiving_touchdowns': 'Rec TD',
      'receiving_receptions': 'Rec',
      'receiving_2pt_conversions': '2-PT',
      'field_goals_0_19': 'FG 0-19',
      'field_goals_20_29': 'FG 20-29',
      'field_goals_30_39': 'FG 30-39',
      'field_goals_40_49': 'FG 40-49',
      'field_goals_50_plus': 'FG 50+',
      'field_goals_made': 'FG Made',
      'field_goals_attempted': 'FG Att',
      'extra_points_made': 'PAT Made',
      'extra_points_attempted': 'PAT Att',
      'defense_sacks': 'Sack',
      'defense_interceptions': 'Int',
      'defense_fumble_recoveries': 'Fum Rec',
      'defense_touchdowns': 'TD',
      'defense_safeties': 'Safety',
      'defense_points_allowed_0': 'PA 0',
      'defense_points_allowed_1_6': 'PA 1-6',
      'defense_points_allowed_7_13': 'PA 7-13',
      'defense_points_allowed_14_20': 'PA 14-20',
      'defense_points_allowed_21_27': 'PA 21-27',
      'defense_points_allowed_28_34': 'PA 28-34',
      'defense_points_allowed_35_plus': 'PA 35+',
    };

    // Add stats that have values > 0
    for (const [statKey, value] of Object.entries(statMap)) {
      if (value > 0) {
        const label = statLabels[statKey] || statKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        stats.push(`${value} ${label}`);
      }
    }

    return stats.length > 0 ? stats.join(', ') : '—';
  }
}