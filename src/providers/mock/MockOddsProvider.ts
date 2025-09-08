// src/providers/mock/MockOddsProvider.ts
import { OddsProvider } from '../interfaces';
import { GameOdds } from '@/types';
import oddsData from '@/devdata/odds.json';
import week1OddsData from '@/devdata/nfl2025-week1-odds.json';

export class MockOddsProvider implements OddsProvider {
  async getWeekOdds({ season, week }: { season: number; week: number }): Promise<GameOdds[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const weekKey = `${season}_${week.toString().padStart(2, '0')}`;
    
    // Check week 1 specific data first, then general odds data
    let rawData = [];
    if (season === 2025 && week === 1) {
      rawData = week1OddsData[weekKey] || [];
    } else {
      rawData = oddsData[weekKey] || [];
    }
    
    // Add provider field to indicate this is mock data
    return rawData.map(odds => ({
      ...odds,
      provider: 'Mock Odds Provider'
    }));
  }
}