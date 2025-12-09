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

/**
 * Factory class for creating data provider instances.
 * Centralizes provider creation logic and ensures proper configuration.
 */
export class ProviderFactory {
  /**
   * Creates an odds provider instance.
   * Requires VITE_ODDS_API_KEY to be configured.
   * @returns {OddsProvider} The odds provider instance
   * @throws {Error} If VITE_ODDS_API_KEY is not configured
   */
  static createOddsProvider(): OddsProvider {
    if (!import.meta.env.VITE_ODDS_API_KEY) {
      throw new Error('VITE_ODDS_API_KEY is required for odds data');
    }
    return new TheOddsApiProvider();
  }

  /**
   * Creates a scores provider instance using ESPN API.
   * @returns {ScoresProvider} The scores provider instance
   */
  static createScoresProvider(): ScoresProvider {
    return new EspnScoresProvider();
  }

  /**
   * Creates a logos provider instance for team logo URLs.
   * @returns {LogosProvider} The logos provider instance
   */
  static createLogosProvider(): LogosProvider {
    return new HttpLogosProvider();
  }

  /**
   * Creates a teams provider instance using ESPN API.
   * @returns {TeamsProvider} The teams provider instance
   */
  static createTeamsProvider(): TeamsProvider {
    return new EspnTeamsProvider();
  }

  /**
   * Creates a depth chart provider instance using ESPN API.
   * @returns {DepthChartProvider} The depth chart provider instance
   */
  static createDepthChartProvider(): DepthChartProvider {
    return new EspnDepthChartProvider();
  }
}