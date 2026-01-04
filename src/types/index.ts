// src/types/index.ts

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: 'user';
  createdAt: Date;
  lastLogin: Date;
}

export interface Week {
  season: number;
  week: number;
  startDateUtc: Date;
  endDateUtc: Date;
}

export interface Game {
  season: number;
  week: number;
  weekType?: 'regular' | 'wildcard' | 'divisional' | 'conference' | 'superbowl';
  gameId: string;
  kickoffUtc: Date;
  homeTeam: string;
  awayTeam: string;
  sportsbook: {
    spreadHome: number;
    spreadAway: number;
    total: number;
    provider: string;
  };
  status?: 'scheduled' | 'live' | 'final';
  homeScore?: number;
  awayScore?: number;
  quarter?: number;
  timeRemaining?: string;
  possession?: string;
  network?: string;
}

export interface Pick {
  gameId: string;
  uid: string;
  selection: string;
  createdAt: Date;
  locked: boolean;
  revealed: boolean;
}

export interface GameOdds {
  gameId: string;
  spreadHome: number;
  spreadAway: number;
  total: number;
  provider: string;
}

export interface GameMeta {
  gameId: string;
  season: number;
  week: number;
  weekType?: 'regular' | 'wildcard' | 'divisional' | 'conference' | 'superbowl';
  kickoffUtc: Date;
  homeTeam: string;
  awayTeam: string;
  status: 'scheduled' | 'live' | 'final';
  network?: string;
}

export interface GameScore {
  gameId: string;
  homeScore: number;
  awayScore: number;
  status: 'scheduled' | 'live' | 'final';
  quarter?: number;
  timeRemaining?: string;
  possession?: string;
  network?: string;
}

export interface FantasyTeam {
  teamId: string;
  name: string;
  owner: string;
}

export interface FantasyMatchup {
  teamId: string;
  opponentTeamId: string;
  pointsFor: number;
  pointsAgainst: number;
  status: 'not_started' | 'in_progress' | 'final';
}

export interface FantasyLeague {
  name: string;
  season: number;
}

// Re-export odds types
export type { 
  GameDoc, 
  OddsDoc, 
  WeekDoc, 
  UsageDoc, 
  OddsRefreshRequest, 
  OddsRefreshResponse 
} from './odds';