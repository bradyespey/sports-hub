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
}

interface UserStats {
  weeklyCorrect: number;
  weeklyTotal: number;
  weeklyPercentage: number;
  seasonCorrect: number;
  seasonTotal: number;
  seasonPercentage: number;
}

export const Standings = ({ games, picks, currentUserId, opponentUserId, currentUserName, opponentUserName }: StandingsProps) => {
  const calculateUserStats = (userId: string): UserStats => {
    const userPicks = Object.values(picks).filter(pick => pick.uid === userId);
    const finalGames = games.filter(game => game.status === 'final');
    
    let weeklyCorrect = 0;
    let weeklyTotal = 0;
    let seasonCorrect = 0;
    let seasonTotal = 0;

    // Calculate weekly stats (current week only)
    finalGames.forEach(game => {
      const userPick = userPicks.find(pick => pick.gameId === game.gameId);
      if (userPick) {
        const winner = game.homeScore! > game.awayScore! ? game.homeTeam : game.awayTeam;
        const isCorrect = userPick.selection === winner;
        
        weeklyTotal++;
        
        if (isCorrect) {
          weeklyCorrect++;
        }
      }
    });

    // For now, season stats are the same as weekly stats
    // In a real app, you'd fetch all weeks of data
    seasonCorrect = weeklyCorrect;
    seasonTotal = weeklyTotal;

    return {
      weeklyCorrect,
      weeklyTotal,
      weeklyPercentage: weeklyTotal > 0 ? (weeklyCorrect / weeklyTotal) * 100 : 0,
      seasonCorrect,
      seasonTotal,
      seasonPercentage: seasonTotal > 0 ? (seasonCorrect / seasonTotal) * 100 : 0
    };
  };

  const currentUserStats = calculateUserStats(currentUserId);
  const opponentStats = opponentUserId ? calculateUserStats(opponentUserId) : null;

  const getDisplayName = (userId: string) => {
    if (userId === currentUserId) return currentUserName || 'You';
    return opponentUserName || 'Opponent';
  };

  const weeklyLeader = opponentStats && currentUserStats.weeklyCorrect !== opponentStats.weeklyCorrect
    ? (currentUserStats.weeklyCorrect > opponentStats.weeklyCorrect ? currentUserId : opponentUserId)
    : null;

  const seasonLeader = opponentStats && currentUserStats.seasonCorrect !== opponentStats.seasonCorrect
    ? (currentUserStats.seasonCorrect > opponentStats.seasonCorrect ? currentUserId : opponentUserId)
    : null;

  return (
    <Card className="standings-card">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Trophy className="w-5 h-5 text-primary" />
          <span>Standings</span>
        </CardTitle>
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
              <div className="text-2xl font-bold">{currentUserStats.weeklyCorrect}/{currentUserStats.weeklyTotal}</div>
              <div className="text-sm text-muted-foreground">
                {currentUserStats.weeklyPercentage.toFixed(0)}%
              </div>
            </div>
            
            {opponentStats && (
              <div className={`p-3 rounded-lg border ${weeklyLeader === opponentUserId ? 'bg-primary/10 border-primary' : 'bg-muted/50'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{getDisplayName(opponentUserId!)}</span>
                  {weeklyLeader === opponentUserId && <Trophy className="w-4 h-4 text-primary" />}
                </div>
                <div className="text-2xl font-bold">{opponentStats.weeklyCorrect}/{opponentStats.weeklyTotal}</div>
                <div className="text-sm text-muted-foreground">
                  {opponentStats.weeklyPercentage.toFixed(0)}%
                </div>
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
              <div className="text-2xl font-bold">{currentUserStats.seasonCorrect}/{currentUserStats.seasonTotal}</div>
              <div className="text-sm text-muted-foreground">
                {currentUserStats.seasonPercentage.toFixed(0)}%
              </div>
            </div>
            
            {opponentStats && (
              <div className={`p-3 rounded-lg border ${seasonLeader === opponentUserId ? 'bg-primary/10 border-primary' : 'bg-muted/50'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{getDisplayName(opponentUserId!)}</span>
                  {seasonLeader === opponentUserId && <Trophy className="w-4 h-4 text-primary" />}
                </div>
                <div className="text-2xl font-bold">{opponentStats.seasonCorrect}/{opponentStats.seasonTotal}</div>
                <div className="text-sm text-muted-foreground">
                  {opponentStats.seasonPercentage.toFixed(0)}%
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
