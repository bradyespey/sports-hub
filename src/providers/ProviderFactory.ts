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
    // Use mock odds provider for now due to API key issues
    return new MockOddsProvider();
  }

  static createScoresProvider(): ScoresProvider {
    return this.useMock ? new MockScoresProvider() : new EspnScoresProvider();
  }

  static createLogosProvider(): LogosProvider {
    return this.useMock ? new MockLogosProvider() : new HttpLogosProvider();
  }
}