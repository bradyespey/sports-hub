// src/pages/NFL/Fantasy.tsx
import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { NFLNavigation } from '@/components/NFLNavigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Users, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';
import { FantasyProviderFactory } from '@/providers/fantasy/FantasyProviderFactory';

interface PlayerData {
  name: string;
  position: string;
  team: string;
  selectedPosition: string;
  points: number;
  projectedPoints: number;
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

export const NFLFantasy = () => {
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(5);
  const [leagueName, setLeagueName] = useState('Fantasy League');
  const [myTeam, setMyTeam] = useState<MatchupTeam | null>(null);
  const [myRoster, setMyRoster] = useState<PlayerData[]>([]);
  const [opponentRoster, setOpponentRoster] = useState<PlayerData[]>([]);
  const [currentMatchup, setCurrentMatchup] = useState<MatchupData | null>(null);
  const [allMatchups, setAllMatchups] = useState<LeagueMatchup[]>([]);

  useEffect(() => {
    loadFantasyData();
  }, []);

  const loadFantasyData = async () => {
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

      // Fetch my team roster
      const myTeamResponse = await fetch(
        `/.netlify/functions/yahoo-fantasy?endpoint=team&teamId=${teamId}&leagueId=${import.meta.env.VITE_YAHOO_LEAGUE_ID || '590446'}`
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
                projectedPoints: parseFloat(stats?.player_projected_points?.total || '0'),
                status: info.find((p: any) => p.status)?.status || '',
              };
              
              // Fetch player stats to calculate points
              if (playerKey && provider) {
                playerPromises.push(
                  (provider as any).getPlayerStats(playerKey, currentWeek).then((points: number) => {
                    playerData.points = points;
                    return playerData;
                  }).catch((error: any) => {
                    console.error(`Failed to get stats for ${playerData.name} (${playerKey}):`, error);
                    // Set a placeholder value instead of 0 to indicate stats are unavailable
                    playerData.points = -1; // -1 indicates stats unavailable
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
        `/.netlify/functions/yahoo-fantasy?endpoint=matchups&teamId=${teamId}&week=${currentWeek}&leagueId=${import.meta.env.VITE_YAHOO_LEAGUE_ID || '590446'}`
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

        // Fetch opponent roster
        const opponentTeamId = team1.teamKey === teamId ? team2.teamKey : team1.teamKey;
        const oppResponse = await fetch(
          `/.netlify/functions/yahoo-fantasy?endpoint=team&teamId=${opponentTeamId}&leagueId=${import.meta.env.VITE_YAHOO_LEAGUE_ID || '590446'}`
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
                  projectedPoints: parseFloat(stats?.player_projected_points?.total || '0'),
                  status: info.find((p: any) => p.status)?.status || '',
                };
                
                // Fetch player stats to calculate points
                if (playerKey && provider) {
                  oppPlayerPromises.push(
                    (provider as any).getPlayerStats(playerKey, currentWeek).then((points: number) => {
                      playerData.points = points;
                      return playerData;
                    }).catch((error: any) => {
                      console.error(`Failed to get stats for opponent ${playerData.name} (${playerKey}):`, error);
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
        `/.netlify/functions/yahoo-fantasy?endpoint=scoreboard&week=${currentWeek}&leagueId=${import.meta.env.VITE_YAHOO_LEAGUE_ID || '590446'}`
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

  const changeWeek = (delta: number) => {
    const newWeek = Math.max(1, Math.min(17, currentWeek + delta));
    setCurrentWeek(newWeek);
    loadWeekData(newWeek);
  };

  const loadWeekData = async (week: number) => {
    setLoading(true);
    try {
      const provider = FantasyProviderFactory.createProvider();
      if (!provider) return;

      const teams = await provider.getUserTeams();
      const teamId = teams.brady;

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
        
        setCurrentMatchup({
          team1,
          team2,
          status: matchup.status || 'preevent',
          winnerTeamKey: matchup.winner_team_key,
        });
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
          position: i === 0 ? pos : '',
          myPlayer: myPosPlayers[i],
          oppPlayer: oppPosPlayers[i],
        });
      }
    });

    return (
      <div className="space-y-6">
        {/* Matchup Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-4 items-center">
              {/* My Team */}
              <div className="text-center">
                <img src={myTeamData.logo} alt={myTeamData.name} className="w-20 h-20 mx-auto mb-2 rounded-lg" />
                <h3 className="font-bold text-lg">{myTeamData.name}</h3>
                <p className="text-sm text-muted-foreground">{myTeamData.manager}</p>
                <p className="text-3xl font-bold mt-2">{myTeamData.points.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Proj: {myTeamData.projectedPoints.toFixed(2)}</p>
              </div>

              {/* VS */}
              <div className="text-center">
                <p className="text-2xl font-bold text-muted-foreground">VS</p>
              </div>

              {/* Opponent */}
              <div className="text-center">
                <img src={oppTeamData.logo} alt={oppTeamData.name} className="w-20 h-20 mx-auto mb-2 rounded-lg" />
                <h3 className="font-bold text-lg">{oppTeamData.name}</h3>
                <p className="text-sm text-muted-foreground">{oppTeamData.manager}</p>
                <p className="text-3xl font-bold mt-2">{oppTeamData.points.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Proj: {oppTeamData.projectedPoints.toFixed(2)}</p>
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
            <div className="space-y-1">
              {/* Header */}
              <div className="grid grid-cols-9 gap-2 pb-2 border-b font-semibold text-sm">
                <div className="col-span-3 text-right">Player</div>
                <div className="text-right">Pts</div>
                <div className="text-center">Pos</div>
                <div className="text-left">Pts</div>
                <div className="col-span-3">Player</div>
              </div>

              {/* Players */}
              {groupedMatchup.map((row, idx) => (
                <div key={idx} className="grid grid-cols-9 gap-2 py-2 border-b items-center text-sm">
                  {/* My Player */}
                  <div className="col-span-3 text-right">
                    {row.myPlayer ? (
                      <div>
                        <p className="font-medium">{row.myPlayer.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.myPlayer.team} - {row.myPlayer.position}
                        </p>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">—</p>
                    )}
                  </div>

                  {/* My Player Points */}
                  <div className="text-right font-bold">
                    {row.myPlayer ? (row.myPlayer.points === -1 ? 'N/A' : row.myPlayer.points.toFixed(2)) : '—'}
                  </div>

                  {/* Position */}
                  <div className="text-center">
                    {row.position && (
                      <span className="font-mono text-xs font-semibold bg-primary/10 rounded px-2 py-1">
                        {row.position}
                      </span>
                    )}
                  </div>

                  {/* Opponent Player Points */}
                  <div className="text-left font-bold">
                    {row.oppPlayer ? (row.oppPlayer.points === -1 ? 'N/A' : row.oppPlayer.points.toFixed(2)) : '—'}
                  </div>

                  {/* Opponent Player */}
                  <div className="col-span-3">
                    {row.oppPlayer ? (
                      <div>
                        <p className="font-medium">{row.oppPlayer.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.oppPlayer.team} - {row.oppPlayer.position}
                        </p>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">—</p>
                    )}
                  </div>
                </div>
              ))}

              {/* Totals */}
              <div className="grid grid-cols-9 gap-2 pt-2 font-bold text-lg">
                <div className="col-span-3"></div>
                <div className="text-right">{myTeamData.points.toFixed(2)}</div>
                <div className="text-center text-sm text-muted-foreground">TOTAL</div>
                <div className="text-left">{oppTeamData.points.toFixed(2)}</div>
                <div className="col-span-3"></div>
              </div>
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
        {/* Header with Week Selector */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Fantasy Football</h1>
            <p className="text-muted-foreground">{leagueName}</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => changeWeek(-1)} disabled={currentWeek <= 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-semibold px-4">Week {currentWeek}</span>
            <Button variant="outline" size="icon" onClick={() => changeWeek(1)} disabled={currentWeek >= 17}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        ) : (
          <Tabs defaultValue="matchup" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 max-w-lg">
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
                  <CardTitle>Week {currentWeek} Matchups</CardTitle>
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
                    <CardTitle className="text-lg">Week {currentWeek} Roster</CardTitle>
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