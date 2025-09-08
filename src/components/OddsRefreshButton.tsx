import React, { useState, useEffect } from 'react';
import { OddsService } from '@/services/OddsService';
import type { OddsRefreshResponse, WeekDoc } from '@/types/odds';

interface OddsRefreshButtonProps {
  season: number;
  week: number;
  isCurrentWeek: boolean;
  hasUnstartedGames: boolean;
  onRefreshComplete?: (response: OddsRefreshResponse) => void;
}

export const OddsRefreshButton: React.FC<OddsRefreshButtonProps> = ({
  season,
  week,
  isCurrentWeek,
  hasUnstartedGames,
  onRefreshComplete
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastResponse, setLastResponse] = useState<OddsRefreshResponse | null>(null);
  const [weekDoc, setWeekDoc] = useState<WeekDoc | null>(null);
  
  const oddsService = new OddsService();

  // Subscribe to week document for last fetch time
  useEffect(() => {
    const unsubscribe = oddsService.subscribeToWeekDoc(season, week, (doc) => {
      setWeekDoc(doc);
    });

    return unsubscribe;
  }, [season, week]);

  const handleRefresh = async () => {
    if (!isCurrentWeek || !hasUnstartedGames) return;
    
    setIsRefreshing(true);
    try {
      const response = await oddsService.refreshOdds({
        season,
        week,
        mode: 'manual'
      });
      
      setLastResponse(response);
      onRefreshComplete?.(response);
      
      // Show success toast or notification here if desired
      console.log('Odds refreshed:', response);
      
    } catch (error) {
      console.error('Failed to refresh odds (Netlify functions not running locally):', error);
      // In local dev, just show a message that functions aren't available
      setLastResponse({
        success: false,
        week,
        season,
        fetched: { missingLocked: 0, eligible: 0 },
        skipped: { alreadyLocked: 0, notEligible: 0 },
        usage: { remaining: 0, cost: 0 },
        error: 'Netlify functions not available locally'
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const getButtonText = () => {
    if (isRefreshing) return 'Refreshing...';
    if (!isCurrentWeek) return 'Not Current Week';
    if (!hasUnstartedGames) return 'All Games Finished';
    return 'Refresh Odds';
  };

  const getButtonClass = () => {
    const baseClass = 'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border';
    
    if (isCurrentWeek && hasUnstartedGames && !isRefreshing) {
      return `${baseClass} bg-card text-card-foreground border-border hover:bg-accent hover:text-accent-foreground shadow-sm`;
    } else {
      return `${baseClass} bg-muted text-muted-foreground border-muted cursor-not-allowed opacity-50`;
    }
  };

  const getTitle = () => {
    if (!isCurrentWeek) return 'Manual refresh only available for current week';
    if (!hasUnstartedGames) return 'No unstarted or live games to refresh odds for';
    return 'Refresh odds for unstarted and live games';
  };

  const getLastUpdatedText = () => {
    if (!weekDoc?.lastOddsFetchAt) return 'Never updated';
    
    const now = new Date();
    const lastFetch = weekDoc.lastOddsFetchAt;
    const ageMinutes = Math.floor((now.getTime() - lastFetch.getTime()) / (1000 * 60));
    
    if (ageMinutes < 1) return 'Updated just now';
    if (ageMinutes < 60) return `Updated ${ageMinutes}m ago`;
    
    const ageHours = Math.floor(ageMinutes / 60);
    if (ageHours < 24) return `Updated ${ageHours}h ago`;
    
    const ageDays = Math.floor(ageHours / 24);
    return `Updated ${ageDays}d ago`;
  };

  return (
    <div className="flex flex-col items-end space-y-2">
      <div className="flex items-center space-x-3">
        <div className="text-xs text-muted-foreground text-right">
          {getLastUpdatedText()}
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing || !isCurrentWeek || !hasUnstartedGames}
          className={getButtonClass()}
          title={getTitle()}
        >
          {getButtonText()}
        </button>
      </div>
      
      {lastResponse && (
        <div className="text-xs text-muted-foreground text-right">
          <div>Updated {lastResponse.fetched.eligible + lastResponse.fetched.missingLocked} games</div>
          <div>{lastResponse.usage.remaining} credits remaining</div>
        </div>
      )}
    </div>
  );
};
