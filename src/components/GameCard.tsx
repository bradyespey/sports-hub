// src/components/GameCard.tsx
import { useState } from 'react';
import { Game, Pick } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Trophy } from 'lucide-react';
import { ProviderFactory } from '@/providers/ProviderFactory';
import dayjs from '@/lib/dayjs';

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
  const kickoffLocal = dayjs(game.kickoffUtc).tz('America/Chicago');
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

  return (
    <Card className="game-card">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Badge variant={isLive ? "destructive" : isFinal ? "secondary" : "default"}>
              {isLive && <div className="live-pulse mr-1" />}
              {isLive ? 'LIVE' : isFinal ? 'FINAL' : kickoffLocal.format('ddd h:mm A')}
            </Badge>
            {game.sportsbook && (
              <Badge variant="outline" className="text-xs">
                {game.homeTeam} {game.sportsbook.spreadHome > 0 ? '+' : ''}{game.sportsbook.spreadHome}
              </Badge>
            )}
          </div>
          <Clock className="w-4 h-4 text-muted-foreground" />
        </div>

        {/* Teams */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src={logosProvider.logoUrl(game.awayTeam)} 
                alt={game.awayTeam}
                className="team-logo"
              />
              <span className="font-semibold">{game.awayTeam}</span>
            </div>
            {(isLive || isFinal) && (
              <span className="text-xl font-bold">{game.awayScore || 0}</span>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src={logosProvider.logoUrl(game.homeTeam)} 
                alt={game.homeTeam}
                className="team-logo"
              />
              <span className="font-semibold">{game.homeTeam}</span>
            </div>
            {(isLive || isFinal) && (
              <span className="text-xl font-bold">{game.homeScore || 0}</span>
            )}
          </div>
        </div>

        {/* Pick Selection */}
        {!isLocked && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Your pick:</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={selectedPick === game.awayTeam ? "default" : "outline"}
                size="sm"
                onClick={() => handlePickChange(game.awayTeam)}
                className={selectedPick === game.awayTeam ? "pick-selected" : ""}
              >
                {game.awayTeam}
              </Button>
              <Button
                variant={selectedPick === game.homeTeam ? "default" : "outline"}
                size="sm"
                onClick={() => handlePickChange(game.homeTeam)}
                className={selectedPick === game.homeTeam ? "pick-selected" : ""}
              >
                {game.homeTeam}
              </Button>
            </div>
          </div>
        )}

        {/* Pick Results */}
        {isLocked && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium mb-1">You:</p>
                <div className={`flex items-center space-x-2 ${userCorrect ? 'text-success' : isFinal && userPick ? 'text-destructive' : ''}`}>
                  <span>{userPick?.selection || 'No pick'}</span>
                  {userCorrect && <Trophy className="w-4 h-4" />}
                </div>
              </div>
              
              <div>
                <p className="font-medium mb-1">Opponent:</p>
                <div className={`flex items-center space-x-2 ${opponentCorrect ? 'text-success' : isFinal && opponentPick ? 'text-destructive' : ''}`}>
                  <span>
                    {canReveal ? (opponentPick?.selection || 'No pick') : 'Hidden'}
                  </span>
                  {opponentCorrect && <Trophy className="w-4 h-4" />}
                </div>
              </div>
            </div>
            
            {!canReveal && (
              <p className="text-xs text-muted-foreground">
                Opponent pick will be revealed when both have picked and game starts
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};