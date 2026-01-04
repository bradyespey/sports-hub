export interface GameDoc {
  season: number;
  week: number;
  weekType?: 'regular' | 'wildcard' | 'divisional' | 'conference' | 'superbowl';
  gameId: string;
  kickoffUtc: Date;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  status: 'scheduled' | 'live' | 'final';
  quarter?: number;
  timeRemaining?: string;
  possession?: string;
  network?: string;
}

export interface OddsDoc {
  gameId: string;
  market: 'h2h';
  provider: 'oddsapi';
  data: any; // Raw provider payload
  fetchedAt: Date;
  locked: boolean; // true once kickoff passed and we have any odds
}

export interface WeekDoc {
  season: number;
  week: number;
  hasAnyOdds: boolean;
  lastOddsFetchAt?: Date;
}

export interface UsageDoc {
  remaining: number;
  lastRequestAt: Date;
  used: number;
  lastCost: number;
}

export interface OddsRefreshRequest {
  season?: number;
  week?: number;
  mode: 'manual' | 'daily' | 'bootstrap';
}

export interface OddsRefreshResponse {
  success: boolean;
  week: number;
  season: number;
  fetched: {
    missingLocked: number;
    eligible: number;
  };
  skipped: {
    alreadyLocked: number;
    notEligible: number;
  };
  usage: {
    remaining: number;
    cost: number;
  };
  error?: string;
}
