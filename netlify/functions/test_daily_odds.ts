import type { Handler } from "@netlify/functions";
import fetch from "node-fetch";

export const handler: Handler = async () => {
  console.log("Test daily odds function called");

  const payload = { mode: "daily" };

  // Use relative URL to call the existing odds_refresh function
  const oddsRefreshUrl = process.env.INTERNAL_ODDS_REFRESH_URL || "/.netlify/functions/odds_refresh";

  try {
    console.log(`Calling odds_refresh at: ${oddsRefreshUrl}`);
    
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

    console.log(`Test daily odds refresh successful: ${text}`);
    return { 
      statusCode: 200, 
      body: `Test successful: ${text}` 
    };
    
  } catch (error) {
    console.error(`Error calling odds_refresh: ${error}`);
    return { 
      statusCode: 500, 
      body: `Error calling odds_refresh: ${error}` 
    };
  }
};

export default handler;
