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
import { OddsRefreshButton } from '@/components/OddsRefreshButton';
import { OddsService } from '@/services/OddsService';

export const NFLScoreboard = () => {
  const { user } = useAuth();
  const [currentWeek, setCurrentWeek] = useState<Week | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [picks, setPicks] = useState<Record<string, Pick>>({});
  const [pendingPicks, setPendingPicks] = useState<Record<string, string>>({});
  const [canRefreshOdds, setCanRefreshOdds] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const availableWeeks = Array.from({ length: 22 }, (_, i) => i + 1);

  const scoresProvider = ProviderFactory.createScoresProvider();
  const oddsProvider = ProviderFactory.createOddsProvider();
  const oddsService = new OddsService();

  // Check if a week is the current NFL week (Tuesday-Monday)
  const isCurrentNFLWeek = (week: number): boolean => {
    if (!currentWeek) return false;
    
    // For now, just check if it's the current week from our data
    // In production, this would be more sophisticated
    return week === currentWeek.week;
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
        // Check if week has any odds stored
        const weekDoc = await oddsService.getWeekDoc(2025, selectedWeek);
        
        // If no odds stored, bootstrap them
        if (!weekDoc?.hasAnyOdds) {
          try {
            await oddsService.refreshOdds({
              season: 2025,
              week: selectedWeek,
              mode: 'bootstrap'
            });
          } catch (error) {
            console.warn('Bootstrap failed (Netlify functions not running locally), using mock data:', error);
            // In local dev, just continue with mock data
          }
        }

        // Fetch schedule
        const schedule = await scoresProvider.getWeekSchedule({ season: 2025, week: selectedWeek });
        
        // Get odds from Firestore
        const oddsMap = await oddsService.getOddsForWeek(2025, selectedWeek);
        
        // Load mock odds as fallback
        const { MockOddsProvider } = await import('@/providers/mock/MockOddsProvider');
        const mockProvider = new MockOddsProvider();
        const mockOdds = await mockProvider.getWeekOdds({ season: 2025, week: selectedWeek });

        // Merge schedule, odds, and scores data
        const scores = await scoresProvider.getLiveScores({ gameIds: schedule.map(g => g.gameId) });
        
        const gamesData = schedule.map(game => {
          // Try to get real odds first, fallback to mock
          const realOdds = oddsMap.get(game.gameId);
          const mockOddsForGame = mockOdds.find(odd => odd.gameId === game.gameId);
          const gameOdds = realOdds ? oddsService.transformOddsToGameData(realOdds) : mockOddsForGame;
          
          const gameScore = scores.find(score => score.gameId === game.gameId);
          
          return {
            ...game,
            spreadHome: gameOdds?.spreadHome || game.spreadHome || 0,
            spreadAway: gameOdds?.spreadAway || game.spreadAway || 0,
            total: gameOdds?.total || game.total || 0,
            sportsbook: gameOdds ? {
              spreadHome: gameOdds.spreadHome,
              spreadAway: gameOdds.spreadAway,
              total: gameOdds.total,
              provider: gameOdds.provider || 'Mock Odds Provider'
            } : game.sportsbook,
            ...gameScore,
            status: gameScore?.status || game.status
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
            <OddsRefreshButton
              season={2025}
              week={selectedWeek}
              isCurrentWeek={isCurrentNFLWeek(selectedWeek)}
              hasUnstartedGames={canRefreshOdds}
              onRefreshComplete={(response) => {
                console.log('Odds refresh completed:', response);
                // Refresh the games data to show updated odds
                fetchData();
              }}
            />
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