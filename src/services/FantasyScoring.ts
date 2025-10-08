// src/services/FantasyScoring.ts

/**
 * Yahoo Fantasy Scoring Service
 * Calculates fantasy points based on league-specific scoring settings
 */

interface StatModifier {
  stat_id: number;
  value: number; // Points per unit
}

interface ScoringSettings {
  stat_categories: {
    stats: {
      stat: {
        stat_id: number;
        name: string;
        display_name: string;
        sort_order: string;
        position_type: string;
        value?: number; // Points for this stat
      };
    }[];
  };
  stat_modifiers?: {
    stats: {
      stat: {
        stat_id: number;
        value: number;
      };
    }[];
  };
}

export class FantasyScoring {
  private scoringMap: Map<number, number> = new Map();
  private settingsLoaded = false;

  /**
   * Load league scoring settings from Yahoo API
   */
  async loadLeagueSettings(leagueId: string): Promise<void> {
    try {
      const response = await fetch(
        `/.netlify/functions/yahoo-fantasy?endpoint=settings&leagueId=${leagueId}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch league settings');
      }

      const data = await response.json();
      const settings = data.fantasy_content?.league?.[1]?.settings?.[0];
      
      if (!settings) {
        console.warn('No scoring settings found, using default scoring');
        this.loadDefaultScoring();
        return;
      }

      // Parse stat modifiers (these contain the point values)
      const statModifiers = settings.stat_modifiers?.stats;
      if (statModifiers) {
        for (const modifier of statModifiers) {
          if (modifier?.stat) {
            const statId = modifier.stat.stat_id;
            const value = parseFloat(modifier.stat.value) || 0;
            this.scoringMap.set(statId, value);
          }
        }
      }

      // If no modifiers found, parse from stat_categories
      if (this.scoringMap.size === 0) {
        const statCategories = settings.stat_categories?.stats;
        if (statCategories) {
          for (const category of statCategories) {
            if (category?.stat && category.stat.value !== undefined) {
              const statId = category.stat.stat_id;
              const value = parseFloat(category.stat.value) || 0;
              this.scoringMap.set(statId, value);
            }
          }
        }
      }

      // If still no scoring found, use defaults
      if (this.scoringMap.size === 0) {
        console.warn('No stat modifiers found, using default scoring');
        this.loadDefaultScoring();
      } else {
        console.log(`Loaded ${this.scoringMap.size} scoring settings from league`);
      }

      this.settingsLoaded = true;
    } catch (error) {
      console.error('Failed to load league settings:', error);
      this.loadDefaultScoring();
      this.settingsLoaded = true;
    }
  }

  /**
   * Load default Yahoo standard scoring (fallback)
   */
  private loadDefaultScoring(): void {
    // Default Yahoo standard scoring
    const defaultScoring: Record<number, number> = {
      // Passing
      4: 0.04,   // Passing Yards (1 pt per 25 yards)
      5: 4,      // Passing TDs
      6: -1,     // Interceptions
      
      // Rushing
      9: 0.1,    // Rushing Yards (1 pt per 10 yards)
      10: 6,     // Rushing TDs
      
      // Receiving
      11: 0.5,   // Receptions (Half PPR - adjust if your league is full PPR)
      12: 0.1,   // Receiving Yards (1 pt per 10 yards)
      13: 6,     // Receiving TDs
      
      // Kicking
      29: 3,     // FG 0-19
      30: 3,     // FG 20-29
      31: 3,     // FG 30-39
      32: 4,     // FG 40-49
      33: 5,     // FG 50+
      35: 1,     // PAT Made
      36: -1,    // PAT Missed
      
      // Misc
      15: 6,     // Return TDs
      16: 2,     // 2-Point Conversions
      18: -2,    // Fumbles Lost
      57: 6,     // Offensive Fumble Return TD
      
      // Defense/Special Teams
      19: 6,     // Defensive TDs
      20: 2,     // Sacks
      21: 2,     // Interceptions
      22: 2,     // Fumbles Recovered
      23: 2,     // Safeties
      24: 2,     // Blocked Kicks
    };

    for (const [statId, value] of Object.entries(defaultScoring)) {
      this.scoringMap.set(parseInt(statId), value);
    }
  }

  /**
   * Calculate fantasy points for a player based on their stats
   */
  calculatePoints(stats: Record<number, number>): number {
    if (!this.settingsLoaded) {
      console.warn('Scoring settings not loaded, using defaults');
      this.loadDefaultScoring();
    }

    let points = 0;
    
    for (const [statId, statValue] of Object.entries(stats)) {
      const statIdNum = parseInt(statId);
      const multiplier = this.scoringMap.get(statIdNum) || 0;
      points += statValue * multiplier;
    }

    return Math.round(points * 100) / 100; // Round to 2 decimals
  }

  /**
   * Parse stats from Yahoo API response
   */
  parseYahooStats(statsData: any): Record<number, number> {
    const statMap: Record<number, number> = {};
    
    if (!statsData || !statsData.stats) {
      return statMap;
    }

    const stats = Array.isArray(statsData.stats) ? statsData.stats : [statsData.stats];
    
    for (const statItem of stats) {
      if (statItem?.stat) {
        const stat = statItem.stat;
        if (stat.stat_id && stat.value !== undefined && stat.value !== null) {
          statMap[stat.stat_id] = parseFloat(stat.value) || 0;
        }
      }
    }

    return statMap;
  }

  /**
   * Get scoring settings (for debugging)
   */
  getScoringSettings(): Map<number, number> {
    return this.scoringMap;
  }

  /**
   * Check if settings are loaded
   */
  isLoaded(): boolean {
    return this.settingsLoaded;
  }
}

// Singleton instance
let scoringInstance: FantasyScoring | null = null;

export function getFantasyScoring(): FantasyScoring {
  if (!scoringInstance) {
    scoringInstance = new FantasyScoring();
  }
  return scoringInstance;
}
