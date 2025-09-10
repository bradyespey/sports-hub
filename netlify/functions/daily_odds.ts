import type { Handler, ScheduledHandler } from "@netlify/functions";
import fetch from "node-fetch";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import tz from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(tz);

export const handler: ScheduledHandler = async (event) => {
  // Check if we're being called at 8 AM UTC (which is 2 AM CST)
  const nowUtc = dayjs().utc();
  const nowCst = dayjs().tz("America/Chicago");
  
  // Run only at 8 AM UTC (2 AM CST) - this ensures consistent timing regardless of DST
  if (nowUtc.hour() !== 8) {
    return { 
      statusCode: 200, 
      body: `skip (not 8 AM UTC, current UTC hour: ${nowUtc.hour()}, CST hour: ${nowCst.hour()})` 
    };
  }

  const payload = { mode: "daily" };

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
