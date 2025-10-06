// src/components/GameCard.tsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Game, Pick } from '@/types';
import { Team } from '@/types/teams';
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
  teams?: Record<string, Team>;
}

export const GameCard = ({ 
  game, 
  userPick, 
  opponentPick, 
  onPickChange, 
  canReveal,
  currentUserId,
  currentUserName = 'Brady',
  opponentUserName = 'Jenny',
  teams = {}
}: GameCardProps) => {
  const [selectedPick, setSelectedPick] = useState(userPick?.selection || '');
  
  // Update selectedPick when userPick changes (e.g., on page refresh)
  useEffect(() => {
    setSelectedPick(userPick?.selection || '');
  }, [userPick?.selection]);
  const logosProvider = ProviderFactory.createLogosProvider();
  
  const isLocked = game.kickoffUtc <= new Date();
  const bothPlayersPicked = userPick && opponentPick;
  const gameStarted = game.status === 'live' || game.status === 'final';
  const gameKickoff = new Date(game.kickoffUtc);
  const now = new Date();
  
  // Allow editing during 1-minute buffer for late picks
  const isInLatePickBuffer = userPick && gameStarted && 
    new Date(userPick.createdAt) > gameKickoff && 
    (now.getTime() - new Date(userPick.createdAt).getTime()) < (1000 * 60);
  
  // Show pick buttons if:
  // 1. Game hasn't started yet, OR
  // 2. Game has started but user hasn't picked yet (allow late picks), OR
  // 3. User made a late pick and is within 1-minute edit window
  const shouldShowPickButtons = !isLocked || (gameStarted && !userPick) || isInLatePickBuffer;
  const kickoffLocal = dayjs(game.kickoffUtc).tz(LOCAL_TIMEZONE);
  const isLive = game.status === 'live';
  const isFinal = game.status === 'final';

  const handlePickChange = async (selection: string) => {
    // Allow picks if game hasn't started, user hasn't picked yet, or within late pick buffer
    if (isLocked && !(gameStarted && !userPick) && !isInLatePickBuffer) return;
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
    
    // Show badges if canReveal is true (game has started)
    if (canReveal) {
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

  // Helper function to get team record display
  const getTeamRecordDisplay = (teamName: string): string => {
    // Map team names to ESPN abbreviations
    const teamNameToAbbreviation: Record<string, string> = {
      'Cardinals': 'ARI',
      'Falcons': 'ATL',
      'Ravens': 'BAL',
      'Bills': 'BUF',
      'Panthers': 'CAR',
      'Bears': 'CHI',
      'Bengals': 'CIN',
      'Browns': 'CLE',
      'Cowboys': 'DAL',
      'Broncos': 'DEN',
      'Lions': 'DET',
      'Packers': 'GB',
      'Texans': 'HOU',
      'Colts': 'IND',
      'Jaguars': 'JAX',
      'Chiefs': 'KC',
      'Raiders': 'LV',
      'Chargers': 'LAC',
      'Rams': 'LAR',
      'Dolphins': 'MIA',
      'Vikings': 'MIN',
      'Patriots': 'NE',
      'Saints': 'NO',
      'Giants': 'NYG',
      'Jets': 'NYJ',
      'Eagles': 'PHI',
      'Steelers': 'PIT',
      '49ers': 'SF',
      'Seahawks': 'SEA',
      'Buccaneers': 'TB',
      'Titans': 'TEN',
      'Commanders': 'WAS'
    };
    
    const teamAbbreviation = teamNameToAbbreviation[getTeamName(teamName)];
    const team = teams[teamAbbreviation];
    
    if (team?.record) {
      const { wins, losses, ties } = team.record;
      if (ties > 0) {
        return `${wins}-${losses}-${ties}`;
      }
      return `${wins}-${losses}`;
    }
    
    return '';
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
              <div className="flex flex-col">
                <Link 
                  to={`/nfl/teams/${getTeamAbbreviation(getTeamName(game.awayTeam))}`}
                  className={`font-semibold text-sm sm:text-base hover:underline flex items-center space-x-1 group ${isWinningTeam(game.awayTeam) && isFinal ? 'text-foreground' : 'text-muted-foreground'}`}
                  title="View team depth chart"
                >
                  <span>{getTeamName(game.awayTeam)}</span>
                  <ExternalLink className="h-3 w-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                </Link>
                {getTeamRecordDisplay(game.awayTeam) && (
                  <span className="text-xs text-muted-foreground">
                    {getTeamRecordDisplay(game.awayTeam)}
                  </span>
                )}
              </div>
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
              <div className="flex flex-col">
                <Link 
                  to={`/nfl/teams/${getTeamAbbreviation(getTeamName(game.homeTeam))}`}
                  className={`font-semibold text-sm sm:text-base hover:underline flex items-center space-x-1 group ${isWinningTeam(game.homeTeam) && isFinal ? 'text-foreground' : 'text-muted-foreground'}`}
                  title="View team depth chart"
                >
                  <span>{getTeamName(game.homeTeam)}</span>
                  <ExternalLink className="h-3 w-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                </Link>
                {getTeamRecordDisplay(game.homeTeam) && (
                  <span className="text-xs text-muted-foreground">
                    {getTeamRecordDisplay(game.homeTeam)}
                  </span>
                )}
              </div>
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
           {game.sportsbook?.spreadHome !== undefined && game.sportsbook.spreadHome !== 0 ? (
             <span>
               {game.sportsbook.spreadHome < 0 ? (
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
               )} {game.sportsbook.spreadHome < 0 ? game.sportsbook.spreadHome : -game.sportsbook.spreadHome}
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