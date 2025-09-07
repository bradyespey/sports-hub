// src/pages/CurrentWeek.tsx
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { collection, query, where, getDocs, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/Header';
import { GameCard } from '@/components/GameCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Users } from 'lucide-react';
import { Game, Pick, Week } from '@/types';
import { ProviderFactory } from '@/providers/ProviderFactory';
import dayjs from '@/lib/dayjs';

export const CurrentWeek = () => {
  const { user } = useAuth();
  const [currentWeek, setCurrentWeek] = useState<Week | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [picks, setPicks] = useState<Record<string, Pick>>({});
  const [pendingPicks, setPendingPicks] = useState<Record<string, string>>({});

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
      } else {
        // Fallback to Week 2 for demo
        setCurrentWeek({ season: 2025, week: 2, startDateUtc: new Date('2025-02-01'), endDateUtc: new Date('2025-02-10') });
      }
    };

    fetchCurrentWeek();
  }, []);

  // Fetch games and picks when current week is available
  useEffect(() => {
    if (!currentWeek || !user) return;

    const fetchData = async () => {
      try {
        // Fetch schedule and odds
        const [schedule, odds] = await Promise.all([
          scoresProvider.getWeekSchedule({ season: currentWeek.season, week: currentWeek.week }),
          oddsProvider.getWeekOdds({ season: currentWeek.season, week: currentWeek.week })
        ]);

        // Combine schedule with odds
        const gamesWithOdds = schedule.map(game => {
          const gameOdds = odds.find(o => o.gameId === game.gameId);
          return {
            ...game,
            kickoffUtc: new Date(game.kickoffUtc),
            sportsbook: gameOdds ? {
              spreadHome: gameOdds.spreadHome,
              spreadAway: gameOdds.spreadAway,
              total: gameOdds.total,
              provider: gameOdds.provider
            } : undefined
          };
        });

        setGames(gamesWithOdds);

        // Listen to picks
        const picksQuery = query(
          collection(db, 'picks'),
          where('gameId', 'in', gamesWithOdds.map(g => g.gameId))
        );

        const unsubscribe = onSnapshot(picksQuery, (snapshot) => {
          const picksData: Record<string, Pick> = {};
          snapshot.docs.forEach(doc => {
            const pick = { ...doc.data(), createdAt: doc.data().createdAt.toDate() } as Pick;
            picksData[`${pick.gameId}_${pick.uid}`] = pick;
          });
          setPicks(picksData);
        });

        return unsubscribe;
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, [currentWeek, user]);

  const handlePickChange = (gameId: string, selection: string) => {
    setPendingPicks(prev => ({ ...prev, [gameId]: selection }));
  };

  const submitPicks = async () => {
    if (!user) return;

    const pickPromises = Object.entries(pendingPicks).map(([gameId, selection]) => {
      const pickId = `${gameId}_${user.uid}`;
      const pickDoc = {
        gameId,
        uid: user.uid,
        selection,
        createdAt: new Date(),
        locked: false,
        revealed: false
      };

      return setDoc(doc(db, 'picks', pickId), pickDoc);
    });

    try {
      await Promise.all(pickPromises);
      setPendingPicks({});
    } catch (error) {
      console.error('Error submitting picks:', error);
    }
  };

  const getOpponentId = () => {
    // Simple logic - if current user is Brady, opponent is Jenny and vice versa
    const allowedEmails = import.meta.env.VITE_ALLOWED_EMAILS?.split(',').map((email: string) => email.trim()) || [];
    return allowedEmails.find(email => email !== user?.email);
  };

  const canRevealPick = (game: Game) => {
    const now = new Date();
    const gameStarted = game.kickoffUtc <= now;
    const userPick = picks[`${game.gameId}_${user?.uid}`];
    const opponentPickExists = Object.values(picks).some(pick => 
      pick.gameId === game.gameId && pick.uid !== user?.uid
    );
    
    return gameStarted && userPick && opponentPickExists;
  };

  if (!currentWeek) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <Trophy className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
            <p className="text-muted-foreground">Loading current week...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Week Header */}
        <Card className="game-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trophy className="w-6 h-6 text-primary" />
              <span>Week {currentWeek.week} Picks</span>
            </CardTitle>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary">
                <Users className="w-3 h-3 mr-1" />
                Brady vs Jenny
              </Badge>
              <Badge variant="outline">
                Season: {currentWeek.season}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Games */}
        <div className="space-y-4">
          {games.map(game => {
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
              <GameCard
                key={game.gameId}
                game={game}
                userPick={userPick}
                opponentPick={opponentPick}
                onPickChange={handlePickChange}
                canReveal={canRevealPick(game)}
                currentUserId={user?.uid || ''}
              />
            );
          })}
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