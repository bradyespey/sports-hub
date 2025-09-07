// src/providers/fantasy/SleeperProvider.ts
import { FantasyProvider } from '../interfaces';
import { FantasyLeague, FantasyMatchup } from '@/types';

export class SleeperProvider implements FantasyProvider {
  private leagueId = import.meta.env.VITE_FANTASY_LEAGUE_ID;
  private bradyTeamId = import.meta.env.VITE_FANTASY_TEAM_ID_BRADY;
  private jennyTeamId = import.meta.env.VITE_FANTASY_TEAM_ID_JENNY;

  async getLeagueInfo(): Promise<FantasyLeague> {
    const response = await fetch(`https://api.sleeper.app/v1/league/${this.leagueId}`);
    if (!response.ok) throw new Error('Failed to fetch league info');
    
    const data = await response.json();
    return {
      name: data.name,
      season: parseInt(data.season)
    };
  }

  async getUserTeams(): Promise<{ brady: string; jenny: string }> {
    return {
      brady: this.bradyTeamId,
      jenny: this.jennyTeamId
    };
  }

  async getWeekMatchups({ season, week }: { season: number; week: number }): Promise<FantasyMatchup[]> {
    const response = await fetch(`https://api.sleeper.app/v1/league/${this.leagueId}/matchups/${week}`);
    if (!response.ok) throw new Error('Failed to fetch matchups');
    
    const data = await response.json();
    
    // Find matchups for Brady and Jenny
    const bradyMatchup = data.find((m: any) => m.roster_id.toString() === this.bradyTeamId);
    const jennyMatchup = data.find((m: any) => m.roster_id.toString() === this.jennyTeamId);
    
    const results: FantasyMatchup[] = [];
    
    if (bradyMatchup) {
      results.push({
        teamId: this.bradyTeamId,
        opponentTeamId: data.find((m: any) => m.matchup_id === bradyMatchup.matchup_id && m.roster_id.toString() !== this.bradyTeamId)?.roster_id.toString() || '',
        pointsFor: bradyMatchup.points || 0,
        pointsAgainst: data.find((m: any) => m.matchup_id === bradyMatchup.matchup_id && m.roster_id.toString() !== this.bradyTeamId)?.points || 0,
        status: bradyMatchup.points > 0 ? 'in_progress' : 'not_started'
      });
    }
    
    if (jennyMatchup) {
      results.push({
        teamId: this.jennyTeamId,
        opponentTeamId: data.find((m: any) => m.matchup_id === jennyMatchup.matchup_id && m.roster_id.toString() !== this.jennyTeamId)?.roster_id.toString() || '',
        pointsFor: jennyMatchup.points || 0,
        pointsAgainst: data.find((m: any) => m.matchup_id === jennyMatchup.matchup_id && m.roster_id.toString() !== this.jennyTeamId)?.points || 0,
        status: jennyMatchup.points > 0 ? 'in_progress' : 'not_started'
      });
    }
    
    return results;
  }
}