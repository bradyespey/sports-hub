// src/pages/NFL/Scoreboard.tsx
import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/Header';
import { NFLNavigation } from '@/components/NFLNavigation';
import { GameCard } from '@/components/GameCard';
import { WeekSelector } from '@/components/WeekSelector';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Game, Pick, Week } from '@/types';
import { Team } from '@/types/teams';
import { ProviderFactory } from '@/providers/ProviderFactory';
import { OddsRefreshButton } from '@/components/OddsRefreshButton';
import { getCachedOddsForGames, mergeGameWithOddsAndScores } from '@/lib/oddsHelper';
import { getCurrentNFLWeek, isCurrentNFLWeek } from '@/lib/dayjs';
import { getTeamName } from '@/lib/teamNames';
import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export const NFLScoreboard = () => {
  const { user, loading } = useAuth();
  const [currentWeek, setCurrentWeek] = useState<Week | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [picks, setPicks] = useState<Record<string, Pick>>({});
  const [pendingPicks, setPendingPicks] = useState<Record<string, string>>({});
  const [selectedWeek, setSelectedWeek] = useState(getCurrentNFLWeek());
  const [showTooltip, setShowTooltip] = useState(false);
  const [teams, setTeams] = useState<Record<string, Team>>({});
  const availableWeeks = Array.from({ length: 22 }, (_, i) => i + 1);

  const scoresProvider = ProviderFactory.createScoresProvider();
  const teamsProvider = ProviderFactory.createTeamsProvider();

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


  // Get current week - always use calculated current week
  useEffect(() => {
    const currentWeekNumber = getCurrentNFLWeek();
    setSelectedWeek(currentWeekNumber);
    
    // Set current week object for compatibility
    const currentWeekObj: Week = {
      season: 2025,
      week: currentWeekNumber,
      startDateUtc: new Date(), // Will be calculated properly in real implementation
      endDateUtc: new Date()
    };
    setCurrentWeek(currentWeekObj);
  }, []);

  // Reset to current week when component mounts (when navigating to Scores)
  useEffect(() => {
    const currentWeekNumber = getCurrentNFLWeek();
    setSelectedWeek(currentWeekNumber);
  }, []);

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showTooltip) {
        const target = event.target as HTMLElement;
        if (!target.closest('[data-tooltip-trigger]')) {
          setShowTooltip(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTooltip]);

  // Fetch teams data once on component mount
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const teamsData = await teamsProvider.getAllTeams();
        const teamsMap: Record<string, Team> = {};
        teamsData.forEach(team => {
          teamsMap[team.abbreviation] = team;
        });
        setTeams(teamsMap);
      } catch (error) {
        console.error('Error fetching teams:', error);
      }
    };

    fetchTeams();
  }, []);

  // Fetch records for teams playing this week when both teams and games are loaded
  useEffect(() => {
    const fetchRecordsForWeek = async () => {
      if (games.length === 0 || Object.keys(teams).length === 0) return;

      const weekTeams = new Set<string>();
      games.forEach(game => {
        weekTeams.add(game.homeTeam);
        weekTeams.add(game.awayTeam);
      });

      // Fetch records for teams playing this week
      const teamRecordPromises = Array.from(weekTeams).map(async (teamName) => {
        const teamAbbreviation = getTeamAbbreviation(getTeamName(teamName)).toUpperCase();
        const team = teams[teamAbbreviation];
        if (team && !team.record) {
          const teamWithRecord = await teamsProvider.getTeam(team.id);
          if (teamWithRecord?.record) {
            setTeams(prev => ({
              ...prev,
              [teamAbbreviation]: { ...prev[teamAbbreviation], record: teamWithRecord.record }
            }));
          }
        }
      });

      await Promise.all(teamRecordPromises);
    };

    fetchRecordsForWeek();
  }, [games, teams]);

  // Fetch games and picks when selected week changes
  useEffect(() => {
    if (!selectedWeek || !user) return;

    const fetchData = async () => {
      try {
        // Fetch schedule
        const schedule = await scoresProvider.getWeekSchedule({ season: 2025, week: selectedWeek });
        
        // Get cached odds and scores
        const [oddsMap, scores] = await Promise.all([
          getCachedOddsForGames(schedule),
          scoresProvider.getLiveScores({ gameIds: schedule.map(g => g.gameId) })
        ]);
        
        // Merge schedule, odds, and scores data
        const gamesData = schedule.map(game => 
          mergeGameWithOddsAndScores(game, oddsMap, scores)
        );

        setGames(gamesData);

        // Fetch picks for this week (only if we have games)
        const picksData: Record<string, Pick> = {};
        if (gamesData.length > 0) {
          try {
            const picksRef = collection(db, 'picks');
            const gameIds = gamesData.map(g => g.gameId);
            
            // Firestore 'in' queries can only handle up to 10 items, so we might need to batch
            const pickQueries = [];
            for (let i = 0; i < gameIds.length; i += 10) {
              const batch = gameIds.slice(i, i + 10);
              if (batch.length > 0) {
                const picksQuery = query(picksRef, where('gameId', 'in', batch));
                pickQueries.push(getDocs(picksQuery));
              }
            }
            
            const picksSnapshots = await Promise.all(pickQueries);
            
            picksSnapshots.forEach(picksSnapshot => {
              picksSnapshot.docs.forEach(doc => {
                const pick = { ...doc.data(), createdAt: doc.data().createdAt.toDate() } as Pick;
                picksData[`${pick.gameId}_${pick.uid}`] = pick;
              });
            });
          } catch (pickError) {
            console.error('Error fetching picks:', pickError);
            // Continue without picks data
          }
        }
        
        setPicks(picksData);
        
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, [selectedWeek, user]);

  // Real-time picks updates
  useEffect(() => {
    if (!user || games.length === 0) return;

    const picksRef = collection(db, 'picks');
    const picksQuery = query(picksRef, where('gameId', 'in', games.map(g => g.gameId)));
    
    const unsubscribe = onSnapshot(picksQuery, (snapshot) => {
      const picksData: Record<string, Pick> = {};
      snapshot.docs.forEach(doc => {
        const pick = { ...doc.data(), createdAt: doc.data().createdAt.toDate() } as Pick;
        picksData[`${pick.gameId}_${pick.uid}`] = pick;
      });
      setPicks(picksData);
    });

    return () => unsubscribe();
  }, [user, games]);

  const handlePickChange = async (gameId: string, selection: string) => {
    if (!user) return;

    // Auto-save the pick immediately without using pendingPicks
    try {
      const pick: Pick = {
        gameId,
        uid: user.uid,
        selection,
        createdAt: new Date(),
        locked: false,
        revealed: false
      };
      await setDoc(doc(db, 'picks', `${gameId}_${user.uid}`), pick);
    } catch (error) {
      console.error('Error saving pick:', error);
    }
  };

  const submitPicks = async () => {
    if (!user) return;

    try {
      const pickPromises = Object.entries(pendingPicks).map(([gameId, selection]) => {
        const pick: Pick = {
          gameId,
          uid: user.uid,
          selection,
          createdAt: new Date(),
          locked: false,
          revealed: false
        };
        return setDoc(doc(db, 'picks', `${gameId}_${user.uid}`), pick);
      });

      await Promise.all(pickPromises);
      setPendingPicks({});
    } catch (error) {
      console.error('Error submitting picks:', error);
    }
  };

  const canRevealPick = (game: Game) => {
    const userPick = picks[`${game.gameId}_${user?.uid}`];
    const opponentPick = Object.values(picks).find(pick => 
      pick.gameId === game.gameId && pick.uid !== user?.uid
    );
    const bothPicked = userPick && opponentPick;
    const gameStarted = game.status === 'live' || game.status === 'final';
    const gameKickoff = new Date(game.kickoffUtc);
    
    
    // Never show picks before game starts (allows editing until kickoff)
    if (!gameStarted) {
      return false;
    }
    
    // If both picks were made BEFORE kickoff, show immediately when game starts
    if (bothPicked) {
      const userPickTime = new Date(userPick.createdAt);
      const opponentPickTime = new Date(opponentPick.createdAt);
      const bothPickedBeforeKickoff = userPickTime <= gameKickoff && opponentPickTime <= gameKickoff;
      
      if (bothPickedBeforeKickoff) {
        return true; // Show immediately at kickoff
      }
      
      // If at least one pick was made AFTER kickoff (late pick), wait 1 minute from last pick
      const lastPickTime = userPickTime > opponentPickTime ? userPickTime : opponentPickTime;
      const now = new Date();
      const minutesSinceLastPick = (now.getTime() - lastPickTime.getTime()) / (1000 * 60);
      
      
      return minutesSinceLastPick >= 1;
    }
    
    // If only one person has picked, don't reveal until both pick and 1 minute passes
    return false;
  };

  const getOpponentId = () => {
    // Jenny's UID: SAMXEs1HopNiPK62qpZnP29SITz2
    // Brady's UID: mrm4SKisEqM4hWcqet5lf9irnbB3
    const jennyUid = 'SAMXEs1HopNiPK62qpZnP29SITz2';
    const bradyUid = 'mrm4SKisEqM4hWcqet5lf9irnbB3';
    
    // Return the opposite of whoever is currently logged in
    return user?.uid === jennyUid ? bradyUid : jennyUid;
  };

  const getOpponentName = () => {
    const jennyUid = 'SAMXEs1HopNiPK62qpZnP29SITz2';
    return user?.uid === jennyUid ? 'Brady' : 'Jenny';
  };

  const getCurrentUserName = () => {
    const jennyUid = 'SAMXEs1HopNiPK62qpZnP29SITz2';
    return user?.uid === jennyUid ? 'Jenny' : 'Brady';
  };

  // Calculate picks counts
  const getUserPickCount = (userId: string) => {
    return Object.values(picks).filter(pick => pick.uid === userId).length;
  };

  const userPickCount = getUserPickCount(user?.uid || '');
  const opponentPickCount = getUserPickCount(getOpponentId());
  const totalGames = games.length;

  // Reset to current week function
  const resetToCurrentWeek = () => {
    const currentWeekNumber = getCurrentNFLWeek();
    setSelectedWeek(currentWeekNumber);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Demo mode: when not signed in, show a read-only demo scoreboard
  if (!user) {
    return <DemoScoreboard />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <NFLNavigation onScoresClick={resetToCurrentWeek} />
      <div className="container mx-auto px-4 py-4 space-y-4">
        {/* Week Selector */}
        <div className="sticky top-16 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b py-4 mb-6">
          <div className="flex flex-col space-y-3 overflow-hidden">
            <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div className="flex flex-col items-center space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-3">
                <WeekSelector
                  currentWeek={selectedWeek}
                  onWeekChange={setSelectedWeek}
                  availableWeeks={availableWeeks}
                />
                {!isCurrentNFLWeek(selectedWeek) && (
                  <Button 
                    onClick={resetToCurrentWeek}
                    variant="outline"
                    size="sm"
                    className="text-sm"
                  >
                    Current Week
                  </Button>
                )}
                {/* Helper Tooltip */}
                <Tooltip open={showTooltip} onOpenChange={() => {}}>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => setShowTooltip(!showTooltip)}
                      data-tooltip-trigger
                    >
                      <HelpCircle className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs p-3 z-[9999]">
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <p className="font-semibold text-sm">Quick Tips</p>
                        <div className="text-xs space-y-0.5">
                          <p>• Picks auto-save when selected</p>
                          <p>• Change picks until kickoff</p>
                          <p>• Reveals after both players pick + kickoff</p>
                          <p>• Odds update daily + manual refresh available</p>
                        </div>
                      </div>
                      
                      <div className="border-t pt-2 space-y-1">
                        <p className="font-semibold text-sm">Pick Rules</p>
                        <div className="text-xs space-y-0.5">
                          <p>• Click "Pick" next to your chosen team</p>
                          <p>• Click team names to view depth charts</p>
                          <p>• Strategic reveals: both pick + kickoff</p>
                          <p>• Late picks: 1-minute edit window</p>
                        </div>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-3">
                {Object.keys(pendingPicks).length > 0 && (
                  <Button 
                    onClick={submitPicks}
                    variant="outline"
                    size="sm"
                    className="text-sm w-full sm:w-auto"
                  >
                    Save {Object.keys(pendingPicks).length} Pick{Object.keys(pendingPicks).length !== 1 ? 's' : ''}
                  </Button>
                )}
                <OddsRefreshButton
                  season={2025}
                  week={selectedWeek}
                  className="w-full sm:w-auto"
                />
              </div>
            </div>
            
            {/* Picks Counter */}
            <div className="flex items-center justify-center space-x-6 text-sm">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-foreground">You:</span>
                <span className={`font-bold ${userPickCount === totalGames ? 'text-green-600' : 'text-muted-foreground'}`}>
                  {userPickCount}/{totalGames}
                </span>
                <span className="text-muted-foreground">picks</span>
              </div>
              <div className="w-px h-4 bg-border"></div>
              <div className="flex items-center space-x-2">
                <span className="font-medium text-foreground">{getOpponentName()}:</span>
                <span className={`font-bold ${opponentPickCount === totalGames ? 'text-green-600' : 'text-muted-foreground'}`}>
                  {opponentPickCount}/{totalGames}
                </span>
                <span className="text-muted-foreground">picks</span>
              </div>
            </div>
          </div>
        </div>

        {/* Games - Sorted like Yahoo: Live, Upcoming, Finished */}
        <div className="space-y-6">
          {/* Live Games */}
          {games.filter(game => game.status === 'live').length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4 text-red-600 flex items-center">
                <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                Live
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {games
                  .filter(game => game.status === 'live')
                  .map(game => {
                    const userPick = picks[`${game.gameId}_${user?.uid}`] || 
                      (pendingPicks[game.gameId] ? {
                        gameId: game.gameId,
                        uid: user?.uid || '',
                        selection: pendingPicks[game.gameId],
                        createdAt: new Date(),
                        locked: false,
                        revealed: false
                      } : undefined);

                    const opponentPick = Object.values(picks).find(pick => 
                      pick.gameId === game.gameId && pick.uid !== user?.uid
                    );

                    return (
                      <div key={game.gameId} data-game-id={game.gameId}>
                        <GameCard
                          game={game}
                          userPick={userPick}
                          opponentPick={opponentPick}
                          onPickChange={handlePickChange}
                          canReveal={canRevealPick(game)}
                          currentUserId={user?.uid || ''}
                          currentUserName={getCurrentUserName()}
                          opponentUserName={getOpponentName()}
                          teams={teams}
                        />
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Upcoming Games */}
          {games.filter(game => game.status === 'scheduled').length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4 text-blue-600">Upcoming</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {games
                  .filter(game => game.status === 'scheduled')
                  .sort((a, b) => new Date(a.kickoffUtc).getTime() - new Date(b.kickoffUtc).getTime())
                  .map(game => {
                    const userPick = picks[`${game.gameId}_${user?.uid}`] || 
                      (pendingPicks[game.gameId] ? {
                        gameId: game.gameId,
                        uid: user?.uid || '',
                        selection: pendingPicks[game.gameId],
                        createdAt: new Date(),
                        locked: false,
                        revealed: false
                      } : undefined);

                    const opponentPick = Object.values(picks).find(pick => 
                      pick.gameId === game.gameId && pick.uid !== user?.uid
                    );

                    return (
                      <div key={game.gameId} data-game-id={game.gameId}>
                        <GameCard
                          game={game}
                          userPick={userPick}
                          opponentPick={opponentPick}
                          onPickChange={handlePickChange}
                          canReveal={canRevealPick(game)}
                          currentUserId={user?.uid || ''}
                          currentUserName={getCurrentUserName()}
                          opponentUserName={getOpponentName()}
                          teams={teams}
                        />
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Finished Games */}
          {games.filter(game => game.status === 'final').length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4 text-gray-600">Finished</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {games
                  .filter(game => game.status === 'final')
                  .sort((a, b) => new Date(a.kickoffUtc).getTime() - new Date(b.kickoffUtc).getTime())
                  .map(game => {
                    const userPick = picks[`${game.gameId}_${user?.uid}`] || 
                      (pendingPicks[game.gameId] ? {
                        gameId: game.gameId,
                        uid: user?.uid || '',
                        selection: pendingPicks[game.gameId],
                        createdAt: new Date(),
                        locked: false,
                        revealed: false
                      } : undefined);

                    const opponentPick = Object.values(picks).find(pick => 
                      pick.gameId === game.gameId && pick.uid !== user?.uid
                    );

                    return (
                      <div key={game.gameId} data-game-id={game.gameId}>
                        <GameCard
                          game={game}
                          userPick={userPick}
                          opponentPick={opponentPick}
                          onPickChange={handlePickChange}
                          canReveal={canRevealPick(game)}
                          currentUserId={user?.uid || ''}
                          currentUserName={getCurrentUserName()}
                          opponentUserName={getOpponentName()}
                          teams={teams}
                        />
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Demo Scoreboard (public, read-only with mock picks)
// ─────────────────────────────────────────────────────────────

const demoUserId = 'demo-user-1';
const demoOpponentId = 'demo-user-2';

const demoGamesList: Game[] = [
  {
    season: 2025,
    week: getCurrentNFLWeek(),
    gameId: '2025_W15_DEMO_G1',
    homeTeam: 'BAL',
    awayTeam: 'KC',
    kickoffUtc: new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 1), // Tomorrow
    sportsbook: {
      spreadHome: -3.5,
      spreadAway: 3.5,
      total: 51.5,
      provider: 'DemoBook',
    },
    status: 'scheduled',
  },
  {
    season: 2025,
    week: getCurrentNFLWeek(),
    gameId: '2025_W15_DEMO_G2',
    homeTeam: 'PHI',
    awayTeam: 'DAL',
    kickoffUtc: new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 1.5),
    sportsbook: {
      spreadHome: -5.5,
      spreadAway: 5.5,
      total: 48.0,
      provider: 'DemoBook',
    },
    status: 'scheduled',
  },
  {
    season: 2025,
    week: getCurrentNFLWeek(),
    gameId: '2025_W15_DEMO_G3',
    homeTeam: 'GB',
    awayTeam: 'MIN',
    kickoffUtc: new Date(new Date().getTime() - 1000 * 60 * 60 * 2), // 2 hours ago
    sportsbook: {
      spreadHome: -2.5,
      spreadAway: 2.5,
      total: 45.5,
      provider: 'DemoBook',
    },
    status: 'live',
    homeScore: 14,
    awayScore: 10,
    quarter: 2,
    timeRemaining: '02:15',
  },
  {
    season: 2025,
    week: getCurrentNFLWeek(),
    gameId: '2025_W15_DEMO_G4',
    homeTeam: 'BUF',
    awayTeam: 'MIA',
    kickoffUtc: new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 2),
    sportsbook: {
      spreadHome: -7.0,
      spreadAway: 7.0,
      total: 49.0,
      provider: 'DemoBook',
    },
    status: 'scheduled',
  },
  {
    season: 2025,
    week: getCurrentNFLWeek(),
    gameId: '2025_W15_DEMO_G5',
    homeTeam: 'CIN',
    awayTeam: 'PIT',
    kickoffUtc: new Date(new Date().getTime() - 1000 * 60 * 60 * 24 * 1),
    sportsbook: {
      spreadHome: -3.0,
      spreadAway: 3.0,
      total: 42.0,
      provider: 'DemoBook',
    },
    status: 'final',
    homeScore: 24,
    awayScore: 20,
  },
  {
    season: 2025,
    week: getCurrentNFLWeek(),
    gameId: '2025_W15_DEMO_G6',
    homeTeam: 'DET',
    awayTeam: 'CHI',
    kickoffUtc: new Date(new Date().getTime() - 1000 * 60 * 60 * 1), // 1 hour ago
    sportsbook: {
      spreadHome: -6.5,
      spreadAway: 6.5,
      total: 47.5,
      provider: 'DemoBook',
    },
    status: 'live',
    homeScore: 7,
    awayScore: 3,
    quarter: 1,
    timeRemaining: '08:45',
  },
  {
    season: 2025,
    week: getCurrentNFLWeek(),
    gameId: '2025_W15_DEMO_G7',
    homeTeam: 'SF',
    awayTeam: 'SEA',
    kickoffUtc: new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 3),
    sportsbook: {
      spreadHome: -9.5,
      spreadAway: 9.5,
      total: 44.5,
      provider: 'DemoBook',
    },
    status: 'scheduled',
  },
  {
    season: 2025,
    week: getCurrentNFLWeek(),
    gameId: '2025_W15_DEMO_G8',
    homeTeam: 'JAX',
    awayTeam: 'TEN',
    kickoffUtc: new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 3),
    sportsbook: {
      spreadHome: -4.0,
      spreadAway: 4.0,
      total: 41.0,
      provider: 'DemoBook',
    },
    status: 'scheduled',
  },
  {
    season: 2025,
    week: getCurrentNFLWeek(),
    gameId: '2025_W15_DEMO_G9',
    homeTeam: 'ATL',
    awayTeam: 'NO',
    kickoffUtc: new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 3),
    sportsbook: {
      spreadHome: -1.5,
      spreadAway: 1.5,
      total: 43.5,
      provider: 'DemoBook',
    },
    status: 'scheduled',
  },
  {
    season: 2025,
    week: getCurrentNFLWeek(),
    gameId: '2025_W15_DEMO_G10',
    homeTeam: 'NYG',
    awayTeam: 'WAS',
    kickoffUtc: new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 3),
    sportsbook: {
      spreadHome: 2.5,
      spreadAway: -2.5,
      total: 40.5,
      provider: 'DemoBook',
    },
    status: 'scheduled',
  },
  {
    season: 2025,
    week: getCurrentNFLWeek(),
    gameId: '2025_W15_DEMO_G11',
    homeTeam: 'DEN',
    awayTeam: 'LV',
    kickoffUtc: new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 3),
    sportsbook: {
      spreadHome: -3.0,
      spreadAway: 3.0,
      total: 42.5,
      provider: 'DemoBook',
    },
    status: 'scheduled',
  },
  {
    season: 2025,
    week: getCurrentNFLWeek(),
    gameId: '2025_W15_DEMO_G12',
    homeTeam: 'LAC',
    awayTeam: 'NYJ',
    kickoffUtc: new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 3),
    sportsbook: {
      spreadHome: -5.0,
      spreadAway: 5.0,
      total: 46.5,
      provider: 'DemoBook',
    },
    status: 'scheduled',
  },
  {
    season: 2025,
    week: getCurrentNFLWeek(),
    gameId: '2025_W15_DEMO_G13',
    homeTeam: 'ARI',
    awayTeam: 'LAR',
    kickoffUtc: new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 3),
    sportsbook: {
      spreadHome: 1.5,
      spreadAway: -1.5,
      total: 48.5,
      provider: 'DemoBook',
    },
    status: 'scheduled',
  },
  {
    season: 2025,
    week: getCurrentNFLWeek(),
    gameId: '2025_W15_DEMO_G14',
    homeTeam: 'TB',
    awayTeam: 'CAR',
    kickoffUtc: new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 3),
    sportsbook: {
      spreadHome: -8.0,
      spreadAway: 8.0,
      total: 40.0,
      provider: 'DemoBook',
    },
    status: 'scheduled',
  },
  {
    season: 2025,
    week: getCurrentNFLWeek(),
    gameId: '2025_W15_DEMO_G15',
    homeTeam: 'CLE',
    awayTeam: 'HOU',
    kickoffUtc: new Date(new Date().getTime() - 1000 * 60 * 60 * 24 * 2),
    sportsbook: {
      spreadHome: 4.0,
      spreadAway: -4.0,
      total: 44.0,
      provider: 'DemoBook',
    },
    status: 'final',
    homeScore: 17,
    awayScore: 31,
  },
  {
    season: 2025,
    week: getCurrentNFLWeek(),
    gameId: '2025_W15_DEMO_G16',
    homeTeam: 'IND',
    awayTeam: 'NE',
    kickoffUtc: new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 4),
    sportsbook: {
      spreadHome: -2.0,
      spreadAway: 2.0,
      total: 43.0,
      provider: 'DemoBook',
    },
    status: 'scheduled',
  },
];

const DemoScoreboard = () => {
  const [selectedWeek, setSelectedWeek] = useState(getCurrentNFLWeek());
  const [games, setGames] = useState<Game[]>([]);
  const [teams, setTeams] = useState<Record<string, Team>>({});
  // Local state for User 1's picks
  const [userPicks, setUserPicks] = useState<Record<string, string>>({});
  // Mock picks for User 2 (opponent)
  const [opponentPicks, setOpponentPicks] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const availableWeeks = Array.from({ length: 22 }, (_, i) => i + 1);

  const scoresProvider = ProviderFactory.createScoresProvider();
  const teamsProvider = ProviderFactory.createTeamsProvider();

  // Helper function to get team abbreviation for URL (copied from Scoreboard)
  const getTeamAbbreviation = (teamName: string): string => {
    const teamAbbreviations: Record<string, string> = {
      'Cardinals': 'ari', 'Falcons': 'atl', 'Ravens': 'bal', 'Bills': 'buf',
      'Panthers': 'car', 'Bears': 'chi', 'Bengals': 'cin', 'Browns': 'cle',
      'Cowboys': 'dal', 'Broncos': 'den', 'Lions': 'det', 'Packers': 'gb',
      'Texans': 'hou', 'Colts': 'ind', 'Jaguars': 'jax', 'Chiefs': 'kc',
      'Raiders': 'lv', 'Chargers': 'lac', 'Rams': 'lar', 'Dolphins': 'mia',
      'Vikings': 'min', 'Patriots': 'ne', 'Saints': 'no', 'Giants': 'nyg',
      'Jets': 'nyj', 'Eagles': 'phi', 'Steelers': 'pit', '49ers': 'sf',
      'Seahawks': 'sea', 'Buccaneers': 'tb', 'Titans': 'ten', 'Commanders': 'was'
    };
    return teamAbbreviations[teamName] || teamName.toLowerCase().replace(/\s+/g, '-');
  };

  // Fetch teams data once
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const teamsData = await teamsProvider.getAllTeams();
        const teamsMap: Record<string, Team> = {};
        teamsData.forEach(team => {
          teamsMap[team.abbreviation] = team;
        });
        setTeams(teamsMap);
      } catch (error) {
        console.error('Error fetching teams:', error);
      }
    };
    fetchTeams();
  }, []);

  // Fetch records for week
  useEffect(() => {
    const fetchRecordsForWeek = async () => {
      if (games.length === 0 || Object.keys(teams).length === 0) return;

      const weekTeams = new Set<string>();
      games.forEach(game => {
        weekTeams.add(game.homeTeam);
        weekTeams.add(game.awayTeam);
      });

      const teamRecordPromises = Array.from(weekTeams).map(async (teamName) => {
        const teamAbbreviation = getTeamAbbreviation(getTeamName(teamName)).toUpperCase();
        const team = teams[teamAbbreviation];
        if (team && !team.record) {
          const teamWithRecord = await teamsProvider.getTeam(team.id);
          if (teamWithRecord?.record) {
            setTeams(prev => ({
              ...prev,
              [teamAbbreviation]: { ...prev[teamAbbreviation], record: teamWithRecord.record }
            }));
          }
        }
      });

      await Promise.all(teamRecordPromises);
    };

    fetchRecordsForWeek();
  }, [games, teams]);

  // Fetch games and generate mock picks
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Use realistic mock data instead of failing API call for demo purposes
        // This ensures the demo always looks populated and "alive"
        const gamesData = demoGamesList.map(g => ({ ...g, week: selectedWeek }));

        setGames(gamesData);

        // Generate deterministic mock picks for User 2 (Opponent)
        // We'll pick the favorite if spread exists, otherwise random based on gameId char code
        const mockOpponentPicks: Record<string, string> = {};
        gamesData.forEach(game => {
            if (game.sportsbook?.spreadHome) {
                // Pick favorite
                mockOpponentPicks[game.gameId] = game.sportsbook.spreadHome < 0 ? game.homeTeam : game.awayTeam;
            } else {
                // Deterministic "random" pick
                const charCode = game.gameId.charCodeAt(game.gameId.length - 1);
                mockOpponentPicks[game.gameId] = charCode % 2 === 0 ? game.homeTeam : game.awayTeam;
            }
        });
        setOpponentPicks(mockOpponentPicks);
        
        // Reset User 1 picks on week change
        setUserPicks({});

      } catch (error) {
        console.error('Error fetching demo data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedWeek]);

  const handlePickChange = (gameId: string, selection: string) => {
    setUserPicks((prev) => ({ ...prev, [gameId]: selection }));
  };

  const totalGames = games.length;
  const userPickCount = Object.keys(userPicks).length;
  const opponentPickCount = Object.keys(opponentPicks).length;

  const resetToCurrentWeek = () => {
    const currentWeekNumber = getCurrentNFLWeek();
    setSelectedWeek(currentWeekNumber);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <NFLNavigation onScoresClick={resetToCurrentWeek} />
      <div className="container mx-auto px-4 py-4 space-y-4">
        {/* Demo banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-blue-500 text-blue-600">
              Demo Mode
            </Badge>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Public demo: you are <span className="font-semibold">User 1</span>. User 2&apos;s picks are
              mocked for demonstration.
            </p>
          </div>
        </div>

        {/* Week Selector */}
        <div className="sticky top-16 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b py-4 mb-6">
          <div className="flex flex-col space-y-3 overflow-hidden">
            <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div className="flex flex-col items-center space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-3">
                <WeekSelector
                  currentWeek={selectedWeek}
                  onWeekChange={setSelectedWeek}
                  availableWeeks={availableWeeks}
                />
                <Button
                  onClick={resetToCurrentWeek}
                  variant="outline"
                  size="sm"
                  className="text-sm"
                >
                  Current Week
                </Button>
                {/* Add OddsRefreshButton purely for visual parity, even if it just re-fetches or does nothing significant in demo */}
                 <OddsRefreshButton
                  season={2025}
                  week={selectedWeek}
                  className="w-full sm:w-auto"
                />
              </div>

              {/* Picks Counter */}
              <div className="flex items-center justify-center space-x-6 text-sm">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-foreground">User 1:</span>
                  <span
                    className={`font-bold ${
                      userPickCount === totalGames && totalGames > 0 ? 'text-green-600' : 'text-muted-foreground'
                    }`}
                  >
                    {userPickCount}/{totalGames}
                  </span>
                  <span className="text-muted-foreground">picks</span>
                </div>
                <div className="w-px h-4 bg-border" />
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-foreground">User 2:</span>
                  <span
                    className={`font-bold ${
                      opponentPickCount === totalGames && totalGames > 0 ? 'text-green-600' : 'text-muted-foreground'
                    }`}
                  >
                    {opponentPickCount}/{totalGames}
                  </span>
                  <span className="text-muted-foreground">picks</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        ) : (
            /* Games */
            <div className="space-y-6">
            {(['live', 'scheduled', 'final'] as const).map((status) => {
                const gamesForStatus = games.filter((g) => g.status === status);
                if (gamesForStatus.length === 0) return null;

                const title =
                status === 'live' ? 'Live' : status === 'scheduled' ? 'Upcoming' : 'Finished';
                const titleClass =
                status === 'live'
                    ? 'text-red-600'
                    : status === 'scheduled'
                    ? 'text-blue-600'
                    : 'text-gray-600';

                return (
                <div key={status}>
                    {status === 'live' && (
                        <h2 className="text-lg font-semibold mb-4 text-red-600 flex items-center">
                            <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                            Live
                        </h2>
                    )}
                    {status !== 'live' && (
                         <h2 className={`text-lg font-semibold mb-4 ${titleClass}`}>{title}</h2>
                    )}
                   
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                    {gamesForStatus.map((game) => {
                        const userSelection = userPicks[game.gameId];
                        const opponentSelection = opponentPicks[game.gameId];

                        const userPick: Pick | undefined = userSelection
                        ? {
                            gameId: game.gameId,
                            uid: demoUserId,
                            selection: userSelection,
                            createdAt: new Date(),
                            locked: false,
                            revealed: status !== 'scheduled', // In demo, just reveal if game started
                            }
                        : undefined;

                        const opponentPick: Pick | undefined = opponentSelection
                        ? {
                            gameId: game.gameId,
                            uid: demoOpponentId,
                            selection: opponentSelection,
                            createdAt: new Date(),
                            locked: false,
                            revealed: status !== 'scheduled',
                            }
                        : undefined;

                        // In demo, simpler reveal logic: if game started, show picks
                        const canReveal = status !== 'scheduled';

                        return (
                        <div key={game.gameId} data-game-id={game.gameId}>
                            <GameCard
                            game={game}
                            userPick={userPick}
                            opponentPick={opponentPick}
                            onPickChange={handlePickChange}
                            canReveal={canReveal}
                            currentUserId={demoUserId}
                            currentUserName="User 1"
                            opponentUserName="User 2"
                            teams={teams}
                            />
                        </div>
                        );
                    })}
                    </div>
                </div>
                );
            })}
            
            {games.length === 0 && (
                <div className="text-center py-20 text-muted-foreground">
                    No games scheduled for this week.
                </div>
            )}
            </div>
        )}
      </div>
    </div>
  );
};