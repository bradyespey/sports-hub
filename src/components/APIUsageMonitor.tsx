import React, { useState, useEffect } from 'react';
import { SnapshotService } from '@/services/SnapshotService';

interface APIUsage {
  used: number;
  remaining: number;
  lastCost: number;
  lastUpdate: Date;
}

interface WeekSnapshot {
  season: number;
  week: number;
  fetchedAt: Date;
  dataType: 'odds' | 'scores';
  provider: string;
}

interface APIUsageMonitorProps {
  season: number;
  week: number;
}

export const APIUsageMonitor: React.FC<APIUsageMonitorProps> = ({ season, week }) => {
  const [usage, setUsage] = useState<APIUsage | null>(null);
  const [oddsSnapshot, setOddsSnapshot] = useState<WeekSnapshot | null>(null);
  const [scoresSnapshot, setScoresSnapshot] = useState<WeekSnapshot | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const snapshotService = new SnapshotService();

  useEffect(() => {
    loadUsageData();
    loadSnapshots();
  }, [season, week]);

  const loadUsageData = async () => {
    const usageData = await snapshotService.getAPIUsage();
    setUsage(usageData);
  };

  const loadSnapshots = async () => {
    const odds = await snapshotService.getWeekSnapshot(season, week, 'odds');
    const scores = await snapshotService.getWeekSnapshot(season, week, 'scores');
    setOddsSnapshot(odds);
    setScoresSnapshot(scores);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await snapshotService.triggerPulse(season, week);
      // Refresh local data after a short delay
      setTimeout(() => {
        loadUsageData();
        loadSnapshots();
        setIsRefreshing(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to refresh:', error);
      setIsRefreshing(false);
    }
  };

  const getUsageColor = (remaining: number): string => {
    if (remaining > 200) return 'text-green-600';
    if (remaining > 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getUsagePercentage = (used: number, total: number = 500): number => {
    return Math.round((used / total) * 100);
  };

  return (
    <div className="bg-card border rounded-lg p-3 text-xs space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-medium">API Status</span>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50"
        >
          {isRefreshing ? 'Syncing...' : 'Sync'}
        </button>
      </div>

      {usage && (
        <div className="space-y-1">
          <div className="flex justify-between">
            <span>Usage:</span>
            <span className={getUsageColor(usage.remaining)}>
              {usage.used}/500 ({getUsagePercentage(usage.used)}%)
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1">
            <div
              className={`h-1 rounded-full ${
                usage.remaining > 200 ? 'bg-green-600' :
                usage.remaining > 50 ? 'bg-yellow-600' : 'bg-red-600'
              }`}
              style={{ width: `${getUsagePercentage(usage.used)}%` }}
            />
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Remaining: {usage.remaining}</span>
            <span>Last: {usage.lastCost} credits</span>
          </div>
        </div>
      )}

      <div className="space-y-1 border-t pt-2">
        <div className="font-medium">Data Freshness</div>
        {oddsSnapshot && (
          <div className="flex justify-between">
            <span>Odds:</span>
            <span className="text-muted-foreground">
              {snapshotService.getDataFreshness(oddsSnapshot)}
            </span>
          </div>
        )}
        {scoresSnapshot && (
          <div className="flex justify-between">
            <span>Scores:</span>
            <span className="text-muted-foreground">
              {snapshotService.getDataFreshness(scoresSnapshot)}
            </span>
          </div>
        )}
        {!oddsSnapshot && !scoresSnapshot && (
          <div className="text-muted-foreground">No snapshots available</div>
        )}
      </div>

      {usage && usage.remaining < 50 && (
        <div className="bg-red-50 border border-red-200 rounded p-2 text-red-800">
          <div className="font-medium">Low API Credits</div>
          <div>Switching to cached data only</div>
        </div>
      )}
    </div>
  );
};
