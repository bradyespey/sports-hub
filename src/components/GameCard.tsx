// src/components/GameCard.tsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Game, Pick } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Trophy, ExternalLink } from 'lucide-react';
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
  currentUserName?: string;
  opponentUserName?: string;
}

export const GameCard = ({ 
  game, 
  userPick, 
  opponentPick, 
  onPickChange, 
  canReveal,
  currentUserId,
  currentUserName = 'Brady',
  opponentUserName = 'Jenny'
}: GameCardProps) => {
  const [selectedPick, setSelectedPick] = useState(userPick?.selection || '');
  
  // Update selectedPick when userPick changes (e.g., on page refresh)
  useEffect(() => {
    setSelectedPick(userPick?.selection || '');
  }, [userPick?.selection]);
  const logosProvider = ProviderFactory.createLogosProvider();
  
  const isLocked = game.kickoffUtc <= new Date();
  const bothPlayersPicked = userPick && opponentPick;
  const shouldShowPickButtons = !isLocked || !bothPlayersPicked;
  const kickoffLocal = dayjs(game.kickoffUtc).tz(LOCAL_TIMEZONE);
  const isLive = game.status === 'live';
  const isFinal = game.status === 'final';

  const handlePickChange = async (selection: string) => {
    if (isLocked) return;
    setSelectedPick(selection);
    await onPickChange(game.gameId, selection);
  };

  const getWinner = () => {
    if (!isFinal || game.homeScore === undefined || game.awayScore === undefined) return null;
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
    
    // Only show badges if both players have picked AND game has started
    if (userPick && opponentPick && (isLive || isFinal)) {
      if (userPickedThis) {
        badges.push(currentUserName);
      }
      if (opponentPickedThis) {
        badges.push(opponentUserName);
      }
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

  // Helper function to get team abbreviation for URL
  const getTeamAbbreviation = (teamName: string): string => {
    // Map from short team names (like "Chargers") to URL abbreviations
    const teamAbbreviations: Record<string, string> = {
      'Cardinals': 'ari',
      'Falcons': 'atl',
      'Ravens': 'bal',
      'Bills': 'buf',
      'Panthers': 'car',
      'Bears': 'chi',
      'Bengals': 'cin',
      'Browns': 'cle',
      'Cowboys': 'dal',
      'Broncos': 'den',
      'Lions': 'det',
      'Packers': 'gb',
      'Texans': 'hou',
      'Colts': 'ind',
      'Jaguars': 'jax',
      'Chiefs': 'kc',
      'Raiders': 'lv',
      'Chargers': 'lac',
      'Rams': 'lar',
      'Dolphins': 'mia',
      'Vikings': 'min',
      'Patriots': 'ne',
      'Saints': 'no',
      'Giants': 'nyg',
      'Jets': 'nyj',
      'Eagles': 'phi',
      'Steelers': 'pit',
      '49ers': 'sf',
      'Seahawks': 'sea',
      'Buccaneers': 'tb',
      'Titans': 'ten',
      'Commanders': 'was'
    };
    
    return teamAbbreviations[teamName] || teamName.toLowerCase().replace(/\s+/g, '-');
  };

  return (
    <Card className="game-card hover:shadow-md transition-shadow">
      <CardContent className="p-3 sm:p-4">
        <div className="space-y-2 sm:space-y-3">
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
              <Link 
                to={`/nfl/teams/${getTeamAbbreviation(getTeamName(game.awayTeam))}`}
                className={`font-semibold text-sm sm:text-base hover:underline flex items-center space-x-1 group ${isWinningTeam(game.awayTeam) && isFinal ? 'text-foreground' : 'text-muted-foreground'}`}
                title="View team depth chart"
              >
                <span>{getTeamName(game.awayTeam)}</span>
                <ExternalLink className="h-3 w-3 opacity-50 group-hover:opacity-100 transition-opacity" />
              </Link>
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
              {shouldShowPickButtons ? (
                <Button
                  variant={selectedPick === game.awayTeam ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePickChange(game.awayTeam)}
                  className="text-xs h-7 px-3 min-w-[60px] sm:min-w-[50px]"
                >
                  {selectedPick === game.awayTeam ? "✓" : "Pick"}
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
              <Link 
                to={`/nfl/teams/${getTeamAbbreviation(getTeamName(game.homeTeam))}`}
                className={`font-semibold text-sm sm:text-base hover:underline flex items-center space-x-1 group ${isWinningTeam(game.homeTeam) && isFinal ? 'text-foreground' : 'text-muted-foreground'}`}
                title="View team depth chart"
              >
                <span>{getTeamName(game.homeTeam)}</span>
                <ExternalLink className="h-3 w-3 opacity-50 group-hover:opacity-100 transition-opacity" />
              </Link>
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
              {shouldShowPickButtons ? (
                <Button
                  variant={selectedPick === game.homeTeam ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePickChange(game.homeTeam)}
                  className="text-xs h-7 px-3 min-w-[60px] sm:min-w-[50px]"
                >
                  {selectedPick === game.homeTeam ? "✓" : "Pick"}
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
           {game.spreadHome !== undefined && game.spreadHome !== 0 ? (
             <span>
               {game.spreadHome < 0 ? (
                 <Link 
                   to={`/nfl/teams/${getTeamAbbreviation(getTeamName(game.homeTeam))}`}
                   className="hover:underline flex items-center space-x-1 group"
                   title="View team depth chart"
                 >
                   <span>{getTeamName(game.homeTeam)}</span>
                   <ExternalLink className="h-2 w-2 opacity-50 group-hover:opacity-100 transition-opacity" />
                 </Link>
               ) : (
                 <Link 
                   to={`/nfl/teams/${getTeamAbbreviation(getTeamName(game.awayTeam))}`}
                   className="hover:underline flex items-center space-x-1 group"
                   title="View team depth chart"
                 >
                   <span>{getTeamName(game.awayTeam)}</span>
                   <ExternalLink className="h-2 w-2 opacity-50 group-hover:opacity-100 transition-opacity" />
                 </Link>
               )} {game.spreadHome < 0 ? game.spreadHome : -game.spreadHome}
               {game.network && ` TV: ${game.network}`}
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