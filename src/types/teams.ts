// Type definitions for teams and depth charts

export interface ESPNTeam {
  team: {
    id: string;
    uid: string;
    slug: string;
    abbreviation: string;
    displayName: string;
    shortDisplayName: string;
    name: string;
    nickname: string;
    location: string;
    color: string;
    alternateColor: string;
    isActive: boolean;
    logos: Array<{
      href: string;
      alt: string;
      rel: string[];
      width: number;
      height: number;
    }>;
    links: Array<{
      language: string;
      rel: string[];
      href: string;
      text: string;
      shortText: string;
      isExternal: boolean;
      isPremium: boolean;
      isHidden: boolean;
    }>;
  };
}

export interface TeamRecord {
  wins: number;
  losses: number;
  ties: number;
  winPercentage: number;
  gamesBack: number;
  streak: string;
  // Additional stats for tiebreaking
  divisionWins?: number;
  divisionLosses?: number;
  divisionTies?: number;
  divisionRecord?: number;
  pointsFor?: number;
  pointsAgainst?: number;
  pointDifferential?: number;
  gamesPlayed?: number;
}

export interface Team {
  id: string;
  abbreviation: string;
  displayName: string;
  shortDisplayName: string;
  name: string;
  location: string;
  color: string;
  alternateColor: string;
  logoUrl: string;
  division?: string;
  conference?: string;
  clubhouseUrl?: string;
  rosterUrl?: string;
  depthChartUrl?: string;
  record?: TeamRecord;
}

export interface DepthChartPosition {
  position: {
    id: string;
    name: string;
    displayName: string;
    abbreviation: string;
  };
  athletes: Array<{
    slot: number;
    rank: number;
    athlete: {
      $ref: string;
    };
  }>;
}

export interface DepthChartUnit {
  id: string;
  name: string;
  positions: Record<string, DepthChartPosition>;
}

export interface DepthChart {
  count: number;
  items: DepthChartUnit[];
}

export interface PlayerReference {
  id: string;
  name?: string;
  displayName?: string;
  position?: string;
  jerseyNumber?: string;
}

export interface ProcessedDepthChart {
  offense: Record<string, PlayerReference[]>;
  defense: Record<string, PlayerReference[]>;
  specialTeams: Record<string, PlayerReference[]>;
}
