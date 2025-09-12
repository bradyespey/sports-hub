import type { Handler, ScheduledHandler } from "@netlify/functions";
import fetch from "node-fetch";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import tz from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(tz);

export const handler: ScheduledHandler = async (event) => {
  // GitHub Actions runs this at 8 AM UTC (2 AM CST), so we can always run
  // The time check was causing issues with GitHub Actions timing
  const nowUtc = dayjs().utc();
  const nowCst = dayjs().tz("America/Chicago");
  
  console.log(`Daily odds refresh called at UTC: ${nowUtc.format()}, CST: ${nowCst.format()}`);

  // Get current NFL season and week (using same logic as frontend)
  const season = 2025;
  
  // NFL Week Logic: Weeks run Tuesday to Monday
  // For 2025 season, Week 1 starts September 2nd (Tuesday)
  const seasonStart = dayjs('2025-09-02').tz("America/Chicago");
  const weeksSinceStart = nowCst.diff(seasonStart, 'week');
  const week = Math.max(1, Math.min(22, weeksSinceStart + 1)); // 18 regular + 4 playoff weeks
  
  console.log(`Refreshing odds for Season ${season}, Week ${week}`);

  const payload = { season, week, mode: "daily" };

  // Use absolute URL to call the existing odds_refresh function
  const oddsRefreshUrl = process.env.INTERNAL_ODDS_REFRESH_URL || "https://sportshub.theespeys.com/.netlify/functions/odds_refresh";

  try {
    const res = await fetch(oddsRefreshUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    
    if (!res.ok) {
      console.error(`odds_refresh failed: ${res.status} ${text}`);
      return { 
        statusCode: 502, 
        body: `odds_refresh failed: ${res.status} ${text}` 
      };
    }

    return { 
      statusCode: 200, 
      body: `ok: ${text}` 
    };
    
  } catch (error) {
    console.error(`Error calling odds_refresh: ${error}`);
    return { 
      statusCode: 500, 
      body: `Error calling odds_refresh: ${error}` 
    };
  }
};

// Schedule configuration for Netlify Scheduled Functions
export const config = {
  schedule: "0 * * * *" // Run every hour (function checks for 2 AM Chicago time)
};

export default handler;
