// src/lib/oddsClient.ts

export interface OddsRefreshResult {
  updated: number;
  filledPast: number;
  remaining?: string | null;
  totalGames: number;
  apiEvents: number;
  note?: string;
}

/**
 * Manually triggers an odds refresh for a specific season and week.
 * @param {number} season - The NFL season year
 * @param {number} week - The week number to refresh
 * @returns {Promise<OddsRefreshResult>} Result containing update statistics
 * @throws {Error} If the refresh request fails
 */
export async function refreshOddsNow(season: number, week: number): Promise<OddsRefreshResult> {
  // For development, try production URL as fallback since local Netlify dev can be complex
  const functionsUrl = import.meta.env.DEV 
    ? "https://sportshub.theespeys.com/.netlify/functions/odds_refresh"
    : "/.netlify/functions/odds_refresh";
    
  const res = await fetch(functionsUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ season, week, mode: "manual" }),
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to refresh odds: ${res.status} ${errorText}`);
  }
  
  return res.json();
}

/**
 * Retrieves the timestamp of the last odds update for a specific week.
 * @param {number} season - The NFL season year
 * @param {number} week - The week number to check
 * @returns {Promise<Date | null>} The last update timestamp, or null if no update exists
 */
export async function getLastOddsUpdate(season: number, week: number): Promise<Date | null> {
  const { doc, getDoc } = await import('firebase/firestore');
  const { db } = await import('./firebase');
  
  const weekId = `${season}_${String(week).padStart(2, "0")}`;
  const snap = await getDoc(doc(db, "weeks", weekId));
  const data = snap.data();
  
  if (data?.lastOddsFetchAt?.toDate) {
    return data.lastOddsFetchAt.toDate();
  }
  
  return null;
}
