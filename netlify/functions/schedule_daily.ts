import { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
  try {
    // Get current time in America/Chicago timezone
    const now = new Date();
    const chicagoTime = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Chicago',
      hour: 'numeric',
      hour12: false
    }).format(now);

    const currentHour = parseInt(chicagoTime);
    
    console.log(`Schedule check: Chicago time hour=${currentHour}`);

    // Only run at 11:00 America/Chicago
    if (currentHour !== 11) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Not 11:00 Chicago time (current: ${currentHour}:00), skipping`
        })
      };
    }

    // Call odds refresh with daily mode
    const refreshUrl = `${process.env.URL || 'https://localhost:8888'}/.netlify/functions/odds_refresh`;
    
    const response = await fetch(refreshUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        mode: 'daily'
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(`Odds refresh failed: ${response.status}`);
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Daily odds refresh completed',
        time: chicagoTime + ':00 Chicago',
        result
      })
    };

  } catch (error) {
    console.error('Daily schedule error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        time: new Date().toISOString()
      })
    };
  }
};
