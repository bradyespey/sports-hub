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
import { getCachedOddsForGames, mergeGameWithOddsAndScores } from '@/lib/oddsHelper';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';

export const NFLScoreboard = () => {
  const { user } = useAuth();
  const [currentWeek, setCurrentWeek] = useState<Week | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [picks, setPicks] = useState<Record<string, Pick>>({});
  const [pendingPicks, setPendingPicks] = useState<Record<string, string>>({});
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [showPickRules, setShowPickRules] = useState(false);
  const availableWeeks = Array.from({ length: 22 }, (_, i) => i + 1);

  const scoresProvider = ProviderFactory.createScoresProvider();

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
            <div className="flex items-center space-x-3">
              {Object.keys(pendingPicks).length > 0 && (
                <Button 
                  onClick={submitPicks}
                  variant="outline"
                  size="sm"
                  className="text-sm"
                >
                  Save {Object.keys(pendingPicks).length} Pick{Object.keys(pendingPicks).length !== 1 ? 's' : ''}
                </Button>
              )}
              <OddsRefreshButton
                season={2025}
                week={selectedWeek}
              />
            </div>
          </div>
        </div>

        {/* Pick Rules Info */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mt-0.5">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">How Picks Work</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPickRules(!showPickRules)}
                    className="h-6 w-6 p-0"
                  >
                    {showPickRules ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>
                {showPickRules && (
                  <div className="text-sm text-muted-foreground space-y-1 mt-3">
                    <p>• <strong>Make your picks:</strong> Click "Pick" next to your chosen team for each game</p>
                    <p>• <strong>Change anytime:</strong> You can modify picks up until kickoff for each game</p>
                    <p>• <strong>Strategic reveals:</strong> Picks are only revealed after both players submit AND kickoff occurs</p>
                    <p>• <strong>Auto-save:</strong> Picks save automatically when you select them</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

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