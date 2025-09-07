// src/providers/http/HttpOddsProvider.ts
import { OddsProvider } from '../interfaces';
import { GameOdds } from '@/types';

export class HttpOddsProvider implements OddsProvider {
  private apiUrl = import.meta.env.VITE_ODDS_API_URL;
  private apiKey = import.meta.env.VITE_ODDS_API_KEY;

  async getWeekOdds({ season, week }: { season: number; week: number }): Promise<GameOdds[]> {
    const response = await fetch(`${this.apiUrl}/odds?season=${season}&week=${week}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch odds: ${response.statusText}`);
    }

    const data = await response.json();
    return data.map((item: any) => ({
      gameId: item.gameId,
      spreadHome: item.spreadHome,
      spreadAway: item.spreadAway,
      total: item.total,
      provider: item.provider
    }));
  }
}