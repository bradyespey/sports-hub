// src/components/GameCard.tsx
import { useState } from 'react';
import { Game, Pick } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Trophy } from 'lucide-react';
import { ProviderFactory } from '@/providers/ProviderFactory';
import { getTeamName } from '@/lib/teamNames';
import dayjs, { LOCAL_TIMEZONE } from '@/lib/dayjs';

interface GameCardProps {
  game: Game;
  userPick?: Pick;
  opponentPick?: Pick;
  onPickChange: (gameId: string, selection: string) => void;
  canReveal: boolean;
  currentUserId: string;
}

export const GameCard = ({ 
  game, 
  userPick, 
  opponentPick, 
  onPickChange, 
  canReveal,
  currentUserId
}: GameCardProps) => {
  const [selectedPick, setSelectedPick] = useState(userPick?.selection || '');
  const logosProvider = ProviderFactory.createLogosProvider();
  
  const isLocked = game.kickoffUtc <= new Date();
  const kickoffLocal = dayjs(game.kickoffUtc).tz(LOCAL_TIMEZONE);
  const isLive = game.status === 'live';
  const isFinal = game.status === 'final';

  const handlePickChange = (selection: string) => {
    if (isLocked) return;
    setSelectedPick(selection);
    onPickChange(game.gameId, selection);
  };

  const getWinner = () => {
    if (!isFinal || !game.homeScore || !game.awayScore) return null;
    return game.homeScore > game.awayScore ? game.homeTeam : game.awayTeam;
  };

  const winner = getWinner();
  const userCorrect = winner && userPick?.selection === winner;
  const opponentCorrect = winner && opponentPick?.selection === winner;

  const getStatusDisplay = () => {
    if (isLive) {
      const quarterText = game.quarter ? `${game.quarter}${game.quarter === 1 ? 'ST' : game.quarter === 2 ? 'ND' : game.quarter === 3 ? 'RD' : 'TH'}` : 'LIVE';
      const timeText = game.timeRemaining || '';
      
      return (
        <div className="text-center">
          <div className="text-xs text-red-600 font-semibold">{quarterText}</div>
          {timeText && <div className="text-xs text-muted-foreground">{timeText}</div>}
        </div>
      );
    }
    
    if (isFinal) {
      return (
        <div className="text-center">
          <div className="text-xs font-semibold text-muted-foreground">FINAL</div>
        </div>
      );
    }

    // Scheduled
    return (
      <div className="text-center">
        <div className="text-xs text-muted-foreground">{kickoffLocal.format('ddd')}</div>
        <div className="text-xs text-muted-foreground">{kickoffLocal.format('h:mm A')}</div>
      </div>
    );
  };

  const isWinningTeam = (team: string) => {
    return winner === team;
  };

  const getPickBadges = (team: string) => {
    const userPickedThis = userPick?.selection === team;
    const opponentPickedThis = opponentPick?.selection === team;
    
    const badges = [];
    
    if (userPickedThis) {
      badges.push("Brady");
    }
    if (opponentPickedThis) {
      badges.push("Jenny");
    }
    
    return badges;
  };

  const getPickColor = (team: string) => {
    const userPickedThis = userPick?.selection === team;
    const opponentPickedThis = opponentPick?.selection === team;
    
    if (isFinal) {
      if (userPickedThis && userCorrect) return "text-green-600";
      if (opponentPickedThis && opponentCorrect) return "text-green-600";
      if (userPickedThis && !userCorrect) return "text-red-600";
      if (opponentPickedThis && !opponentCorrect) return "text-red-600";
    }
    
    return "text-blue-600";
  };

  return (
    <Card className="game-card hover:shadow-md transition-shadow">
      <CardContent className="p-3">
        <div className="space-y-2">
          {/* Away Team Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <img 
                src={logosProvider.logoUrl(game.awayTeam)} 
                alt={game.awayTeam}
                className="w-6 h-6 rounded-sm object-contain flex-shrink-0"
                onError={(e) => {
                  e.currentTarget.src = `https://ui-avatars.com/api/?name=${game.awayTeam}&size=24&background=f3f4f6&color=374151`;
                }}
              />
              <span className={`font-semibold text-sm ${isWinningTeam(game.awayTeam) && isFinal ? 'text-foreground' : 'text-muted-foreground'}`}>
                {getTeamName(game.awayTeam)}
              </span>
              {(isLive || isFinal) && game.awayScore !== undefined && (
                <div className="flex items-center space-x-1">
                  <span className={`text-lg font-bold ${isWinningTeam(game.awayTeam) && isFinal ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {game.awayScore}
                  </span>
                  {isLive && game.possession === game.awayTeam && (
                    <span className="text-sm">🏈</span>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-1">
              {!isLocked ? (
                <Button
                  variant={selectedPick === game.awayTeam ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePickChange(game.awayTeam)}
                  className="text-xs h-6 px-2"
                >
                  Pick
                </Button>
              ) : (
                <div className="flex space-x-1">
                  {getPickBadges(game.awayTeam).map((name, index) => (
                    <Badge 
                      key={index}
                      variant="secondary" 
                      className={`text-xs ${getPickColor(game.awayTeam)}`}
                    >
                      {name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Home Team Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <img 
                src={logosProvider.logoUrl(game.homeTeam)} 
                alt={game.homeTeam}
                className="w-6 h-6 rounded-sm object-contain flex-shrink-0"
                onError={(e) => {
                  e.currentTarget.src = `https://ui-avatars.com/api/?name=${game.homeTeam}&size=24&background=f3f4f6&color=374151`;
                }}
              />
              <span className={`font-semibold text-sm ${isWinningTeam(game.homeTeam) && isFinal ? 'text-foreground' : 'text-muted-foreground'}`}>
                {getTeamName(game.homeTeam)}
              </span>
              {(isLive || isFinal) && game.homeScore !== undefined && (
                <div className="flex items-center space-x-1">
                  <span className={`text-lg font-bold ${isWinningTeam(game.homeTeam) && isFinal ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {game.homeScore}
                  </span>
                  {isLive && game.possession === game.homeTeam && (
                    <span className="text-sm">🏈</span>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-1">
              {!isLocked ? (
                <Button
                  variant={selectedPick === game.homeTeam ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePickChange(game.homeTeam)}
                  className="text-xs h-6 px-2"
                >
                  Pick
                </Button>
              ) : (
                <div className="flex space-x-1">
                  {getPickBadges(game.homeTeam).map((name, index) => (
                    <Badge 
                      key={index}
                      variant="secondary" 
                      className={`text-xs ${getPickColor(game.homeTeam)}`}
                    >
                      {name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Row - Odds and Status */}
          <div className="flex items-center justify-between pt-2 border-t">
         <div className="text-xs text-muted-foreground">
           {(game.spreadHome !== undefined && game.spreadHome !== 0) || (game.total !== undefined && game.total !== 0) ? (
             <span>
               {getTeamName(game.homeTeam)} {game.spreadHome > 0 ? '+' : ''}{game.spreadHome} O/U {game.total}
               {game.network && ` TV: ${game.network}`}
               {game.sportsbook?.provider === 'Mock Odds Provider' && ' (MOCK)'}
             </span>
           ) : game.network ? (
             <span>TV: {game.network}</span>
           ) : null}
         </div>
            <div className="text-right">
              {getStatusDisplay()}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};