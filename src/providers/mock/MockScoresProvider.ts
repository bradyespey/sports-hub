// src/providers/mock/MockScoresProvider.ts
import { ScoresProvider } from '../interfaces';
import { GameMeta, GameScore } from '@/types';
import scheduleData from '@/devdata/schedule.json';
import scoresData from '@/devdata/scores.json';

export class MockScoresProvider implements ScoresProvider {
  async getWeekSchedule({ season, week }: { season: number; week: number }): Promise<GameMeta[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const weekKey = `${season}_${week.toString().padStart(2, '0')}`;
    return scheduleData[weekKey] || [];
  }

  async getLiveScores({ gameIds }: { gameIds: string[] }): Promise<GameScore[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return gameIds.map(gameId => 
      scoresData.find(score => score.gameId === gameId)
    ).filter(Boolean) as GameScore[];
  }
}