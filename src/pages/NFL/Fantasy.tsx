// src/pages/NFL/Fantasy.tsx
import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Header } from '@/components/Header';
import { NFLNavigation } from '@/components/NFLNavigation';
import { WeekSelector } from '@/components/WeekSelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Users, BarChart3 } from 'lucide-react';
import { FantasyProviderFactory } from '@/providers/fantasy/FantasyProviderFactory';
import { getCurrentNFLWeek, isCurrentNFLWeek } from '@/lib/dayjs';

interface PlayerData {
  name: string;
  position: string;
  team: string;
  selectedPosition: string;
  points: number;
  projectedPoints: number;
  stats?: string;
  status?: string;
}

interface MatchupTeam {
  teamKey: string;
  name: string;
  logo: string;
  manager: string;
  points: number;
  projectedPoints: number;
  record?: string;
}

interface MatchupData {
  team1: MatchupTeam;
  team2: MatchupTeam;
  status: string;
  winnerTeamKey?: string;
}

interface LeagueMatchup {
  team1Name: string;
  team1Logo: string;
  team1Manager: string;
  team1Points: number;
  team1Record?: string;
  team2Name: string;
  team2Logo: string;
  team2Manager: string;
  team2Points: number;
  team2Record?: string;
  status: string;
}

interface WeekCache {
  myRoster: PlayerData[];
  opponentRoster: PlayerData[];
  currentMatchup: MatchupData | null;
  allMatchups: LeagueMatchup[];
}

// Global cache outside component to persist across all re-renders
const playerStatsCache = new Map<string, number>(); // key: "playerKey_week", value: points
const projectionCache = new Map<string, number>(); // key: playerKey, value: projection

