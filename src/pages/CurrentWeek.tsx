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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Users } from 'lucide-react';
import { Game, Pick, Week } from '@/types';
import { ProviderFactory } from '@/providers/ProviderFactory';
import { DataSyncService } from '@/services/DataSyncService';
import dayjs from '@/lib/dayjs';

export const CurrentWeek = () => {
  const { user } = useAuth();
  const [currentWeek, setCurrentWeek] = useState<Week | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [picks, setPicks] = useState<Record<string, Pick>>({});
  const [pendingPicks, setPendingPicks] = useState<Record<string, string>>({});
  const [hasScrolledToCurrentWeek, setHasScrolledToCurrentWeek] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const availableWeeks = Array.from({ length: 22 }, (_, i) => i + 1); // Weeks 1-22 (18 regular + 4 playoff)

  const scoresProvider = ProviderFactory.createScoresProvider();
  const oddsProvider = ProviderFactory.createOddsProvider();

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
        const { MockOddsProvider } = await import('@/providers/mock/MockOddsProvider');
        const mockProvider = new MockOddsProvider();
        let odds = await mockProvider.getWeekOdds({ season: 2025, week: selectedWeek });
        
        // Check if we have odds for all games, if not, try to get missing ones
        const gamesWithoutOdds = schedule.filter(game => 
          !odds.some(odd => odd.gameId === game.gameId)
        );
        
        if (gamesWithoutOdds.length > 0) {
          console.log(`🔍 Found ${gamesWithoutOdds.length} games without odds, attempting to fetch...`);
          
          // Try to get real odds for missing games (only for current/future weeks)
          if (selectedWeek >= 1) {
            try {
              const realOdds = await oddsProvider.getWeekOdds({ season: 2025, week: selectedWeek });
              const matchingRealOdds = realOdds.filter(odd => 
                gamesWithoutOdds.some(game => game.gameId === odd.gameId)
              );
              
              if (matchingRealOdds.length > 0) {
                console.log(`✅ Found ${matchingRealOdds.length} real odds for missing games`);
                odds = [...odds, ...matchingRealOdds];
              }
            } catch (error) {
              console.log('⚠️ Could not fetch real odds for missing games, using mock data');
            }
          }
        }

        // Merge schedule, odds, and scores data
        const scores = await scoresProvider.getLiveScores({ gameIds: schedule.map(g => g.gameId) });
        const gamesData = schedule.map(game => {
          const gameOdds = odds.find(odd => odd.gameId === game.gameId);
          const gameScore = scores.find(score => score.gameId === game.gameId);
          return {
            ...game,
            ...gameOdds,
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
    // For now, return Jenny's UID - in a real app, this would be dynamic
    return 'SAMXEs1HopNiPK62qpZnP29SITz2';
  };

  const getOpponentName = () => {
    return 'Jenny';
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
        <WeekSelector
          currentWeek={selectedWeek}
          onWeekChange={setSelectedWeek}
          availableWeeks={availableWeeks}
        />
        
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