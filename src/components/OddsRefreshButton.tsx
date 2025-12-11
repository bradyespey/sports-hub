// src/components/OddsRefreshButton.tsx
import { useState, useEffect } from "react";
import { refreshOddsNow, getLastOddsUpdate, type OddsRefreshResult } from "../lib/oddsClient";
import { Button } from "./ui/button";
import { RefreshCw, Clock } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

interface OddsRefreshButtonProps {
  season: number;
  week: number;
  className?: string;
}

export function OddsRefreshButton({ season, week, className = "" }: OddsRefreshButtonProps) {
  const { isDemo } = useAuth();
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [result, setResult] = useState<OddsRefreshResult | null>(null);

  async function syncLastUpdated() {
    // Skip in demo mode
    if (isDemo) {
      setLastUpdated("Demo Mode");
      return;
    }
    
    try {
      const lastUpdate = await getLastOddsUpdate(season, week, isDemo);
      if (lastUpdate) {
        setLastUpdated(lastUpdate.toLocaleString());
      } else {
        setLastUpdated("Never");
      }
    } catch (error) {
      console.warn("Failed to get last odds update:", error);
      setLastUpdated("Unknown");
    }
  }

  useEffect(() => {
    syncLastUpdated();
  }, [season, week, isDemo]);

  async function onClick() {
    setLoading(true);
    setResult(null);
    
    try {
      const refreshResult = await refreshOddsNow(season, week);
      setResult(refreshResult);
      await syncLastUpdated();
      
      // Show brief success message
    } catch (error) {
      console.error("Failed to refresh odds:", error);
      alert(`Failed to refresh odds: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 ${className}`}>
      <div className="flex items-center gap-2 sm:gap-3">
        <Button 
          onClick={onClick} 
          disabled={loading}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? "Updating..." : "Update Odds"}
        </Button>
        
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span className="whitespace-nowrap">Last: {lastUpdated}</span>
        </div>
      </div>
      
      {result && (
        <div className="text-sm text-green-600 text-center sm:text-left">
          Updated {result.updated}, Filled {result.filledPast}
          {result.remaining && ` (${result.remaining} credits left)`}
        </div>
      )}
    </div>
  );
}