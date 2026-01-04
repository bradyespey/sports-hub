// src/components/Standings.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Target, TrendingUp } from 'lucide-react';
import { Game, Pick } from '@/types';

interface StandingsProps {
  games: Game[];
  picks: Record<string, Pick>;
  currentUserId: string;
  opponentUserId: string;
  currentUserName?: string;
  opponentUserName?: string;
  selectedWeek: number;
}

interface UserStats {
  weeklyCorrect: number;
  weeklyTotal: number;
  weeklyPercentage: number;
  seasonCorrect: number;
  seasonTotal: number;
  seasonPercentage: number;
  weeklyPoints: number; // Weighted points for this week
  seasonPoints: number; // Total weighted points for season
}

/**
 * Get point value for a game based on week type
 * Regular season: 1 point
 * Wildcard, Divisional, Conference: 2 points
 * Super Bowl: 3 points
 */
const getGamePointValue = (game: Game): number => {
  if (!game.weekType || game.weekType === 'regular') return 1;
  if (game.weekType === 'superbowl') return 3;
  return 2; // wildcard, divisional, conference
};

export const Standings = ({ games, picks, currentUserId, opponentUserId, currentUserName, opponentUserName, selectedWeek }: StandingsProps) => {
  const calculateUserStats = (userId: string): UserStats => {
    const userPicks = Object.values(picks).filter(pick => pick.uid === userId);
    
    let weeklyCorrect = 0;
    let weeklyTotal = 0;
    let weeklyPoints = 0;
    let seasonCorrect = 0;
    let seasonTotal = 0;
    let seasonPoints = 0;

    // Calculate weekly stats (current week only)
    const currentWeekGames = games.filter(game => {
      const gameWeekMatch = game.gameId.match(/W(\d+)/);
      if (!gameWeekMatch) return false;
      const gameWeek = parseInt(gameWeekMatch[1]);
      return gameWeek === selectedWeek && game.status === 'final';
    });

    currentWeekGames.forEach(game => {
      const userPick = userPicks.find(pick => pick.gameId === game.gameId);
      if (userPick) {
        const winner = game.homeScore! > game.awayScore! ? game.homeTeam : game.awayTeam;
        const isCorrect = userPick.selection === winner;
        const pointValue = getGamePointValue(game);
        
        weeklyTotal++;
        
        if (isCorrect) {
          weeklyCorrect++;
          weeklyPoints += pointValue;
        }
      }
    });

    // Calculate season stats from all picks up to current week
    const userAllPicks = Object.values(picks).filter(pick => pick.uid === userId);
    
    // Filter picks for weeks up to and including the current week
    const seasonPicks = userAllPicks.filter(pick => {
      const pickWeekMatch = pick.gameId.match(/W(\d+)/);
      if (!pickWeekMatch) return false;
      const pickWeek = parseInt(pickWeekMatch[1]);
      return pickWeek <= selectedWeek;
    });
    
    seasonTotal = seasonPicks.length;
    seasonCorrect = 0;
    
    // Count correct picks across all available games (now includes previous weeks)
    seasonPicks.forEach(pick => {
      const game = games.find(g => g.gameId === pick.gameId);
      if (game && game.status === 'final' && game.homeScore !== undefined && game.awayScore !== undefined) {
        const winner = game.homeScore > game.awayScore ? game.homeTeam : game.awayTeam;
        if (pick.selection === winner) {
          seasonCorrect++;
          const pointValue = getGamePointValue(game);
          seasonPoints += pointValue;
        }
      }
    });

    return {
      weeklyCorrect,
      weeklyTotal,
      weeklyPercentage: weeklyTotal > 0 ? (weeklyCorrect / weeklyTotal) * 100 : 0,
      seasonCorrect,
      seasonTotal,
      seasonPercentage: seasonTotal > 0 ? (seasonCorrect / seasonTotal) * 100 : 0,
      weeklyPoints,
      seasonPoints
    };
  };

  const currentUserStats = calculateUserStats(currentUserId);
  const opponentStats = opponentUserId ? calculateUserStats(opponentUserId) : null;
  
  // Determine if this is a playoff week
  const isPlayoffWeek = selectedWeek > 18;
  const currentWeekPointValue = isPlayoffWeek ? (selectedWeek === 22 ? 3 : 2) : 1;

  const getDisplayName = (userId: string) => {
    if (userId === currentUserId) return currentUserName || 'You';
    return opponentUserName || 'Opponent';
  };

  // For weekly leader, compare weighted points (or correct picks if tied)
  const weeklyLeader = opponentStats && currentUserStats.weeklyPoints !== opponentStats.weeklyPoints
    ? (currentUserStats.weeklyPoints > opponentStats.weeklyPoints ? currentUserId : opponentUserId)
    : (opponentStats && currentUserStats.weeklyCorrect !== opponentStats.weeklyCorrect
    ? (currentUserStats.weeklyCorrect > opponentStats.weeklyCorrect ? currentUserId : opponentUserId)
        : null);

  // For season leader, compare weighted points (or correct picks if tied)
  const seasonLeader = opponentStats && currentUserStats.seasonPoints !== opponentStats.seasonPoints
    ? (currentUserStats.seasonPoints > opponentStats.seasonPoints ? currentUserId : opponentUserId)
    : (opponentStats && currentUserStats.seasonCorrect !== opponentStats.seasonCorrect
    ? (currentUserStats.seasonCorrect > opponentStats.seasonCorrect ? currentUserId : opponentUserId)
        : null);

  return (
    <Card className="standings-card">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Trophy className="w-5 h-5 text-primary" />
          <span>Standings</span>
        </CardTitle>
        {isPlayoffWeek && (
          <div className="text-sm text-muted-foreground mt-2">
            <Badge variant="secondary" className="mr-2">
              {selectedWeek === 22 ? '🏆 Super Bowl' : '🔥 Playoffs'}
            </Badge>
            <span>
              {selectedWeek === 22 
                ? '3 points per correct pick' 
                : '2 points per correct pick'}
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Weekly Standings */}
        <div>
          <h4 className="font-semibold mb-2 flex items-center space-x-2">
            <Target className="w-4 h-4" />
            <span>This Week</span>
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-3 rounded-lg border ${weeklyLeader === currentUserId ? 'bg-primary/10 border-primary' : 'bg-muted/50'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium">{getDisplayName(currentUserId)}</span>
                {weeklyLeader === currentUserId && <Trophy className="w-4 h-4 text-primary" />}
              </div>
              <div className="text-2xl font-bold">
                {currentUserStats.weeklyCorrect}/{currentUserStats.weeklyTotal}
              </div>
              <div className="text-sm text-muted-foreground">
                {currentUserStats.weeklyPercentage.toFixed(0)}%
              </div>
              {isPlayoffWeek && (
                <div className="mt-2 text-lg font-semibold text-primary">
                  {currentUserStats.weeklyPoints} pts
                </div>
              )}
            </div>
            
            {opponentStats && (
              <div className={`p-3 rounded-lg border ${weeklyLeader === opponentUserId ? 'bg-primary/10 border-primary' : 'bg-muted/50'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{getDisplayName(opponentUserId!)}</span>
                  {weeklyLeader === opponentUserId && <Trophy className="w-4 h-4 text-primary" />}
                </div>
                <div className="text-2xl font-bold">
                  {opponentStats.weeklyCorrect}/{opponentStats.weeklyTotal}
                </div>
                <div className="text-sm text-muted-foreground">
                  {opponentStats.weeklyPercentage.toFixed(0)}%
                </div>
                {isPlayoffWeek && (
                  <div className="mt-2 text-lg font-semibold text-primary">
                    {opponentStats.weeklyPoints} pts
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Season Standings */}
        <div>
          <h4 className="font-semibold mb-2 flex items-center space-x-2">
            <TrendingUp className="w-4 h-4" />
            <span>Season Total</span>
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-3 rounded-lg border ${seasonLeader === currentUserId ? 'bg-primary/10 border-primary' : 'bg-muted/50'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium">{getDisplayName(currentUserId)}</span>
                {seasonLeader === currentUserId && <Trophy className="w-4 h-4 text-primary" />}
              </div>
              <div className="text-2xl font-bold">
                {currentUserStats.seasonCorrect}/{currentUserStats.seasonTotal}
              </div>
              <div className="text-sm text-muted-foreground">
                {currentUserStats.seasonPercentage.toFixed(0)}%
              </div>
              <div className="mt-2 text-lg font-semibold text-primary">
                {currentUserStats.seasonPoints} pts
              </div>
            </div>
            
            {opponentStats && (
              <div className={`p-3 rounded-lg border ${seasonLeader === opponentUserId ? 'bg-primary/10 border-primary' : 'bg-muted/50'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{getDisplayName(opponentUserId!)}</span>
                  {seasonLeader === opponentUserId && <Trophy className="w-4 h-4 text-primary" />}
                </div>
                <div className="text-2xl font-bold">
                  {opponentStats.seasonCorrect}/{opponentStats.seasonTotal}
                </div>
                <div className="text-sm text-muted-foreground">
                  {opponentStats.seasonPercentage.toFixed(0)}%
                </div>
                <div className="mt-2 text-lg font-semibold text-primary">
                  {opponentStats.seasonPoints} pts
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Week Status */}
        {currentUserStats.weeklyTotal === 0 && (
          <div className="text-center py-4">
            <Badge variant="outline">No completed games this week</Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
