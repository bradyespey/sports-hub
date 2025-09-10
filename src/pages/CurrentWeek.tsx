// src/pages/CurrentWeek.tsx
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { collection, query, where, getDocs, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/Header';
import { GameCard } from '@/components/GameCard';
import { Standings } from '@/components/Standings';
import { WeekSelector } from '@/components/WeekSelector';
import { OddsRefreshButton } from '@/components/OddsRefreshButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Users } from 'lucide-react';
import { Game, Pick, Week } from '@/types';
import { ProviderFactory } from '@/providers/ProviderFactory';
import { DataSyncService } from '@/services/DataSyncService';
import { getCachedOddsForGames, mergeGameWithOddsAndScores } from '@/lib/oddsHelper';
import { getCurrentNFLWeek, isCurrentNFLWeek } from '@/lib/dayjs';
import dayjs from '@/lib/dayjs';

export const CurrentWeek = () => {
  const { user, loading } = useAuth();
  const [currentWeek, setCurrentWeek] = useState<Week | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [picks, setPicks] = useState<Record<string, Pick>>({});
  const [pendingPicks, setPendingPicks] = useState<Record<string, string>>({});
  const [hasScrolledToCurrentWeek, setHasScrolledToCurrentWeek] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(getCurrentNFLWeek());
  const availableWeeks = Array.from({ length: 22 }, (_, i) => i + 1); // Weeks 1-22 (18 regular + 4 playoff)

  const scoresProvider = ProviderFactory.createScoresProvider();

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

  const handlePickChange = (gameId: string, selection: string) => {
    setPendingPicks(prev => ({
      ...prev,
      [gameId]: selection
    }));
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
    return bothPicked && gameStarted;
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

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-center">Please sign in</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              You need to be signed in to view picks and standings.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-4 space-y-4">
        {/* Week Selector */}
        <div className="sticky top-16 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b py-4 mb-6">
          <div className="flex flex-col space-y-3">
            <div className="flex flex-col space-y-3">
              <div className="flex items-center space-x-3">
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
              </div>
              
              {/* Odds Refresh Button */}
              <div className="flex justify-center">
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
        
        {/* Week Header */}
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold">
            Week {selectedWeek} Games
          </h1>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
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
                        />
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        {Object.keys(pendingPicks).length > 0 && (
          <div className="sticky bottom-4">
            <Card className="game-card">
              <CardContent className="p-4">
                <Button 
                  onClick={submitPicks}
                  className="w-full"
                  size="lg"
                >
                  Submit {Object.keys(pendingPicks).length} Pick{Object.keys(pendingPicks).length !== 1 ? 's' : ''}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Standings - Moved to bottom */}
        <Standings 
          games={games}
          picks={picks}
          currentUserId={user?.uid || ''}
          opponentUserId={getOpponentId() || ''}
          currentUserName={user?.displayName || 'Brady'}
          opponentUserName={getOpponentName()}
        />
      </div>
    </div>
  );
};