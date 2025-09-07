// src/providers/http/HttpScoresProvider.ts
import { ScoresProvider } from '../interfaces';
import { GameMeta, GameScore } from '@/types';

export class HttpScoresProvider implements ScoresProvider {
  private apiUrl = import.meta.env.VITE_SCORES_API_URL;
  private apiKey = import.meta.env.VITE_SCORES_API_KEY;

  async getWeekSchedule({ season, week }: { season: number; week: number }): Promise<GameMeta[]> {
    const response = await fetch(`${this.apiUrl}/schedule?season=${season}&week=${week}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch schedule: ${response.statusText}`);
    }

    const data = await response.json();
    return data.map((item: any) => ({
      gameId: item.gameId,
      season: item.season,
      week: item.week,
      kickoffUtc: new Date(item.kickoffUtc),
      homeTeam: item.homeTeam,
      awayTeam: item.awayTeam,
      status: item.status
    }));
  }

  async getLiveScores({ gameIds }: { gameIds: string[] }): Promise<GameScore[]> {
    const response = await fetch(`${this.apiUrl}/scores`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ gameIds })
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch scores: ${response.statusText}`);
    }

    const data = await response.json();
    return data.map((item: any) => ({
      gameId: item.gameId,
      homeScore: item.homeScore,
      awayScore: item.awayScore,
      status: item.status,
      quarter: item.quarter,
      timeRemaining: item.timeRemaining
    }));
  }
}