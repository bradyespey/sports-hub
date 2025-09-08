// Provider interface for team data
import { Team } from '@/types/teams';

export interface TeamsProvider {
  getAllTeams(): Promise<Team[]>;
  getTeam(teamId: string): Promise<Team | null>;
  getTeamByAbbreviation(abbreviation: string): Promise<Team | null>;
}