export const NFLFantasy = () => {
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(getCurrentNFLWeek());
  const [leagueName, setLeagueName] = useState('Fantasy League');
  const [myTeam, setMyTeam] = useState<MatchupTeam | null>(null);
  const [myRoster, setMyRoster] = useState<PlayerData[]>([]);
  const [opponentRoster, setOpponentRoster] = useState<PlayerData[]>([]);
  const [currentMatchup, setCurrentMatchup] = useState<MatchupData | null>(null);
  const [allMatchups, setAllMatchups] = useState<LeagueMatchup[]>([]);
  const [weekCache, setWeekCache] = useState<Map<number, WeekCache>>(new Map());
  const availableWeeks = Array.from({ length: 18 }, (_, i) => i + 1);

  // Initialize to current NFL week on mount
  useEffect(() => {
    const currentWeek = getCurrentNFLWeek();
    setSelectedWeek(currentWeek);
    loadFantasyData(currentWeek);
  }, []);

  const getPlayerStatsWithCache = async (playerKey: string, week: number, provider: any): Promise<number> => {
    const cacheKey = `${playerKey}_${week}`;
    if (playerStatsCache.has(cacheKey)) {
      return playerStatsCache.get(cacheKey)!;
    }
    
    try {
      const points = await (provider as any).getPlayerStats(playerKey, week);
      playerStatsCache.set(cacheKey, points);
      return points;
    } catch (error) {
      console.error(`Failed to get stats for ${playerKey} week ${week}:`, error);
      return 0;
    }
  };

  const calculateRollingAverageProjection = async (
    playerKey: string, 
    viewingWeek: number, 
    provider: any
  ): Promise<number> => {
    try {
      // Check if already calculated
      if (projectionCache.has(playerKey)) {
        return projectionCache.get(playerKey)!;
      }
      
      // Projections based on COMPLETED weeks only
      const currentNFLWeek = getCurrentNFLWeek();
      const completedWeeks = currentNFLWeek - 1;
      
      if (completedWeeks === 0) {
        projectionCache.set(playerKey, 0);
        return 0;
      }
      
      // Fetch stats from all COMPLETED weeks using cache
      const historicalPoints: number[] = [];
      
      for (let week = 1; week <= completedWeeks; week++) {
        const points = await getPlayerStatsWithCache(playerKey, week, provider);
        // Only include weeks where they scored points (exclude 0s for bye weeks/injuries)
        if (points > 0) {
          historicalPoints.push(points);
        }
      }
      
      // Calculate average from all available historical data (excluding zeros)
      let projection = 0;
      if (historicalPoints.length > 0) {
        const average = historicalPoints.reduce((sum, pts) => sum + pts, 0) / historicalPoints.length;
        projection = Math.round(average * 100) / 100;
      }
      
      // Cache the result globally
      projectionCache.set(playerKey, projection);
      
      return projection;
    } catch (error) {
      console.error('Error calculating projection:', error);
      return 0;
    }
  };

  const loadFantasyData = async (week: number = selectedWeek) => {
    setLoading(true);
    try {
      const provider = FantasyProviderFactory.createProvider();
      
      if (!provider) {
        throw new Error('Fantasy provider not configured');
      }

      // Get league info
      const leagueInfo = await provider.getLeagueInfo();
      setLeagueName(leagueInfo.name);

      // Get team ID
      const teams = await provider.getUserTeams();
      const teamId = teams.brady;

      // Fetch my team roster for the selected week
      const myTeamResponse = await fetch(
        `/.netlify/functions/yahoo-fantasy?endpoint=team&teamId=${teamId}&week=${week}&leagueId=${import.meta.env.VITE_YAHOO_LEAGUE_ID || '590446'}`
      );
      const myTeamData = await myTeamResponse.json();
      
      // Parse my team info and roster
      const teamArray = myTeamData.fantasy_content?.team?.[0];
      if (teamArray) {
        const teamInfo: MatchupTeam = {
          teamKey: '',
          name: '',
          logo: '',
          manager: '',
          points: 0,
          projectedPoints: 0,
        };
        
        for (const item of teamArray) {
          if (item.team_key) teamInfo.teamKey = item.team_key;
          if (item.name) teamInfo.name = item.name;
          if (item.team_logos) teamInfo.logo = item.team_logos[0]?.team_logo?.url || '';
          if (item.managers) teamInfo.manager = item.managers[0]?.manager?.nickname || '';
        }
        
        setMyTeam(teamInfo);
      }

      // Parse roster from team[1]
      const rosterObj = myTeamData.fantasy_content?.team?.[1]?.roster;
      if (rosterObj) {
        const players: PlayerData[] = [];
        const playersData = rosterObj['0']?.players;
        
        if (playersData) {
          // First, gather all player info
          const playerPromises = [];
          for (let i = 0; i < playersData.count; i++) {
            const playerArray = playersData[i]?.player;
            if (playerArray && playerArray.length >= 2) {
              const info = playerArray[0];
              const stats = playerArray[1];
              const playerKey = info.find((p: any) => p.player_key)?.player_key;
              
              const playerData: PlayerData = {
                name: info.find((p: any) => p.name)?.name?.full || 'Unknown',
                position: info.find((p: any) => p.display_position)?.display_position || '',
                team: info.find((p: any) => p.editorial_team_abbr)?.editorial_team_abbr || '',
                selectedPosition: stats?.selected_position?.[1]?.position || 'BN',
                points: 0, // Will be calculated
                projectedPoints: (() => {
                  const proj = parseFloat(stats?.player_projected_points?.total || '0');
                  return proj > 0 ? proj : Math.max(0, parseFloat(stats?.player_points?.total || '0') * 0.8);
                })(),
                stats: '—', // Will be fetched
                status: info.find((p: any) => p.status)?.status || '',
              };
              
              // Fetch player stats to calculate points and get detailed stats
              if (playerKey && provider) {
                playerPromises.push(
                  (provider as any).getPlayerStatsWithDetails(playerKey, week).then((result: { points: number; stats: string }) => {
                    playerData.points = result.points;
                    playerData.stats = result.stats;
                    return playerData;
                  }).catch((error: any) => {
                    console.error(`Failed to get stats for ${playerData.name} (${playerKey}):`, error);
                    // Set a placeholder value instead of 0 to indicate stats are unavailable
                    playerData.points = -1; // -1 indicates stats unavailable
                    playerData.stats = '—';
                    return playerData;
                  })
                );
              } else {
                playerPromises.push(Promise.resolve(playerData));
              }
            }
          }
          
          // Wait for all player stats to be fetched
          const playersWithStats = await Promise.all(playerPromises);
          setMyRoster(playersWithStats);
        }
      }

      // Get matchup data
      const matchupResponse = await fetch(
        `/.netlify/functions/yahoo-fantasy?endpoint=matchups&teamId=${teamId}&week=${week}&leagueId=${import.meta.env.VITE_YAHOO_LEAGUE_ID || '590446'}`
      );
      const matchupData = await matchupResponse.json();
      
      const matchupsObj = matchupData.fantasy_content?.team?.[1]?.matchups;
      if (matchupsObj && matchupsObj['0']?.matchup) {
        const matchup = matchupsObj['0'].matchup;
        const teamsData = matchup['0']?.teams;
        
        // Parse both teams
        const team1Array = teamsData['0']?.team?.[0];
        const team1Stats = teamsData['0']?.team?.[1];
        const team2Array = teamsData['1']?.team?.[0];
        const team2Stats = teamsData['1']?.team?.[1];
        
        const team1: MatchupTeam = {
          teamKey: '',
          name: '',
          logo: '',
          manager: '',
          points: parseFloat(team1Stats?.team_points?.total || '0'),
          projectedPoints: parseFloat(team1Stats?.team_projected_points?.total || '0'),
        };
        
        const team2: MatchupTeam = {
          teamKey: '',
          name: '',
          logo: '',
          manager: '',
          points: parseFloat(team2Stats?.team_points?.total || '0'),
          projectedPoints: parseFloat(team2Stats?.team_projected_points?.total || '0'),
        };
        
        if (team1Array) {
          for (const item of team1Array) {
            if (item.team_key) team1.teamKey = item.team_key;
            if (item.name) team1.name = item.name;
            if (item.team_logos) team1.logo = item.team_logos[0]?.team_logo?.url || '';
            if (item.managers) team1.manager = item.managers[0]?.manager?.nickname || '';
          }
        }
        
        if (team2Array) {
          for (const item of team2Array) {
            if (item.team_key) team2.teamKey = item.team_key;
            if (item.name) team2.name = item.name;
            if (item.team_logos) team2.logo = item.team_logos[0]?.team_logo?.url || '';
            if (item.managers) team2.manager = item.managers[0]?.manager?.nickname || '';
          }
        }
        
        setCurrentMatchup({
          team1,
          team2,
          status: matchup.status || 'preevent',
          winnerTeamKey: matchup.winner_team_key,
        });

        // Fetch opponent roster for the selected week
        const opponentTeamId = team1.teamKey === teamId ? team2.teamKey : team1.teamKey;
        const oppResponse = await fetch(
          `/.netlify/functions/yahoo-fantasy?endpoint=team&teamId=${opponentTeamId}&week=${week}&leagueId=${import.meta.env.VITE_YAHOO_LEAGUE_ID || '590446'}`
        );
        const oppData = await oppResponse.json();
        
        const oppRosterObj = oppData.fantasy_content?.team?.[1]?.roster;
        if (oppRosterObj) {
          const oppPlayerPromises = [];
          const oppPlayersData = oppRosterObj['0']?.players;
          
          if (oppPlayersData) {
            for (let i = 0; i < oppPlayersData.count; i++) {
              const playerArray = oppPlayersData[i]?.player;
              if (playerArray && playerArray.length >= 2) {
                const info = playerArray[0];
                const stats = playerArray[1];
                const playerKey = info.find((p: any) => p.player_key)?.player_key;
                
                const playerData: PlayerData = {
                  name: info.find((p: any) => p.name)?.name?.full || 'Unknown',
                  position: info.find((p: any) => p.display_position)?.display_position || '',
                  team: info.find((p: any) => p.editorial_team_abbr)?.editorial_team_abbr || '',
                  selectedPosition: stats?.selected_position?.[1]?.position || 'BN',
                  points: 0, // Will be calculated
                  projectedPoints: (() => {
                  const proj = parseFloat(stats?.player_projected_points?.total || '0');
                  return proj > 0 ? proj : Math.max(0, parseFloat(stats?.player_points?.total || '0') * 0.8);
                })(),
                  stats: '—', // Will be fetched
                  status: info.find((p: any) => p.status)?.status || '',
                };
                
                // Fetch player stats to calculate points and get detailed stats
                if (playerKey && provider) {
                  oppPlayerPromises.push(
                    (provider as any).getPlayerStatsWithDetails(playerKey, week).then((result: { points: number; stats: string }) => {
                      playerData.points = result.points;
                      playerData.stats = result.stats;
                      return playerData;
                    }).catch((error: any) => {
                      console.error(`Failed to get stats for opponent ${playerData.name} (${playerKey}):`, error);
                      playerData.points = -1; // -1 indicates stats unavailable
                      playerData.stats = '—';
                      return playerData;
                    })
                  );
                } else {
                  oppPlayerPromises.push(Promise.resolve(playerData));
                }
              }
            }
            
            // Wait for all opponent player stats
            const oppPlayersWithStats = await Promise.all(oppPlayerPromises);
            setOpponentRoster(oppPlayersWithStats);
          }
        }
      }

      // Get all league matchups
      const scoreboardResponse = await fetch(
        `/.netlify/functions/yahoo-fantasy?endpoint=scoreboard&week=${week}&leagueId=${import.meta.env.VITE_YAHOO_LEAGUE_ID || '590446'}`
      );
      const scoreboardData = await scoreboardResponse.json();
      
      const scoreboard = scoreboardData.fantasy_content?.league?.[1]?.scoreboard;
      if (scoreboard && scoreboard['0']?.matchups) {
        const matchupsData = scoreboard['0'].matchups;
        const leagueMatchupsList: LeagueMatchup[] = [];
        
        for (let i = 0; i < matchupsData.count; i++) {
          const matchup = matchupsData[i]?.matchup;
          if (matchup) {
            const teams = matchup['0']?.teams;
            const team1Array = teams['0']?.team?.[0];
            const team1Stats = teams['0']?.team?.[1];
            const team2Array = teams['1']?.team?.[0];
            const team2Stats = teams['1']?.team?.[1];
            
            leagueMatchupsList.push({
              team1Name: team1Array?.find((item: any) => item.name)?.name || '',
              team1Logo: team1Array?.find((item: any) => item.team_logos)?.team_logos[0]?.team_logo?.url || '',
              team1Manager: team1Array?.find((item: any) => item.managers)?.managers[0]?.manager?.nickname || '',
              team1Points: parseFloat(team1Stats?.team_points?.total || '0'),
              team2Name: team2Array?.find((item: any) => item.name)?.name || '',
              team2Logo: team2Array?.find((item: any) => item.team_logos)?.team_logos[0]?.team_logo?.url || '',
              team2Manager: team2Array?.find((item: any) => item.managers)?.managers[0]?.manager?.nickname || '',
              team2Points: parseFloat(team2Stats?.team_points?.total || '0'),
              status: matchup.status || 'preevent',
            });
          }
        }
        setAllMatchups(leagueMatchupsList);
      }

    } catch (error) {
      console.error('Failed to load fantasy data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWeekChange = async (week: number) => {
    setSelectedWeek(week);
    await loadWeekData(week);
  };

  const resetToCurrentWeek = () => {
    const currentWeek = getCurrentNFLWeek();
    setSelectedWeek(currentWeek);
    loadWeekData(currentWeek);
  };

  const loadWeekData = async (week: number) => {
    setLoading(true);
    
    const currentNFLWeek = getCurrentNFLWeek();
    const isCompletedWeek = week < currentNFLWeek;
    
    // Check memory cache first
    const cached = weekCache.get(week);
    if (cached) {
      setMyRoster(cached.myRoster);
      setOpponentRoster(cached.opponentRoster);
      setCurrentMatchup(cached.currentMatchup);
      setAllMatchups(cached.allMatchups);
      setLoading(false);
      return;
    }
    
    // For completed weeks, check Firestore
    if (isCompletedWeek) {
      try {
        const weekDocRef = doc(db, 'fantasy', '2025', 'weeks', `week${week}`);
        const weekDoc = await getDoc(weekDocRef);
        
        if (weekDoc.exists()) {
          const data = weekDoc.data() as WeekCache;
          setMyRoster(data.myRoster);
          setOpponentRoster(data.opponentRoster);
          setCurrentMatchup(data.currentMatchup);
          setAllMatchups(data.allMatchups);
          
          // Also save to memory cache
          setWeekCache(prev => new Map(prev).set(week, data));
          setLoading(false);
          return;
        }
      } catch (error) {
        console.error(`Failed to load week ${week} from Firestore:`, error);
        // Continue to API fetch
      }
    }
    
    try {
      const provider = FantasyProviderFactory.createProvider();
      if (!provider) return;

      const teams = await provider.getUserTeams();
      const teamId = teams.brady;

      // Projections will be calculated per-player based on historical performance

      // Local variables to store data for caching
      let myRosterData: PlayerData[] = [];
      let opponentRosterData: PlayerData[] = [];
      let currentMatchupData: MatchupData | null = null;
      let allMatchupsData: LeagueMatchup[] = [];

      // Fetch my team roster for this week
      const myTeamResponse = await fetch(
        `/.netlify/functions/yahoo-fantasy?endpoint=team&teamId=${teamId}&week=${week}&leagueId=${import.meta.env.VITE_YAHOO_LEAGUE_ID || '590446'}`
      );
      const myTeamData = await myTeamResponse.json();
      
      // Parse roster
      const rosterObj = myTeamData.fantasy_content?.team?.[1]?.roster;
      if (rosterObj) {
        const players: PlayerData[] = [];
        const playersData = rosterObj['0']?.players;
        
        if (playersData) {
          const playerPromises = [];
          for (let i = 0; i < playersData.count; i++) {
            const playerArray = playersData[i]?.player;
            if (playerArray && playerArray.length >= 2) {
              const info = playerArray[0];
              const stats = playerArray[1];
              const playerKey = info.find((p: any) => p.player_key)?.player_key;
              
              const projectedFromYahoo = parseFloat(stats?.player_projected_points?.total || '0');
              
              const playerData: PlayerData = {
                name: info.find((p: any) => p.name)?.name?.full || 'Unknown',
                position: info.find((p: any) => p.display_position)?.display_position || '',
                team: info.find((p: any) => p.editorial_team_abbr)?.editorial_team_abbr || '',
                selectedPosition: stats?.selected_position?.[1]?.position || 'BN',
                points: 0,
                projectedPoints: 0, // Will be set after fetching actual points
                status: info.find((p: any) => p.status)?.status || '',
              };
              
              if (playerKey && provider) {
                playerPromises.push(
                  Promise.all([
                    getPlayerStatsWithCache(playerKey, week, provider),
                    calculateRollingAverageProjection(playerKey, week, provider)
                  ]).then(([points, projection]) => {
                    return {
                      ...playerData,
                      points: points,
                      projectedPoints: projection
                    };
                  }).catch((error: any) => {
                    console.error(`Failed to get stats for ${playerData.name}:`, error);
                    return {
                      ...playerData,
                      points: -1,
                      projectedPoints: 0
                    };
                  })
                );
              } else {
                playerPromises.push(Promise.resolve(playerData));
              }
            }
          }
          
          const playersWithStats = await Promise.all(playerPromises);
          myRosterData = playersWithStats;
          setMyRoster(playersWithStats);
        }
      }

      // Fetch matchup data for the week
      const matchupResponse = await fetch(
        `/.netlify/functions/yahoo-fantasy?endpoint=matchups&teamId=${teamId}&week=${week}&leagueId=${import.meta.env.VITE_YAHOO_LEAGUE_ID || '590446'}`
      );
      const matchupData = await matchupResponse.json();
      
      const matchupsObj = matchupData.fantasy_content?.team?.[1]?.matchups;
      if (matchupsObj && matchupsObj['0']?.matchup) {
        const matchup = matchupsObj['0'].matchup;
        const teamsData = matchup['0']?.teams;
        
        const team1Array = teamsData['0']?.team?.[0];
        const team1Stats = teamsData['0']?.team?.[1];
        const team2Array = teamsData['1']?.team?.[0];
        const team2Stats = teamsData['1']?.team?.[1];
        
        const team1: MatchupTeam = {
          teamKey: '',
          name: '',
          logo: '',
          manager: '',
          points: parseFloat(team1Stats?.team_points?.total || '0'),
          projectedPoints: parseFloat(team1Stats?.team_projected_points?.total || '0'),
        };
        
        const team2: MatchupTeam = {
          teamKey: '',
          name: '',
          logo: '',
          manager: '',
          points: parseFloat(team2Stats?.team_points?.total || '0'),
          projectedPoints: parseFloat(team2Stats?.team_projected_points?.total || '0'),
        };
        
        if (team1Array) {
          for (const item of team1Array) {
            if (item.team_key) team1.teamKey = item.team_key;
            if (item.name) team1.name = item.name;
            if (item.team_logos) team1.logo = item.team_logos[0]?.team_logo?.url || '';
            if (item.managers) team1.manager = item.managers[0]?.manager?.nickname || '';
          }
        }
        
        if (team2Array) {
          for (const item of team2Array) {
            if (item.team_key) team2.teamKey = item.team_key;
            if (item.name) team2.name = item.name;
            if (item.team_logos) team2.logo = item.team_logos[0]?.team_logo?.url || '';
            if (item.managers) team2.manager = item.managers[0]?.manager?.nickname || '';
          }
        }
        
        currentMatchupData = {
          team1,
          team2,
          status: matchup.status || 'preevent',
          winnerTeamKey: matchup.winner_team_key,
        };
        setCurrentMatchup(currentMatchupData);

        // Fetch opponent roster for this week
        const opponentTeamId = team1.teamKey === teamId ? team2.teamKey : team1.teamKey;
        const oppResponse = await fetch(
          `/.netlify/functions/yahoo-fantasy?endpoint=team&teamId=${opponentTeamId}&week=${week}&leagueId=${import.meta.env.VITE_YAHOO_LEAGUE_ID || '590446'}`
        );
        const oppData = await oppResponse.json();
        
        const oppRosterObj = oppData.fantasy_content?.team?.[1]?.roster;
        if (oppRosterObj) {
          const oppPlayerPromises = [];
          const oppPlayersData = oppRosterObj['0']?.players;
          
          if (oppPlayersData) {
            for (let i = 0; i < oppPlayersData.count; i++) {
              const playerArray = oppPlayersData[i]?.player;
              if (playerArray && playerArray.length >= 2) {
                const info = playerArray[0];
                const stats = playerArray[1];
                const playerKey = info.find((p: any) => p.player_key)?.player_key;
                
                const projectedFromYahoo = parseFloat(stats?.player_projected_points?.total || '0');
                
                const playerData: PlayerData = {
                  name: info.find((p: any) => p.name)?.name?.full || 'Unknown',
                  position: info.find((p: any) => p.display_position)?.display_position || '',
                  team: info.find((p: any) => p.editorial_team_abbr)?.editorial_team_abbr || '',
                  selectedPosition: stats?.selected_position?.[1]?.position || 'BN',
                  points: 0,
                  projectedPoints: 0, // Will be set after fetching actual points
                  status: info.find((p: any) => p.status)?.status || '',
                };
                
                if (playerKey && provider) {
                oppPlayerPromises.push(
                  Promise.all([
                    getPlayerStatsWithCache(playerKey, week, provider),
                    calculateRollingAverageProjection(playerKey, week, provider)
                  ]).then(([points, projection]) => {
                    return {
                      ...playerData,
                      points: points,
                      projectedPoints: projection
                    };
                  }).catch((error: any) => {
                    console.error(`Failed to get stats for opponent ${playerData.name}:`, error);
                    return {
                      ...playerData,
                      points: -1,
                      projectedPoints: 0
                    };
                  })
                );
                } else {
                  oppPlayerPromises.push(Promise.resolve(playerData));
                }
              }
            }
            
            const oppPlayersWithStats = await Promise.all(oppPlayerPromises);
            opponentRosterData = oppPlayersWithStats;
            setOpponentRoster(oppPlayersWithStats);
          }
        }
      }

      // Get all league matchups
      const scoreboardResponse = await fetch(
        `/.netlify/functions/yahoo-fantasy?endpoint=scoreboard&week=${week}&leagueId=${import.meta.env.VITE_YAHOO_LEAGUE_ID || '590446'}`
      );
      const scoreboardData = await scoreboardResponse.json();
      
      const scoreboard = scoreboardData.fantasy_content?.league?.[1]?.scoreboard;
      if (scoreboard && scoreboard['0']?.matchups) {
        const matchupsData = scoreboard['0'].matchups;
        const leagueMatchupsList: LeagueMatchup[] = [];
        
        for (let i = 0; i < matchupsData.count; i++) {
          const matchup = matchupsData[i]?.matchup;
          if (matchup) {
            const teams = matchup['0']?.teams;
            const team1Array = teams['0']?.team?.[0];
            const team1Stats = teams['0']?.team?.[1];
            const team2Array = teams['1']?.team?.[0];
            const team2Stats = teams['1']?.team?.[1];
            
            leagueMatchupsList.push({
              team1Name: team1Array?.find((item: any) => item.name)?.name || '',
              team1Logo: team1Array?.find((item: any) => item.team_logos)?.team_logos[0]?.team_logo?.url || '',
              team1Manager: team1Array?.find((item: any) => item.managers)?.managers[0]?.manager?.nickname || '',
              team1Points: parseFloat(team1Stats?.team_points?.total || '0'),
              team2Name: team2Array?.find((item: any) => item.name)?.name || '',
              team2Logo: team2Array?.find((item: any) => item.team_logos)?.team_logos[0]?.team_logo?.url || '',
              team2Manager: team2Array?.find((item: any) => item.managers)?.managers[0]?.manager?.nickname || '',
              team2Points: parseFloat(team2Stats?.team_points?.total || '0'),
              status: matchup.status || 'preevent',
            });
          }
        }
        allMatchupsData = leagueMatchupsList;
        setAllMatchups(leagueMatchupsList);
      }

      // Save to memory cache
      const weekData: WeekCache = {
        myRoster: myRosterData,
        opponentRoster: opponentRosterData,
        currentMatchup: currentMatchupData,
        allMatchups: allMatchupsData
      };
      
      setWeekCache(prev => new Map(prev).set(week, weekData));

      // For completed weeks, also save to Firestore for permanent storage
      if (isCompletedWeek) {
        try {
          const weekDocRef = doc(db, 'fantasy', '2025', 'weeks', `week${week}`);
          await setDoc(weekDocRef, weekData);
        } catch (error) {
          console.error(`Failed to save week ${week} to Firestore:`, error);
        }
      }

    } catch (error) {
      console.error('Failed to load week data:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderMatchupComparison = () => {
    if (!currentMatchup || !myTeam) return null;

    const myTeamData = currentMatchup.team1.teamKey === myTeam.teamKey ? currentMatchup.team1 : currentMatchup.team2;
    const oppTeamData = currentMatchup.team1.teamKey === myTeam.teamKey ? currentMatchup.team2 : currentMatchup.team1;
    const myPlayers = myRoster.filter(p => p.selectedPosition !== 'BN' && p.selectedPosition !== 'IR');
    const oppPlayers = opponentRoster.filter(p => p.selectedPosition !== 'BN' && p.selectedPosition !== 'IR');

    // Group by position
    const positions = ['QB', 'WR', 'RB', 'TE', 'W/R/T', 'K', 'DEF'];
    const groupedMatchup: { position: string; myPlayer?: PlayerData; oppPlayer?: PlayerData }[] = [];

    positions.forEach(pos => {
      const myPosPlayers = myPlayers.filter(p => p.selectedPosition === pos);
      const oppPosPlayers = oppPlayers.filter(p => p.selectedPosition === pos);
      const maxCount = Math.max(myPosPlayers.length, oppPosPlayers.length);

      for (let i = 0; i < maxCount; i++) {
        groupedMatchup.push({
          position: pos, // Always show position
          myPlayer: myPosPlayers[i],
          oppPlayer: oppPosPlayers[i],
        });
      }
    });

    return (
      <div className="space-y-4 max-w-6xl mx-auto">
        {/* Matchup Header */}
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="grid grid-cols-3 gap-2 sm:gap-4 items-center">
              {/* My Team */}
              <div className="text-center">
                <img src={myTeamData.logo} alt={myTeamData.name} className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-2 rounded-lg" />
                <h3 className="font-bold text-sm sm:text-base truncate px-1">{myTeamData.name}</h3>
                <p className="text-xs text-muted-foreground hidden sm:block">{myTeamData.manager}</p>
                <p className="text-xs text-muted-foreground hidden sm:block">4-1-0 | 2nd</p>
                <p className="text-xl sm:text-2xl font-bold mt-1">{myTeamData.points.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">Proj: {myTeamData.projectedPoints.toFixed(1)}</p>
              </div>

              {/* VS */}
              <div className="text-center">
                <p className="text-lg sm:text-xl font-bold text-muted-foreground">VS</p>
              </div>

              {/* Opponent */}
              <div className="text-center">
                <img src={oppTeamData.logo} alt={oppTeamData.name} className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-2 rounded-lg" />
                <h3 className="font-bold text-sm sm:text-base truncate px-1">{oppTeamData.name}</h3>
                <p className="text-xs text-muted-foreground hidden sm:block">{oppTeamData.manager}</p>
                <p className="text-xs text-muted-foreground hidden sm:block">2-3-0 | 8th</p>
                <p className="text-xl sm:text-2xl font-bold mt-1">{oppTeamData.points.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">Proj: {oppTeamData.projectedPoints.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Player-by-Player Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Player Matchup</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Desktop Layout */}
            <div className="hidden lg:block space-y-1">
              {/* Header */}
              <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto_1fr_auto] gap-3 pb-2 border-b font-semibold text-xs">
                <div className="text-left w-20">Stats</div>
                <div className="text-right">Player</div>
                <div className="text-center w-12">Proj</div>
                <div className="text-center w-12">Pts</div>
                <div className="text-center w-12">Pos</div>
                <div className="text-center w-12">Pts</div>
                <div className="text-center w-12">Proj</div>
                <div className="text-left">Player</div>
                <div className="text-right w-20">Stats</div>
              </div>

              {/* Players */}
              {groupedMatchup.map((row, idx) => (
                <div key={idx} className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto_1fr_auto] gap-3 py-2 border-b items-center text-xs">
                  {/* My Player Stats */}
                  <div className="text-left text-xs text-muted-foreground w-20">
                    {row.myPlayer ? (row.myPlayer.stats || '—') : ''}
                  </div>

                  {/* My Player */}
                  <div className="text-right">
                    {row.myPlayer ? (
                      <div>
                        <p className="font-medium text-sm truncate">{row.myPlayer.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.myPlayer.team} - {row.myPlayer.position}
                        </p>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">—</p>
                    )}
                  </div>

                  {/* My Player Projected */}
                  <div className="text-center text-muted-foreground w-12 text-sm">
                    {row.myPlayer ? row.myPlayer.projectedPoints.toFixed(1) : '—'}
                  </div>

                  {/* My Player Points */}
                  <div className="text-center font-bold w-12 text-sm">
                    {row.myPlayer ? (row.myPlayer.points === -1 ? 'N/A' : row.myPlayer.points.toFixed(1)) : '—'}
                  </div>

                  {/* Position */}
                  <div className="text-center w-12">
                    {row.position && (
                      <span className="font-mono text-xs font-semibold">{row.position}</span>
                    )}
                  </div>

                  {/* Opponent Player Points */}
                  <div className="text-center font-bold w-12 text-sm">
                    {row.oppPlayer ? (row.oppPlayer.points === -1 ? 'N/A' : row.oppPlayer.points.toFixed(1)) : '—'}
                  </div>

                  {/* Opponent Player Projected */}
                  <div className="text-center text-muted-foreground w-12 text-sm">
                    {row.oppPlayer ? row.oppPlayer.projectedPoints.toFixed(1) : '—'}
                  </div>

                  {/* Opponent Player */}
                  <div className="text-left">
                    {row.oppPlayer ? (
                      <div>
                        <p className="font-medium text-sm truncate">{row.oppPlayer.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.oppPlayer.team} - {row.oppPlayer.position}
                        </p>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">—</p>
                    )}
                  </div>

                  {/* Opponent Player Stats */}
                  <div className="text-right text-xs text-muted-foreground w-20">
                    {row.oppPlayer ? (row.oppPlayer.stats || '—') : ''}
                  </div>
                </div>
              ))}

              {/* Totals */}
              <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto_1fr_auto] gap-3 pt-2 font-bold items-center">
                <div className="w-20"></div>
                <div></div>
                <div></div>
                <div className="text-center w-12 text-base">{myTeamData.points.toFixed(1)}</div>
                <div className="text-center w-12 text-xs text-muted-foreground">TOTAL</div>
                <div className="text-center w-12 text-base">{oppTeamData.points.toFixed(1)}</div>
                <div></div>
                <div></div>
                <div className="w-20"></div>
              </div>
            </div>

            {/* Mobile Layout */}
            <div className="lg:hidden space-y-3">
              {groupedMatchup.map((row, idx) => (
                <div key={idx} className="border rounded-lg p-3 space-y-2">
                  {/* Position Header */}
                  <div className="text-center">
                    <span className="font-mono text-sm font-semibold bg-muted px-2 py-1 rounded">
                      {row.position}
                    </span>
                  </div>

                  {/* My Player */}
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      {row.myPlayer ? (
                        <div>
                          <p className="font-medium text-sm">{row.myPlayer.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {row.myPlayer.team} - {row.myPlayer.position}
                          </p>
                          {row.myPlayer.stats && row.myPlayer.stats !== '—' && (
                            <p className="text-xs text-muted-foreground mt-1">{row.myPlayer.stats}</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm">—</p>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-sm font-bold">
                        {row.myPlayer ? (row.myPlayer.points === -1 ? 'N/A' : row.myPlayer.points.toFixed(1)) : '—'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Proj: {row.myPlayer ? row.myPlayer.projectedPoints.toFixed(1) : '—'}
                      </div>
                    </div>
                  </div>

                  {/* Opponent Player */}
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      {row.oppPlayer ? (
                        <div>
                          <p className="font-medium text-sm">{row.oppPlayer.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {row.oppPlayer.team} - {row.oppPlayer.position}
                          </p>
                          {row.oppPlayer.stats && row.oppPlayer.stats !== '—' && (
                            <p className="text-xs text-muted-foreground mt-1">{row.oppPlayer.stats}</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm">—</p>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-sm font-bold">
                        {row.oppPlayer ? (row.oppPlayer.points === -1 ? 'N/A' : row.oppPlayer.points.toFixed(1)) : '—'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Proj: {row.oppPlayer ? row.oppPlayer.projectedPoints.toFixed(1) : '—'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Mobile Totals */}
              <div className="border-t pt-3 mt-4">
                <div className="flex justify-between items-center">
                  <div className="text-sm font-medium">TOTAL</div>
                  <div className="flex space-x-6">
                    <div className="text-center">
                      <div className="text-lg font-bold">{myTeamData.points.toFixed(1)}</div>
                      <div className="text-xs text-muted-foreground">My Team</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold">{oppTeamData.points.toFixed(1)}</div>
                      <div className="text-xs text-muted-foreground">Opponent</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bench Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Bench</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Desktop Layout */}
            <div className="hidden lg:block space-y-1">
              {/* Header */}
              <div className="grid grid-cols-[1fr_auto_auto_auto_auto_1fr] gap-3 pb-2 border-b font-semibold text-sm">
                <div className="text-right">Player</div>
                <div className="text-right w-12">Pts</div>
                <div className="text-center w-12">Proj</div>
                <div className="text-center w-12">Proj</div>
                <div className="text-left w-12">Pts</div>
                <div className="text-left">Player</div>
              </div>

              {/* Bench Players */}
              {(() => {
                const myBench = myRoster.filter(p => p.selectedPosition === 'BN' || p.selectedPosition === 'IR');
                const oppBench = opponentRoster.filter(p => p.selectedPosition === 'BN' || p.selectedPosition === 'IR');
                const maxBenchCount = Math.max(myBench.length, oppBench.length);
                
                return Array.from({ length: maxBenchCount }, (_, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_auto_auto_auto_auto_1fr] gap-3 py-2 border-b items-center text-sm">
                    {/* My Bench Player */}
                    <div className="text-right">
                      {myBench[idx] ? (
                        <div>
                          <p className="font-medium truncate">{myBench[idx].name}</p>
                          <p className="text-xs text-muted-foreground">
                            {myBench[idx].team} - {myBench[idx].position}
                          </p>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">—</p>
                      )}
                    </div>

                    {/* My Bench Points */}
                    <div className="text-right font-bold w-12">
                      {myBench[idx] ? (myBench[idx].points === -1 ? 'N/A' : myBench[idx].points.toFixed(1)) : '—'}
                    </div>

                    {/* My Bench Projected */}
                    <div className="text-center text-xs text-muted-foreground w-12">
                      {myBench[idx] ? myBench[idx].projectedPoints.toFixed(1) : '—'}
                    </div>

                    {/* Opponent Bench Projected */}
                    <div className="text-center text-xs text-muted-foreground w-12">
                      {oppBench[idx] ? oppBench[idx].projectedPoints.toFixed(1) : '—'}
                    </div>

                    {/* Opponent Bench Points */}
                    <div className="text-left font-bold w-12">
                      {oppBench[idx] ? (oppBench[idx].points === -1 ? 'N/A' : oppBench[idx].points.toFixed(1)) : '—'}
                    </div>

                    {/* Opponent Bench Player */}
                    <div className="text-left">
                      {oppBench[idx] ? (
                        <div>
                          <p className="font-medium truncate">{oppBench[idx].name}</p>
                          <p className="text-xs text-muted-foreground">
                            {oppBench[idx].team} - {oppBench[idx].position}
                          </p>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">—</p>
                      )}
                    </div>
                  </div>
                ));
              })()}
            </div>

            {/* Mobile Layout */}
            <div className="lg:hidden space-y-3">
              {(() => {
                const myBench = myRoster.filter(p => p.selectedPosition === 'BN' || p.selectedPosition === 'IR');
                const oppBench = opponentRoster.filter(p => p.selectedPosition === 'BN' || p.selectedPosition === 'IR');
                const maxBenchCount = Math.max(myBench.length, oppBench.length);
                
                return Array.from({ length: maxBenchCount }, (_, idx) => (
                  <div key={idx} className="border rounded-lg p-3">
                    <div className="grid grid-cols-2 gap-4">
                      {/* My Bench Player */}
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">My Bench</div>
                        {myBench[idx] ? (
                          <div>
                            <p className="font-medium text-sm">{myBench[idx].name}</p>
                            <p className="text-xs text-muted-foreground">
                              {myBench[idx].team} - {myBench[idx].position}
                            </p>
                            <div className="flex justify-between mt-1">
                              <span className="text-sm font-bold">
                                {myBench[idx].points === -1 ? 'N/A' : myBench[idx].points.toFixed(1)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Proj: {myBench[idx].projectedPoints.toFixed(1)}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-sm">—</p>
                        )}
                      </div>

                      {/* Opponent Bench Player */}
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Opponent Bench</div>
                        {oppBench[idx] ? (
                          <div>
                            <p className="font-medium text-sm">{oppBench[idx].name}</p>
                            <p className="text-xs text-muted-foreground">
                              {oppBench[idx].team} - {oppBench[idx].position}
                            </p>
                            <div className="flex justify-between mt-1">
                              <span className="text-sm font-bold">
                                {oppBench[idx].points === -1 ? 'N/A' : oppBench[idx].points.toFixed(1)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Proj: {oppBench[idx].projectedPoints.toFixed(1)}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-sm">—</p>
                        )}
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <NFLNavigation />
      
      <div className="container mx-auto px-4 py-6">
        {/* Week Selector */}
        <div className="mb-6 flex items-center justify-center gap-4">
          <WeekSelector
            currentWeek={selectedWeek}
            onWeekChange={handleWeekChange}
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
        </div>

        {/* Page Header */}
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold mb-2">Fantasy Football</h1>
          <p className="text-muted-foreground">{leagueName}</p>
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        ) : (
          <Tabs defaultValue="matchup" className="space-y-6">
            <TabsList className="grid grid-cols-3 max-w-lg mx-auto">
              <TabsTrigger value="matchup">
                <Users className="w-4 h-4 mr-2" />
                Matchup
              </TabsTrigger>
              <TabsTrigger value="league">
                <BarChart3 className="w-4 h-4 mr-2" />
                League
              </TabsTrigger>
              <TabsTrigger value="team">
                <Trophy className="w-4 h-4 mr-2" />
                My Team
              </TabsTrigger>
            </TabsList>

            {/* Matchup Tab */}
            <TabsContent value="matchup">
              {renderMatchupComparison()}
            </TabsContent>

            {/* League Tab */}
            <TabsContent value="league" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Week {selectedWeek} Matchups</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-w-4xl mx-auto">
                    {allMatchups.map((matchup, idx) => (
                      <div key={idx} className="flex items-center gap-4 p-3 rounded-lg border">
                        {/* Team 1 */}
                        <div className="flex items-center gap-2 min-w-[200px]">
                          <img src={matchup.team1Logo} alt={matchup.team1Name} className="w-10 h-10 rounded" />
                          <div>
                            <p className="font-semibold text-sm">{matchup.team1Name}</p>
                            <p className="text-xs text-muted-foreground">{matchup.team1Manager}</p>
                          </div>
                        </div>

                        {/* Scores */}
                        <div className="flex items-center gap-3 mx-auto">
                          <p className="text-xl font-bold min-w-[65px] text-right">{matchup.team1Points.toFixed(2)}</p>
                          <p className="text-sm text-muted-foreground">vs</p>
                          <p className="text-xl font-bold min-w-[65px] text-left">{matchup.team2Points.toFixed(2)}</p>
                        </div>

                        {/* Team 2 */}
                        <div className="flex items-center gap-2 min-w-[200px] justify-end">
                          <div className="text-right">
                            <p className="font-semibold text-sm">{matchup.team2Name}</p>
                            <p className="text-xs text-muted-foreground">{matchup.team2Manager}</p>
                          </div>
                          <img src={matchup.team2Logo} alt={matchup.team2Name} className="w-10 h-10 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* My Team Tab */}
            <TabsContent value="team" className="space-y-4">
              <div className="max-w-4xl mx-auto space-y-4">
                {myTeam && (
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <img src={myTeam.logo} alt={myTeam.name} className="w-12 h-12 rounded-lg" />
                        <div>
                          <CardTitle className="text-xl">{myTeam.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">{myTeam.manager}</p>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                )}

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Week {selectedWeek} Roster</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1.5">
                      {/* Starters */}
                      {myRoster
                        .filter(p => p.selectedPosition !== 'BN' && p.selectedPosition !== 'IR')
                        .map((player, idx) => (
                          <div 
                            key={idx}
                            className="flex items-center p-2.5 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                          >
                            <div className="flex items-center gap-2 flex-1">
                              <span className="font-mono text-xs font-semibold w-10 text-center bg-primary/10 rounded px-1.5 py-0.5">
                                {player.selectedPosition}
                              </span>
                              <div className="flex-1">
                                <p className="font-medium text-sm">{player.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {player.team} - {player.position}
                                  {player.status && <span className="ml-2 text-orange-500">{player.status}</span>}
                                </p>
                              </div>
                            </div>
                            <div className="text-right text-sm ml-4">
                              <p className="font-bold">
                                {player.points === -1 ? 'N/A' : player.points.toFixed(2)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Proj: {player.projectedPoints.toFixed(2)}
                              </p>
                            </div>
                          </div>
                        ))}

                      {/* Bench */}
                      <div className="mt-4 pt-4 border-t">
                        <h3 className="font-semibold mb-2 text-sm text-muted-foreground">Bench</h3>
                        <div className="space-y-1.5">
                          {myRoster
                            .filter(p => p.selectedPosition === 'BN' || p.selectedPosition === 'IR')
                            .map((player, idx) => (
                              <div 
                                key={idx}
                                className="flex items-center p-2 rounded bg-muted/50"
                              >
                                <div className="flex items-center gap-2 flex-1">
                                  <span className="font-mono text-xs w-10 text-center opacity-50">
                                    {player.selectedPosition}
                                  </span>
                                  <div className="flex-1">
                                    <p className="text-sm">{player.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {player.team} - {player.position}
                                      {player.status && <span className="ml-2 text-orange-500">{player.status}</span>}
                                    </p>
                                  </div>
                                </div>
                                <p className="text-sm opacity-50 ml-4">
                                  {player.points === -1 ? 'N/A' : `${player.points.toFixed(2)} pts`}
                                </p>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};