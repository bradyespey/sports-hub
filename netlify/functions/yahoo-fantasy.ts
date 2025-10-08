// netlify/functions/yahoo-fantasy.ts
import { Handler } from '@netlify/functions';

const YAHOO_CLIENT_ID = process.env.YAHOO_CLIENT_ID;
const YAHOO_CLIENT_SECRET = process.env.YAHOO_CLIENT_SECRET;

// For simplicity with read-only access, you can use a manually generated refresh token
// See instructions in yahoo-auth.ts for how to get this
const YAHOO_REFRESH_TOKEN = process.env.YAHOO_REFRESH_TOKEN;

interface YahooTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

async function refreshAccessToken(): Promise<string> {
  if (!YAHOO_CLIENT_ID || !YAHOO_CLIENT_SECRET || !YAHOO_REFRESH_TOKEN) {
    throw new Error('Yahoo OAuth credentials not configured');
  }

  const auth = Buffer.from(`${YAHOO_CLIENT_ID}:${YAHOO_CLIENT_SECRET}`).toString('base64');
  
  const response = await fetch('https://api.login.yahoo.com/oauth2/get_token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: YAHOO_REFRESH_TOKEN,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh token: ${error}`);
  }

  const data: YahooTokenResponse = await response.json();
  return data.access_token;
}

async function makeYahooRequest(url: string, accessToken: string) {
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Yahoo API error: ${error}`);
  }

  return response.json();
}

export const handler: Handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const params = event.queryStringParameters || {};
    const endpoint = params.endpoint;
    const leagueId = params.leagueId || '590446';
    const week = params.week;

    if (!endpoint) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing endpoint parameter' }),
      };
    }

    // Get fresh access token
    const accessToken = await refreshAccessToken();

    let url = '';
    
    switch (endpoint) {
      case 'league':
        url = `https://fantasysports.yahooapis.com/fantasy/v2/league/461.l.${leagueId}?format=json`;
        break;
      
      case 'standings':
        url = `https://fantasysports.yahooapis.com/fantasy/v2/league/461.l.${leagueId}/standings?format=json`;
        break;
      
      case 'scoreboard':
        if (week) {
          url = `https://fantasysports.yahooapis.com/fantasy/v2/league/461.l.${leagueId}/scoreboard;week=${week}?format=json`;
        } else {
          url = `https://fantasysports.yahooapis.com/fantasy/v2/league/461.l.${leagueId}/scoreboard?format=json`;
        }
        break;
      
      case 'teams':
        url = `https://fantasysports.yahooapis.com/fantasy/v2/league/461.l.${leagueId}/teams?format=json`;
        break;
      
      case 'team':
        const teamId = params.teamId;
        if (!teamId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Missing teamId parameter' }),
          };
        }
        if (week) {
          url = `https://fantasysports.yahooapis.com/fantasy/v2/team/${teamId}/roster;week=${week}?format=json`;
        } else {
          url = `https://fantasysports.yahooapis.com/fantasy/v2/team/${teamId}/roster?format=json`;
        }
        break;
      
      case 'matchups':
        const myTeamId = params.teamId;
        if (!myTeamId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Missing teamId parameter' }),
          };
        }
        if (week) {
          url = `https://fantasysports.yahooapis.com/fantasy/v2/team/${myTeamId}/matchups;weeks=${week}?format=json`;
        } else {
          url = `https://fantasysports.yahooapis.com/fantasy/v2/team/${myTeamId}/matchups?format=json`;
        }
        break;
      
      case 'player-stats':
        const playerKey = params.playerKey;
        if (!playerKey || !week) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Missing playerKey or week parameter' }),
          };
        }
        url = `https://fantasysports.yahooapis.com/fantasy/v2/player/${playerKey}/stats;type=week;week=${week}?format=json`;
        break;
      
      case 'player-points':
        const playerKey2 = params.playerKey;
        if (!playerKey2 || !week) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Missing playerKey or week parameter' }),
          };
        }
        url = `https://fantasysports.yahooapis.com/fantasy/v2/player/${playerKey2}/stats;type=week;week=${week};out=player_points?format=json`;
        break;
      
      case 'player-week':
        const playerKey3 = params.playerKey;
        if (!playerKey3 || !week) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Missing playerKey or week parameter' }),
          };
        }
        url = `https://fantasysports.yahooapis.com/fantasy/v2/player/${playerKey3}/stats;type=week;week=${week};out=stats,player_points?format=json`;
        break;
      
      case 'players':
        if (!week) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Missing week parameter' }),
          };
        }
        url = `https://fantasysports.yahooapis.com/fantasy/v2/league/461.l.${leagueId}/players;week=${week};stats=week;out=stats?format=json`;
        break;
      
      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: `Unknown endpoint: ${endpoint}` }),
        };
    }

    const data = await makeYahooRequest(url, accessToken);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data),
    };

  } catch (error) {
    console.error('Yahoo Fantasy API Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to fetch fantasy data',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
};
