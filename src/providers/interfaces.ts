// src/providers/interfaces.ts
import { GameOdds, GameMeta, GameScore } from '@/types';

export interface OddsProvider {
  getWeekOdds(params: { season: number; week: number }): Promise<GameOdds[]>;
}

export interface ScoresProvider {
  getWeekSchedule(params: { season: number; week: number }): Promise<GameMeta[]>;
  getLiveScores(params: { gameIds: string[] }): Promise<GameScore[]>;
}

export interface LogosProvider {
  logoUrl(teamAbbr: string): string;
}