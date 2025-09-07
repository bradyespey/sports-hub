// src/providers/mock/MockLogosProvider.ts
import { LogosProvider } from '../interfaces';

export class MockLogosProvider implements LogosProvider {
  logoUrl(teamAbbr: string): string {
    // Use a simple placeholder service for team logos
    // In production, this would use a real CDN
    return `https://via.placeholder.com/48x48/1a365d/ffffff?text=${teamAbbr}`;
  }
}