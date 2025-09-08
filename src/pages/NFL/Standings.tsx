// src/pages/NFL/Standings.tsx
import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/Header';
import { NFLNavigation } from '@/components/NFLNavigation';
import { Standings } from '@/components/Standings';
import { WeekSelector } from '@/components/WeekSelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Game, Pick, Week } from '@/types';
import { ProviderFactory } from '@/providers/ProviderFactory';
import { getCachedOddsForGames, mergeGameWithOddsAndScores } from '@/lib/oddsHelper';

export const NFLStandings = () => {
  const { user } = useAuth();
  const [currentWeek, setCurrentWeek] = useState<Week | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [picks, setPicks] = useState<Record<string, Pick>>({});
  const [selectedWeek, setSelectedWeek] = useState(1);
  const availableWeeks = Array.from({ length: 22 }, (_, i) => i + 1);

  const scoresProvider = ProviderFactory.createScoresProvider();

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
        // Fetch schedule and odds for selected week
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

  const getOpponentId = () => {
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
              You need to be signed in to view standings.
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
        <WeekSelector
          currentWeek={selectedWeek}
          onWeekChange={setSelectedWeek}
          availableWeeks={availableWeeks}
        />
        
        {/* Page Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold">
            Standings
          </h1>
          <p className="text-muted-foreground mt-2">
            Brady vs Jenny - Week {selectedWeek}
          </p>
        </div>

        {/* Standings */}
        <div className="max-w-2xl mx-auto">
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
    </div>
  );
};
