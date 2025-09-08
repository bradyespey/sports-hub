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
import { Game, Pick, Week } from '@/types';
import { ProviderFactory } from '@/providers/ProviderFactory';

export const NFLScoreboard = () => {
  const { user } = useAuth();
  const [currentWeek, setCurrentWeek] = useState<Week | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [picks, setPicks] = useState<Record<string, Pick>>({});
  const [pendingPicks, setPendingPicks] = useState<Record<string, string>>({});
  const [refreshingOdds, setRefreshingOdds] = useState(false);
  const [canRefreshOdds, setCanRefreshOdds] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const availableWeeks = Array.from({ length: 22 }, (_, i) => i + 1);

  const scoresProvider = ProviderFactory.createScoresProvider();
  const oddsProvider = ProviderFactory.createOddsProvider();

  // Manual odds refresh function - only for unstarted games in current week
  const refreshOdds = async () => {
    if (!selectedWeek || !canRefreshOdds) return;
    
    setRefreshingOdds(true);
    try {
      // Only refresh for current week and only unstarted games
      const gamesToRefresh = games.filter(game => game.status === 'scheduled');
      
      if (gamesToRefresh.length === 0) {
        return;
      }
      
      // Clear cache for this week to force fresh API call
      const { apiCache } = await import('@/lib/apiCache');
      apiCache.clear(); // Clear all cache
      
      let odds = await oddsProvider.getWeekOdds({ season: 2025, week: selectedWeek });
      
      // Filter to only unstarted games for the current week
      const unstartedGameIds = gamesToRefresh.map(g => g.gameId);
      const weekPattern = `2025-W${selectedWeek.toString().padStart(2, '0')}`;
      const relevantOdds = odds.filter(odd => 
        unstartedGameIds.includes(odd.gameId) && odd.gameId.includes(weekPattern)
      );
      
      if (relevantOdds.length === 0) {
        return;
      }
      
      // Update only unstarted games with new odds
      const updatedGames = games.map(game => {
        if (game.status !== 'scheduled') {
          return game; // Don't update finished/live games
        }
        
        const gameOdds = relevantOdds.find(odd => odd.gameId === game.gameId);
        if (!gameOdds) {
          return game; // No new odds for this game
        }
        
        return {
          ...game,
          spreadHome: gameOdds.spreadHome,
          spreadAway: gameOdds.spreadAway,
          sportsbook: {
            spreadHome: gameOdds.spreadHome,
            spreadAway: gameOdds.spreadAway,
            total: gameOdds.total,
            provider: gameOdds.provider
          }
        };
      });
      
      setGames(updatedGames);
      
    } catch (error) {
      console.error('❌ Failed to refresh odds:', error);
    } finally {
      setRefreshingOdds(false);
    }
  };

  // Get current week
  useEffect(() => {
    const fetchCurrentWeek = async () => {
      const weeksRef = collection(db, 'weeks');
      const weeksSnapshot = await getDocs(weeksRef);
      const now = new Date();
      
      const weeks = weeksSnapshot.docs.map(doc => ({
        ...doc.data(),
        startDateUtc: doc.data().startDateUtc.toDate(),
        endDateUtc: doc.data().endDateUtc.toDate()
      })) as Week[];

      const current = weeks.find(week => 
        now >= week.startDateUtc && now <= week.endDateUtc
      );

      if (current) {
        setCurrentWeek(current);
        setSelectedWeek(current.week);
      } else {
        const fallbackWeek = { season: 2025, week: 1, startDateUtc: new Date('2025-09-04'), endDateUtc: new Date('2025-09-10') };
        setCurrentWeek(fallbackWeek);
        setSelectedWeek(1);
      }
    };
    fetchCurrentWeek();
  }, []);

  // Fetch games and picks when selected week changes
  useEffect(() => {
    if (!selectedWeek || !user) return;

    const fetchData = async () => {
      try {
        // Fetch schedule
        const schedule = await scoresProvider.getWeekSchedule({ season: 2025, week: selectedWeek });
        
        // Start with mock odds data
        // Load mock odds data
        const { MockOddsProvider } = await import('@/providers/mock/MockOddsProvider');
        const mockProvider = new MockOddsProvider();
        let odds = await mockProvider.getWeekOdds({ season: 2025, week: selectedWeek });
        
        // Try to get real odds for unstarted games
        const scheduledGames = schedule.filter(game => game.status === 'scheduled');
        if (scheduledGames.length > 0) {
          try {
            const { apiCache } = await import('@/lib/apiCache');
            const cacheKey = `odds-2025-${selectedWeek}`;
            let realOdds = apiCache.get(cacheKey);
            
            if (!realOdds) {
              realOdds = await oddsProvider.getWeekOdds({ season: 2025, week: selectedWeek });
              apiCache.set(cacheKey, realOdds, 5 * 60 * 1000);
            }
            
            const weekPattern = `2025-W${selectedWeek.toString().padStart(2, '0')}`;
            const matchingRealOdds = realOdds.filter(odd => 
              scheduledGames.some(game => game.gameId === odd.gameId) && odd.gameId.includes(weekPattern)
            );
            
            if (matchingRealOdds.length > 0) {
              odds = [...odds, ...matchingRealOdds];
            }
          } catch (error) {
            // Fallback to mock data
          }
        }

        // Merge schedule, odds, and scores data
        const scores = await scoresProvider.getLiveScores({ gameIds: schedule.map(g => g.gameId) });
        // Data successfully loaded from APIs
        
        const gamesData = schedule.map(game => {
          const gameOdds = odds.find(odd => odd.gameId === game.gameId);
          const gameScore = scores.find(score => score.gameId === game.gameId);
          // Merge game data with odds and scores, preserving the original status
          return {
            ...game,
            spreadHome: gameOdds?.spreadHome || game.spreadHome || 0,
            spreadAway: gameOdds?.spreadAway || game.spreadAway || 0,
            total: gameOdds?.total || game.total || 0,
            sportsbook: gameOdds ? {
              spreadHome: gameOdds.spreadHome,
              spreadAway: gameOdds.spreadAway,
              total: gameOdds.total,
              provider: gameOdds.provider
            } : game.sportsbook,
            ...gameScore,
            status: gameScore?.status || game.status // Use score status if available, otherwise use schedule status
          };
        });

        setGames(gamesData);

        // Fetch picks for this week
        const picksRef = collection(db, 'picks');
        const picksQuery = query(picksRef, where('gameId', 'in', gamesData.map(g => g.gameId)));
        const picksSnapshot = await getDocs(picksQuery);
        
        const picksData: Record<string, Pick> = {};
        picksSnapshot.docs.forEach(doc => {
          const pick = { ...doc.data(), createdAt: doc.data().createdAt.toDate() } as Pick;
          picksData[`${pick.gameId}_${pick.uid}`] = pick;
        });
        
        setPicks(picksData);
        
        // Determine if refresh button should be enabled
        const unstartedGamesCount = gamesData.filter(game => game.status === 'scheduled').length;
        const hasUnstartedGames = unstartedGamesCount > 0;
        setCanRefreshOdds(hasUnstartedGames);
        
        // Refresh button state determined
        
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

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-center">Please sign in</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              You need to be signed in to view picks and scores.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <NFLNavigation />
      <div className="container mx-auto px-4 py-4 space-y-4">
        {/* Week Selector */}
        <div className="sticky top-16 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b py-4 mb-6">
          <div className="flex items-center justify-between">
            <WeekSelector
              currentWeek={selectedWeek}
              onWeekChange={setSelectedWeek}
              availableWeeks={availableWeeks}
            />
            <button
              onClick={refreshOdds}
              disabled={refreshingOdds || !canRefreshOdds}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border ${
                canRefreshOdds && !refreshingOdds
                  ? 'bg-card text-card-foreground border-border hover:bg-accent hover:text-accent-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground border-muted cursor-not-allowed opacity-50'
              }`}
              title={!canRefreshOdds ? 'No unstarted games to refresh odds for' : 'Refresh odds for unstarted games'}
            >
              {refreshingOdds ? 'Refreshing...' : canRefreshOdds ? 'Refresh Odds' : 'All Games Finished'}
            </button>
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
      </div>
    </div>
  );
};