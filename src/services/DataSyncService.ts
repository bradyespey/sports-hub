// src/services/DataSyncService.ts
import { ProviderFactory } from '@/providers/ProviderFactory';
import { Game } from '@/types';

export class DataSyncService {
  private static instance: DataSyncService;
  private syncInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  private constructor() {}

  static getInstance(): DataSyncService {
    if (!DataSyncService.instance) {
      DataSyncService.instance = new DataSyncService();
    }
    return DataSyncService.instance;
  }

  /**
   * Start automatic data synchronization
   * @param intervalMinutes How often to sync (default: 5 minutes)
   */
  startAutoSync(intervalMinutes: number = 5): void {
    if (this.isRunning) {
      console.log('Data sync already running');
      return;
    }

    console.log(`🔄 Starting auto data sync every ${intervalMinutes} minutes`);
    this.isRunning = true;

    // Initial sync
    this.syncCurrentWeekData();

    // Set up recurring sync
    this.syncInterval = setInterval(() => {
      this.syncCurrentWeekData();
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Stop automatic data synchronization
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.isRunning = false;
    console.log('⏹️ Data sync stopped');
  }

  /**
   * Manually sync current week data
   */
  async syncCurrentWeekData(): Promise<void> {
    try {
      const currentWeek = this.getCurrentWeek();
      console.log(`🔄 Syncing data for Week ${currentWeek.week}...`);

      const scoresProvider = ProviderFactory.createScoresProvider();
      const oddsProvider = ProviderFactory.createOddsProvider();

      // Fetch latest data
      const [schedule, odds] = await Promise.all([
        scoresProvider.getWeekSchedule({ season: currentWeek.season, week: currentWeek.week }),
        oddsProvider.getWeekOdds({ season: currentWeek.season, week: currentWeek.week })
      ]);

      // Get live scores for all games
      const gameIds = schedule.map(game => game.gameId);
      const scores = await scoresProvider.getLiveScores({ gameIds });

      // Combine data
      const updatedGames = schedule.map(game => {
        const gameOdds = odds.find(o => o.gameId === game.gameId);
        const gameScore = scores.find(s => s.gameId === game.gameId);

        return {
          ...game,
          sportsbook: gameOdds ? {
            spreadHome: gameOdds.spreadHome,
            spreadAway: gameOdds.spreadAway,
            total: gameOdds.total,
            provider: gameOdds.provider
          } : undefined,
          homeScore: gameScore?.homeScore,
          awayScore: gameScore?.awayScore,
          status: gameScore?.status || game.status,
          quarter: gameScore?.quarter,
          timeRemaining: gameScore?.timeRemaining
        };
      });

      // Emit update event for components to listen to
      this.emitDataUpdate(updatedGames);

      console.log(`✅ Synced ${updatedGames.length} games for Week ${currentWeek.week}`);
      
      // Log live games
      const liveGames = updatedGames.filter(g => g.status === 'live');
      if (liveGames.length > 0) {
        console.log(`🔴 ${liveGames.length} live games detected`);
      }

    } catch (error) {
      console.error('❌ Data sync failed:', error);
    }
  }

  /**
   * Sync specific week data
   */
  async syncWeekData(season: number, week: number): Promise<Game[]> {
    const scoresProvider = ProviderFactory.createScoresProvider();
    const oddsProvider = ProviderFactory.createOddsProvider();

    const [schedule, odds] = await Promise.all([
      scoresProvider.getWeekSchedule({ season, week }),
      oddsProvider.getWeekOdds({ season, week })
    ]);

    const gameIds = schedule.map(game => game.gameId);
    const scores = await scoresProvider.getLiveScores({ gameIds });

    return schedule.map(game => {
      const gameOdds = odds.find(o => o.gameId === game.gameId);
      const gameScore = scores.find(s => s.gameId === game.gameId);

      return {
        ...game,
        kickoffUtc: new Date(game.kickoffUtc),
        sportsbook: gameOdds ? {
          spreadHome: gameOdds.spreadHome,
          spreadAway: gameOdds.spreadAway,
          total: gameOdds.total,
          provider: gameOdds.provider
        } : undefined,
        homeScore: gameScore?.homeScore,
        awayScore: gameScore?.awayScore,
        status: gameScore?.status || game.status,
        quarter: gameScore?.quarter,
        timeRemaining: gameScore?.timeRemaining
      } as Game;
    });
  }

  /**
   * Get current NFL week based on date
   */
  private getCurrentWeek(): { season: number; week: number } {
    // For now, return Week 1 2025
    // In production, this would calculate based on current date
    return { season: 2025, week: 1 };
  }

  /**
   * Emit data update event
   */
  private emitDataUpdate(games: any[]): void {
    // Create custom event for components to listen to
    const event = new CustomEvent('nfl-data-update', {
      detail: { games, timestamp: new Date() }
    });
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(event);
    }
  }

  /**
   * Check if sync is currently running
   */
  isAutoSyncRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get sync status info
   */
  getSyncStatus(): { isRunning: boolean; lastSync?: Date } {
    return {
      isRunning: this.isRunning,
      lastSync: new Date() // In production, track actual last sync time
    };
  }
}
