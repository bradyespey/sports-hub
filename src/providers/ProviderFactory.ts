// src/providers/ProviderFactory.ts
import { OddsProvider, ScoresProvider, LogosProvider } from './interfaces';
import { MockOddsProvider } from './mock/MockOddsProvider';
import { MockScoresProvider } from './mock/MockScoresProvider';
import { MockLogosProvider } from './mock/MockLogosProvider';
import { HttpOddsProvider } from './http/HttpOddsProvider';
import { HttpScoresProvider } from './http/HttpScoresProvider';
import { HttpLogosProvider } from './http/HttpLogosProvider';
import { TheOddsApiProvider } from './http/TheOddsApiProvider';
import { EspnScoresProvider } from './http/EspnScoresProvider';

export class ProviderFactory {
  private static useMock = import.meta.env.VITE_USE_MOCK === 'true';

  static createOddsProvider(): OddsProvider {
    // Try real API first, but fallback to mock if API key is missing or invalid
    if (this.useMock || !import.meta.env.VITE_ODDS_API_KEY) {
      return new MockOddsProvider();
    }
    return new TheOddsApiProvider();
  }

  static createScoresProvider(): ScoresProvider {
    return this.useMock ? new MockScoresProvider() : new EspnScoresProvider();
  }

  static createLogosProvider(): LogosProvider {
    return this.useMock ? new MockLogosProvider() : new HttpLogosProvider();
  }
}