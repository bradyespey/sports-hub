// src/providers/http/HttpLogosProvider.ts
import { LogosProvider } from '../interfaces';

export class HttpLogosProvider implements LogosProvider {
  private baseCdnUrl = import.meta.env.VITE_LOGO_CDN_BASE;

  logoUrl(teamAbbr: string): string {
    if (!this.baseCdnUrl) {
      // Fallback to placeholder
      return `https://via.placeholder.com/48x48/1a365d/ffffff?text=${teamAbbr}`;
    }
    
    return `${this.baseCdnUrl}/${teamAbbr.toLowerCase()}.png`;
  }
}