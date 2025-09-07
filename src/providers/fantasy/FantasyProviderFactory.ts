// src/providers/fantasy/FantasyProviderFactory.ts
import { FantasyProvider } from '../interfaces';
import { SleeperProvider } from './SleeperProvider';
import { YahooProvider } from './YahooProvider';

export class FantasyProviderFactory {
  static createProvider(): FantasyProvider | null {
    const provider = import.meta.env.VITE_FANTASY_PROVIDER;
    
    switch (provider) {
      case 'sleeper':
        return new SleeperProvider();
      case 'yahoo':
        return new YahooProvider();
      default:
        return null; // Fantasy disabled
    }
  }
  
  static isEnabled(): boolean {
    return Boolean(import.meta.env.VITE_FANTASY_PROVIDER);
  }
}