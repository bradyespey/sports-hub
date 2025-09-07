// src/providers/fantasy/YahooProvider.ts
import { FantasyProvider } from '../interfaces';
import { FantasyLeague, FantasyMatchup } from '@/types';

export class YahooProvider implements FantasyProvider {
  // TODO: Implement Yahoo Fantasy Sports API integration
  // This requires server-side OAuth token exchange via Netlify Function
  // See: https://developer.yahoo.com/fantasysports/guide/

  async getLeagueInfo(): Promise<FantasyLeague> {
    throw new Error('Yahoo Fantasy integration not implemented yet. Use Sleeper provider or implement server-side OAuth.');
  }

  async getUserTeams(): Promise<{ brady: string; jenny: string }> {
    throw new Error('Yahoo Fantasy integration not implemented yet. Use Sleeper provider or implement server-side OAuth.');
  }

  async getWeekMatchups({ season, week }: { season: number; week: number }): Promise<FantasyMatchup[]> {
    throw new Error('Yahoo Fantasy integration not implemented yet. Use Sleeper provider or implement server-side OAuth.');
  }
}

// TODO: Create Netlify Function for Yahoo OAuth
// netlify/functions/yahoo-auth.ts:
// 1. Handle OAuth callback and token exchange
// 2. Store encrypted tokens in environment or database
// 3. Proxy authenticated requests to Yahoo Fantasy API
// 4. Return formatted data to client