import type { Handler } from "@netlify/functions";
import fetch from "node-fetch";
import * as admin from "firebase-admin";

let app: admin.app.App | null = null;
function getDb() {
  if (!app) {
    // Handle Firebase private key formatting for different environments
    let privateKey = process.env.FIREBASE_PRIVATE_KEY || "";
    
    // Remove surrounding quotes if present
    privateKey = privateKey.replace(/^["']|["']$/g, "");
    
    // Replace literal \n strings with actual newlines
    privateKey = privateKey.replace(/\\n/g, "\n");
    
    // Ensure proper formatting with begin/end markers
    if (!privateKey.includes("-----BEGIN PRIVATE KEY-----")) {
      throw new Error("Invalid Firebase private key format");
    }

    app = admin.initializeApp({
      credential: admin.credential.cert({
        project_id: process.env.FIREBASE_PROJECT_ID,
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        private_key: privateKey,
      }),
    });
  }
  return admin.firestore();
}

// Helper function to normalize team abbreviations (matching ESPN provider)
function normalizeTeamAbbreviation(abbrev: string): string {
  const teamMap: Record<string, string> = {
    'WSH': 'WAS',  // Washington Commanders
    'LAR': 'LAR',  // Los Angeles Rams (already correct)
    'LAC': 'LAC',  // Los Angeles Chargers (already correct)
  };
  return teamMap[abbrev] || abbrev;
}

// Comprehensive team name mapping for matching with Odds API
function getTeamNames(abbrev: string): string[] {
  const teamNames: Record<string, string[]> = {
    'ARI': ['Arizona Cardinals', 'Arizona', 'Cardinals'],
    'ATL': ['Atlanta Falcons', 'Atlanta', 'Falcons'],
    'BAL': ['Baltimore Ravens', 'Baltimore', 'Ravens'],
    'BUF': ['Buffalo Bills', 'Buffalo', 'Bills'],
    'CAR': ['Carolina Panthers', 'Carolina', 'Panthers'],
    'CHI': ['Chicago Bears', 'Chicago', 'Bears'],
    'CIN': ['Cincinnati Bengals', 'Cincinnati', 'Bengals'],
    'CLE': ['Cleveland Browns', 'Cleveland', 'Browns'],
    'DAL': ['Dallas Cowboys', 'Dallas', 'Cowboys'],
    'DEN': ['Denver Broncos', 'Denver', 'Broncos'],
    'DET': ['Detroit Lions', 'Detroit', 'Lions'],
    'GB': ['Green Bay Packers', 'Green Bay', 'Packers'],
    'HOU': ['Houston Texans', 'Houston', 'Texans'],
    'IND': ['Indianapolis Colts', 'Indianapolis', 'Colts'],
    'JAX': ['Jacksonville Jaguars', 'Jacksonville', 'Jaguars'],
    'KC': ['Kansas City Chiefs', 'Kansas City', 'Chiefs'],
    'LAC': ['Los Angeles Chargers', 'LA Chargers', 'Chargers'],
    'LAR': ['Los Angeles Rams', 'LA Rams', 'Rams'],
    'LV': ['Las Vegas Raiders', 'Las Vegas', 'Raiders'],
    'MIA': ['Miami Dolphins', 'Miami', 'Dolphins'],
    'MIN': ['Minnesota Vikings', 'Minnesota', 'Vikings'],
    'NE': ['New England Patriots', 'New England', 'Patriots'],
    'NO': ['New Orleans Saints', 'New Orleans', 'Saints'],
    'NYG': ['New York Giants', 'NY Giants', 'Giants'],
    'NYJ': ['New York Jets', 'NY Jets', 'Jets'],
    'PHI': ['Philadelphia Eagles', 'Philadelphia', 'Eagles'],
    'PIT': ['Pittsburgh Steelers', 'Pittsburgh', 'Steelers'],
    'SEA': ['Seattle Seahawks', 'Seattle', 'Seahawks'],
    'SF': ['San Francisco 49ers', 'San Francisco', '49ers'],
    'TB': ['Tampa Bay Buccaneers', 'Tampa Bay', 'Buccaneers'],
    'TEN': ['Tennessee Titans', 'Tennessee', 'Titans'],
    'WAS': ['Washington Commanders', 'Washington', 'Commanders']
  };
  
  return teamNames[abbrev] || [abbrev];
}

// Helper function to map game status
function mapGameStatus(espnStatus: string): 'scheduled' | 'live' | 'final' {
  const statusMap: Record<string, 'scheduled' | 'live' | 'final'> = {
    'STATUS_SCHEDULED': 'scheduled',
    'STATUS_IN_PROGRESS': 'live',
    'STATUS_HALFTIME': 'live',
    'STATUS_END_PERIOD': 'live',
    'STATUS_FINAL': 'final',
    'STATUS_FINAL_OVERTIME': 'final'
  };
  return statusMap[espnStatus] || 'scheduled';
}

// Cache helpers to reduce ESPN API calls
async function getCachedData(db: any, key: string): Promise<any | null> {
  try {
    const cacheDoc = await db.collection('cache').doc(key).get();
    if (!cacheDoc.exists) return null;
    
    const data = cacheDoc.data();
    const now = Date.now();
    
    // Check if cache is still valid
    if (data.expiresAt && now > data.expiresAt) {
      // Cache expired, delete it
      await db.collection('cache').doc(key).delete();
      return null;
    }
    
    return data.value;
  } catch (error) {
    console.error('Error reading cache:', error);
    return null;
  }
}

async function setCachedData(db: any, key: string, value: any, ttlMs: number): Promise<void> {
  try {
    const expiresAt = Date.now() + ttlMs;
    await db.collection('cache').doc(key).set({
      value,
      expiresAt,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error('Error writing cache:', error);
  }
}

type Body = {
  season?: number;
  week?: number;
  mode?: "manual" | "daily" | "bootstrap";
};

export const handler: Handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed", headers };
  }

  const db = getDb();

  let body: Body = {};
  try { body = event.body ? JSON.parse(event.body) : {}; } catch {}

  // Resolve target week. If not provided, use the latest doc in `weeks` marked as current.
  const season = body.season || 2025;
  const week = body.week || 1;

  // Fetch games from ESPN API instead of Firestore
  let games: any[] = [];
  try {
    // Use a simple cache key for ESPN data
    const cacheKey = `espn_schedule_${season}_${week}`;
    
    // Check if we have cached ESPN data (cache for 30 minutes for schedule data)
    let espnData: any = null;
    const cachedEspnData = await getCachedData(db, cacheKey);
    
        if (cachedEspnData) {
          espnData = cachedEspnData;
        } else {
      // Determine seasonType: 2 for regular season (weeks 1-18), 3 for playoffs (weeks 19+)
      const seasonType = week <= 18 ? 2 : 3;
      // For playoffs, ESPN uses week 1-4 (not 19-22)
      const espnWeek = week <= 18 ? week : week - 18;
      
      const espnResponse = await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=${seasonType}&week=${espnWeek}`);
      if (!espnResponse.ok) {
        throw new Error(`ESPN API error: ${espnResponse.status} ${espnResponse.statusText}`);
      }
      
      espnData = await espnResponse.json();
      
      // Cache the ESPN data for 30 minutes
      await setCachedData(db, cacheKey, espnData, 30 * 60 * 1000);
    }
    games = espnData.events?.map((event: any) => {
      const competition = event.competitions[0];
      const homeTeam = competition.competitors.find((c: any) => c.homeAway === 'home');
      const awayTeam = competition.competitors.find((c: any) => c.homeAway === 'away');
      
      // Normalize team abbreviations
      const normalizedAway = normalizeTeamAbbreviation(awayTeam.team.abbreviation);
      const normalizedHome = normalizeTeamAbbreviation(homeTeam.team.abbreviation);
      
      return {
        gameId: `${season}-W${week.toString().padStart(2, '0')}-${normalizedAway}-${normalizedHome}`,
        season,
        week,
        kickoffUtc: event.date,
        homeTeam: normalizedHome,
        awayTeam: normalizedAway,
        status: mapGameStatus(competition.status.type.name)
      };
        }) || [];
  } catch (error) {
    console.error('Error fetching from ESPN API:', error);
    return { 
      statusCode: 502, 
      body: `ESPN API error: ${error}`,
      headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" }
    };
  }

  // Partition games by time and odds presence
  const nowIso = new Date().toISOString();
  const toUpdate: any[] = [];
  const toFillOnce: any[] = [];

  // Preload current odds docs to avoid extra reads
  const oddsDocs = await Promise.all(games.map(g => db.collection("odds").doc(g.gameId).get()));
  const oddsByGameId = new Map(oddsDocs.map(doc => [doc.id, doc.exists ? doc.data() : null]));

  for (const g of games) {
    const kickoffUtc = g.kickoffUtc;
    const isPast = kickoffUtc && kickoffUtc < nowIso;
    const existing = oddsByGameId.get(g.gameId);

    if (isPast) {
      if (!existing) {
        // Past game missing odds: allow a one-time fill
        toFillOnce.push(g);
      }
      // If past and existing odds exist, do nothing
    } else {
      // Future game: eligible to update on demand
      toUpdate.push(g);
    }
  }

  // If nothing to do, return early
  if (toUpdate.length === 0 && toFillOnce.length === 0) {
    return { 
      statusCode: 200, 
      body: JSON.stringify({ updated: 0, filledPast: 0, note: "No eligible games" }),
      headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" }
    };
  }

  // Fetch league-wide odds once (markets=spreads&regions=us)
  const url = new URL(process.env.ODDS_API_URL as string);
  url.searchParams.set("apiKey", process.env.ODDS_API_KEY as string);
  url.searchParams.set("markets", "spreads");
  url.searchParams.set("regions", "us");

  const resp = await fetch(url.toString());
  if (!resp.ok) {
    const text = await resp.text();
    console.error(`Odds API error: ${resp.status} ${text}`);
    return { 
      statusCode: 502, 
      body: `Odds API error: ${resp.status} ${text}`,
      headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" }
    };
  }
  const providerPayload = await resp.json() as any[];

  // Index provider data by event id and by team tuple for loose matching
  const byEventId = new Map<string, any>();
  for (const evt of providerPayload) {
    byEventId.set(evt.id, evt);
  }

  // Helper to find provider game for our game record
  function resolveProviderGame(g: any) {
    if (g.oddsEventId && byEventId.has(g.oddsEventId)) {
      return byEventId.get(g.oddsEventId);
    }
    
    // Get all possible team names for our teams
    const homeTeamNames = getTeamNames(g.homeTeam);
    const awayTeamNames = getTeamNames(g.awayTeam);
    
    // Match by comprehensive team names
    for (const evt of providerPayload) {
      const oddsHome = evt.home_team || "";
      const oddsAway = evt.away_team || "";
      
      // Check if any of our team names match the odds API team names
      const homeMatch = homeTeamNames.some(name => 
        oddsHome.toLowerCase().includes(name.toLowerCase()) || 
        name.toLowerCase().includes(oddsHome.toLowerCase())
      );
      const awayMatch = awayTeamNames.some(name => 
        oddsAway.toLowerCase().includes(name.toLowerCase()) || 
        name.toLowerCase().includes(oddsAway.toLowerCase())
      );
      
      // Also check reverse (home/away might be swapped)
      const homeMatchReverse = homeTeamNames.some(name => 
        oddsAway.toLowerCase().includes(name.toLowerCase()) || 
        name.toLowerCase().includes(oddsAway.toLowerCase())
      );
      const awayMatchReverse = awayTeamNames.some(name => 
        oddsHome.toLowerCase().includes(name.toLowerCase()) || 
        name.toLowerCase().includes(oddsHome.toLowerCase())
      );
      
      if ((homeMatch && awayMatch) || (homeMatchReverse && awayMatchReverse)) {
        return evt;
      }
    }
    return null;
  }

  let updated = 0, filledPast = 0;

  const batch = db.batch();

  // Upsert odds for eligible future games
  for (const g of toUpdate) {
    const evt = resolveProviderGame(g);
    if (!evt) continue;
    const ref = db.collection("odds").doc(g.gameId);
    batch.set(ref, {
      gameId: g.gameId,
      provider: "oddsapi",
      market: "h2h",
      data: evt,
      fetchedAt: admin.firestore.FieldValue.serverTimestamp(),
      locked: false,
    }, { merge: true });
    updated++;
  }

  // One-time fill for past games missing odds
  for (const g of toFillOnce) {
    const evt = resolveProviderGame(g);
    if (!evt) continue;
    const ref = db.collection("odds").doc(g.gameId);
    batch.set(ref, {
      gameId: g.gameId,
      provider: "oddsapi",
      market: "h2h",
      data: evt,
      fetchedAt: admin.firestore.FieldValue.serverTimestamp(),
      locked: true, // past game: lock immediately
    }, { merge: true });
    filledPast++;
  }

  // Mark the week as having odds and set last fetch time
  const weekId = `${season}_${String(week).padStart(2, "0")}`;
  const weekRef = db.collection("weeks").doc(weekId);
  batch.set(weekRef, {
    season, 
    week, 
    hasAnyOdds: updated + filledPast > 0,
    lastOddsFetchAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  await batch.commit();

  // Credits headers for usage monitor (optional)
  const remaining = resp.headers.get("x-requests-remaining") || null;
  const lastReq = resp.headers.get("x-requests-last") || null;
  if (remaining || lastReq) {
    await db.collection("system").doc("api_usage").set({
      remaining, 
      lastRequestAt: admin.firestore.FieldValue.serverTimestamp(), 
      lastCost: "1 credit (spreads,us)"
    }, { merge: true });
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ 
      updated, 
      filledPast, 
      remaining,
      totalGames: games.length,
      apiEvents: providerPayload.length
    }),
    headers: { 
      "content-type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  };
};

export default handler;