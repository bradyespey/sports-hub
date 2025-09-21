// src/lib/oddsHelper.ts
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { Game } from '@/types';

interface CachedOdds {
  gameId: string;
  data: any;
  provider: string;
  fetchedAt: any;
  locked: boolean;
}

interface OddsData {
  spreadHome: number;
  spreadAway: number;
  total: number;
  provider: string;
}

/**
 * Fetches cached odds from Firestore for a list of games
 */
export async function getCachedOddsForGames(games: Game[]): Promise<Map<string, OddsData>> {
  if (games.length === 0) return new Map();

  // Get cached odds from Firestore
  const oddsPromises = games.map(game => 
    getDocs(query(collection(db, 'odds'), where('gameId', '==', game.gameId)))
  );
  const oddsSnapshots = await Promise.all(oddsPromises);
  
  // Build odds map
  const oddsMap = new Map<string, OddsData>();
  
  oddsSnapshots.forEach(snapshot => {
    if (!snapshot.empty) {
      const cachedOdds: CachedOdds = snapshot.docs[0].data() as CachedOdds;
      const oddsData = parseOddsData(cachedOdds);
      if (oddsData) {
        oddsMap.set(cachedOdds.gameId, oddsData);
      }
    }
  });

  return oddsMap;
}

/**
 * Parses raw odds data from The Odds API format (spreads only)
 */
function parseOddsData(cachedOdds: CachedOdds): OddsData | null {
  let spreadHome = 0, spreadAway = 0;
  
  if (cachedOdds?.data?.bookmakers?.[0]?.markets) {
    const markets = cachedOdds.data.bookmakers[0].markets;
    const spreadsMarket = markets.find((m: any) => m.key === 'spreads');
    
    if (spreadsMarket?.outcomes) {
      const homeSpread = spreadsMarket.outcomes.find((o: any) => o.name === cachedOdds.data.home_team);
      const awaySpread = spreadsMarket.outcomes.find((o: any) => o.name === cachedOdds.data.away_team);
      spreadHome = homeSpread?.point || 0;
      spreadAway = awaySpread?.point || 0;
    }
  }

  return {
    spreadHome,
    spreadAway,
    total: 0, // Not fetching totals anymore
    provider: cachedOdds.provider || 'The Odds API'
  };
}

/**
 * Merges game data with cached odds and scores
 */
export function mergeGameWithOddsAndScores(
  game: Game, 
  oddsMap: Map<string, OddsData>, 
  scores: any[]
): Game {
  const cachedOdds = oddsMap.get(game.gameId);
  const gameScore = scores.find(score => score.gameId === game.gameId);
  
  return {
    ...game,
    spreadHome: cachedOdds?.spreadHome || 0,
    spreadAway: cachedOdds?.spreadAway || 0,
    total: cachedOdds?.total || 0,
    sportsbook: cachedOdds ? {
      spreadHome: cachedOdds.spreadHome,
      spreadAway: cachedOdds.spreadAway,
      total: cachedOdds.total,
      provider: cachedOdds.provider
    } : null,
    // Merge score data but prioritize the more final status
    ...gameScore,
    status: gameScore?.status === 'final' ? 'final' : game.status,
    // Ensure scores are properly set from gameScore if available
    homeScore: gameScore?.homeScore ?? game.homeScore,
    awayScore: gameScore?.awayScore ?? game.awayScore
  };
}
