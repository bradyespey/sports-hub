import type { Handler, ScheduledHandler } from "@netlify/functions";
import fetch from "node-fetch";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import tz from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(tz);

export const handler: ScheduledHandler = async (event) => {
  // Compute local time in America/Chicago
  const now = dayjs().tz("America/Chicago");

  // Run only at 2 AM local time (temporarily disabled for testing)
  if (now.hour() !== 2) {
    console.log(`Skipping - not 2 AM local, current hour: ${now.hour()}`);
    return { 
      statusCode: 200, 
      body: `skip (not 2 AM local, current hour: ${now.hour()})` 
    };
  }

  const payload = { mode: "daily" };

  // Use relative URL to call the existing odds_refresh function
  const oddsRefreshUrl = process.env.INTERNAL_ODDS_REFRESH_URL || "/.netlify/functions/odds_refresh";

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

    console.log(`Daily odds refresh successful at ${now.format('YYYY-MM-DD HH:mm:ss')} America/Chicago: ${text}`);
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
