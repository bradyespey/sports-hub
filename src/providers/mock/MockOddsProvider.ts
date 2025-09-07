// src/providers/mock/MockOddsProvider.ts
import { OddsProvider } from '../interfaces';
import { GameOdds } from '@/types';
import oddsData from '@/devdata/odds.json';

export class MockOddsProvider implements OddsProvider {
  async getWeekOdds({ season, week }: { season: number; week: number }): Promise<GameOdds[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const weekKey = `${season}_${week.toString().padStart(2, '0')}`;
    return oddsData[weekKey] || [];
  }
}