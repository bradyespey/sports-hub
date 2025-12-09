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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Game, Pick, Week } from '@/types';
import { ProviderFactory } from '@/providers/ProviderFactory';
import { getCachedOddsForGames, mergeGameWithOddsAndScores } from '@/lib/oddsHelper';
import { getCurrentNFLWeek, isCurrentNFLWeek } from '@/lib/dayjs';
import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export const NFLStandings = () => {
  const { user, loading } = useAuth();
  const [currentWeek, setCurrentWeek] = useState<Week | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [picks, setPicks] = useState<Record<string, Pick>>({});
  const [selectedWeek, setSelectedWeek] = useState(getCurrentNFLWeek());
  const [showTooltip, setShowTooltip] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const availableWeeks = Array.from({ length: 22 }, (_, i) => i + 1);

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

  // Reset to current week when component mounts (when navigating to Standings)
  useEffect(() => {
    const currentWeekNumber = getCurrentNFLWeek();
    setSelectedWeek(currentWeekNumber);
  }, []);

  // Fetch games and picks when selected week changes
  useEffect(() => {
    if (!selectedWeek || !user) return;

    const fetchData = async () => {
      setIsLoadingData(true);
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

        // For season totals, we need to fetch all previous weeks' game results
        const allGamesData = [...gamesData];
        if (selectedWeek > 1) {
          // Fetch all previous weeks' results for season totals
          const previousWeeksPromises = [];
          for (let week = 1; week < selectedWeek; week++) {
            previousWeeksPromises.push(
              scoresProvider.getWeekSchedule({ season: 2025, week })
                .then(async (schedule) => {
                  const [oddsMap, scores] = await Promise.all([
                    getCachedOddsForGames(schedule),
                    scoresProvider.getLiveScores({ gameIds: schedule.map(g => g.gameId) })
                  ]);
                  
                  return schedule.map(game => 
                    mergeGameWithOddsAndScores(game, oddsMap, scores)
                  );
                })
            );
          }
          
          const previousWeeksData = await Promise.all(previousWeeksPromises);
          previousWeeksData.forEach(weekData => {
            allGamesData.push(...weekData);
          });
        }

        setGames(allGamesData);

        // Fetch ALL picks for season stats (not just this week)
        const picksRef = collection(db, 'picks');
        const allPicksSnapshot = await getDocs(picksRef);
        
        const picksData: Record<string, Pick> = {};
        allPicksSnapshot.docs.forEach(doc => {
          const data = doc.data();
          const pick = { 
            ...data, 
            createdAt: data.createdAt?.toDate() || new Date() 
          } as Pick;
          picksData[`${pick.gameId}_${pick.uid}`] = pick;
        });
        
        setPicks(picksData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, [selectedWeek, user]);

  // Note: Real-time picks updates removed to avoid Firestore IN query limits
  // Picks are fetched fresh on each week change

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

  // Reset to current week function
  const resetToCurrentWeek = () => {
    const currentWeekNumber = getCurrentNFLWeek();
    setSelectedWeek(currentWeekNumber);
  };

  if (loading || isLoadingData) {
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
    // Demo mode: show sample standings for User 1 vs User 2
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <NFLNavigation />
        <div className="container mx-auto px-4 py-6 space-y-4">
          <div className="flex items-center justify-center gap-2">
            <Badge variant="outline" className="border-blue-500 text-blue-600">
              Demo Mode
            </Badge>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Sample standings for <span className="font-semibold">User 1</span> vs{' '}
              <span className="font-semibold">User 2</span>.
            </p>
          </div>
          <div className="max-w-2xl mx-auto">
            <Card className="standings-card">
              <CardHeader>
                <CardTitle>Week {selectedWeek} Standings (Demo)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg border bg-muted/50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">User 1</span>
                      <Badge variant="outline">Leader</Badge>
                    </div>
                    <div className="text-2xl font-bold">11-5</div>
                    <div className="text-sm text-muted-foreground">68% this week</div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Season: <span className="font-semibold">120-64</span> (65%)
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border bg-muted/30">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">User 2</span>
                    </div>
                    <div className="text-2xl font-bold">9-7</div>
                    <div className="text-sm text-muted-foreground">56% this week</div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Season: <span className="font-semibold">112-72</span> (61%)
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <NFLNavigation />
      <div className="container mx-auto px-4 py-4 space-y-4">
        {/* Week Selector */}
        <div className="flex items-center justify-center gap-4">
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
                    <p>• League standings and playoff picture</p>
                    <p>• Weekly win/loss tracking</p>
                    <p>• Season-long competition results</p>
                  </div>
                </div>
                
                <div className="border-t pt-2 space-y-1">
                  <p className="font-semibold text-sm">Standings Features</p>
                  <div className="text-xs space-y-0.5">
                    <p>• Brady vs Jenny weekly records</p>
                    <p>• Overall season standings</p>
                    <p>• Pick accuracy tracking</p>
                    <p>• Week-by-week comparison</p>
                  </div>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
        
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
            selectedWeek={selectedWeek}
          />
        </div>
      </div>
    </div>
  );
};
