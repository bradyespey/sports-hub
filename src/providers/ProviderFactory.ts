// src/providers/ProviderFactory.ts
import { OddsProvider, ScoresProvider, LogosProvider } from './interfaces';
import { TeamsProvider } from './TeamsProvider';
import { DepthChartProvider } from './DepthChartProvider';
import { HttpOddsProvider } from './http/HttpOddsProvider';
import { HttpScoresProvider } from './http/HttpScoresProvider';
import { HttpLogosProvider } from './http/HttpLogosProvider';
import { TheOddsApiProvider } from './http/TheOddsApiProvider';
import { EspnScoresProvider } from './http/EspnScoresProvider';
import { EspnTeamsProvider } from './http/EspnTeamsProvider';
import { EspnDepthChartProvider } from './http/EspnDepthChartProvider';

export class ProviderFactory {
  static createOddsProvider(): OddsProvider {
    // Only use real API - require API key
    if (!import.meta.env.VITE_ODDS_API_KEY) {
      throw new Error('VITE_ODDS_API_KEY is required for odds data');
    }
    return new TheOddsApiProvider();
  }

  static createScoresProvider(): ScoresProvider {
    return new EspnScoresProvider();
  }

  static createLogosProvider(): LogosProvider {
    return new HttpLogosProvider();
  }

  static createTeamsProvider(): TeamsProvider {
    return new EspnTeamsProvider();
  }

  static createDepthChartProvider(): DepthChartProvider {
    return new EspnDepthChartProvider();
  }
}