// src/pages/NFL/TeamDetail.tsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { NFLNavigation } from '@/components/NFLNavigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, ExternalLink, ArrowLeft, Users, Shield, Zap } from 'lucide-react';
import { ProviderFactory } from '@/providers/ProviderFactory';
import { Team, ProcessedDepthChart } from '@/types/teams';

export const NFLTeamDetail = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const [team, setTeam] = useState<Team | null>(null);
  const [depthChart, setDepthChart] = useState<ProcessedDepthChart | null>(null);
  const [loading, setLoading] = useState(true);
  const [depthChartLoading, setDepthChartLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const teamsProvider = ProviderFactory.createTeamsProvider();
  const depthChartProvider = ProviderFactory.createDepthChartProvider();

  useEffect(() => {
    const fetchTeamData = async () => {
      if (!teamId) return;

      try {
        setLoading(true);
        
        // Fetch team data
        const teamData = await teamsProvider.getTeamByAbbreviation(teamId.toUpperCase());
        
        if (!teamData) {
          setError(`Team "${teamId.toUpperCase()}" not found`);
          return;
        }

        setTeam(teamData);
        setError(null);

        // Fetch depth chart data
        setDepthChartLoading(true);
        const depthChartData = await depthChartProvider.getEnhancedDepthChart(teamData.id);
        setDepthChart(depthChartData);
        
      } catch (err) {
        console.error('Error loading team data:', err);
        setError('Failed to load team data');
      } finally {
        setLoading(false);
        setDepthChartLoading(false);
      }
    };

    fetchTeamData();
  }, [teamId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <NFLNavigation />
        
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            <span>Loading team...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <NFLNavigation />
        
        <div className="container mx-auto px-4 py-6">
          <div className="text-center py-12">
            <p className="text-red-500 mb-4">{error || 'Team not found'}</p>
            <Button asChild>
              <Link to="/nfl/teams">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Teams
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ESPN-style position order
  const offenseOrder = ['QB', 'RB', 'WR', 'TE', 'FB', 'LT', 'LG', 'C', 'RG', 'RT'];
  const defenseOrder = ['LDE', 'NT', 'RDE', 'WLB', 'LILB', 'RILB', 'SLB', 'LCB', 'SS', 'FS', 'RCB', 'NB'];
  const specialTeamsOrder = ['PK', 'P', 'H', 'PR', 'KR', 'LS'];

  // Position glossary
  const positionGlossary: Record<string, string> = {
    'QB': 'Quarterback',
    'RB': 'Running Back',
    'WR': 'Wide Receiver',
    'TE': 'Tight End',
    'FB': 'Fullback',
    'LT': 'Left Tackle',
    'LG': 'Left Guard',
    'C': 'Center',
    'RG': 'Right Guard',
    'RT': 'Right Tackle',
    'LDE': 'Left Defensive End',
    'NT': 'Nose Tackle',
    'RDE': 'Right Defensive End',
    'WLB': 'Weakside Linebacker',
    'LILB': 'Left Inside Linebacker',
    'RILB': 'Right Inside Linebacker',
    'SLB': 'Strongside Linebacker',
    'LCB': 'Left Cornerback',
    'SS': 'Strong Safety',
    'FS': 'Free Safety',
    'RCB': 'Right Cornerback',
    'NB': 'Nickel Back',
    'PK': 'Place Kicker',
    'P': 'Punter',
    'H': 'Holder',
    'PR': 'Punt Returner',
    'KR': 'Kick Returner',
    'LS': 'Long Snapper'
  };

  const renderPositionGroup = (title: string, positions: Record<string, any[]>, icon: React.ReactNode, positionOrder: string[]) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          {icon}
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {depthChartLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span>Loading depth chart...</span>
          </div>
        ) : Object.keys(positions).length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No depth chart data available</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {positionOrder.map(position => {
              const players = positions[position] || [];
              if (players.length === 0) return null;

              return (
                <div key={position} className="space-y-2">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    {position}
                    {positionGlossary[position] && (
                      <span className="block text-xs font-normal normal-case text-muted-foreground">
                        {positionGlossary[position]}
                      </span>
                    )}
                  </h4>
                  <div className="space-y-1">
                    {players.map((player, index) => (
                      <div key={`${player.id}-${index}`} className="flex items-center justify-between">
                        <span className="text-sm">
                          {player.name || player.displayName || `Player ${player.id}`}
                        </span>
                        <div className="flex items-center space-x-1">
                          {player.jerseyNumber && (
                            <Badge variant="outline" className="text-xs">
                              #{player.jerseyNumber}
                            </Badge>
                          )}
                          <Badge variant={index === 0 ? 'default' : 'secondary'} className="text-xs">
                            {index === 0 ? '1st' : index === 1 ? '2nd' : index === 2 ? '3rd' : `${index + 1}th`}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <NFLNavigation />
      
      <div className="container mx-auto px-4 py-6">
        {/* Team Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Button asChild variant="outline" size="sm">
              <Link to="/nfl/teams">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Teams
              </Link>
            </Button>
          </div>
          
          <div className="flex items-center space-x-6">
            <img 
              src={team.logoUrl} 
              alt={`${team.displayName} logo`}
              className="w-20 h-20 object-contain"
              onError={(e) => {
                e.currentTarget.src = `https://ui-avatars.com/api/?name=${team.abbreviation}&background=random&size=80`;
              }}
            />
            
            <div className="space-y-2">
              <h1 className="text-4xl font-bold">{team.displayName}</h1>
              <div className="flex items-center space-x-4">
                <Badge variant="outline">{team.abbreviation}</Badge>
                <Badge variant="secondary">{team.division}</Badge>
                <Badge variant="secondary">{team.conference}</Badge>
              </div>
              
              <div className="flex space-x-2">
                {team.clubhouseUrl && (
                  <Button asChild variant="outline" size="sm">
                    <a href={team.clubhouseUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      ESPN Clubhouse
                    </a>
                  </Button>
                )}
                
                {team.rosterUrl && (
                  <Button asChild variant="outline" size="sm">
                    <a href={team.rosterUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Roster
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        <Separator className="mb-8" />

        {/* Depth Chart Section */}
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold mb-4">Depth Chart</h2>
            <p className="text-muted-foreground mb-6">
              Current roster and position depth chart from ESPN
            </p>
          </div>

          {/* Offense */}
          {renderPositionGroup(
            'Offense', 
            depthChart?.offense || {}, 
            <Users className="h-5 w-5" />,
            offenseOrder
          )}

          {/* Defense */}
          {renderPositionGroup(
            'Defense', 
            depthChart?.defense || {}, 
            <Shield className="h-5 w-5" />,
            defenseOrder
          )}

          {/* Special Teams */}
          {renderPositionGroup(
            'Special Teams', 
            depthChart?.specialTeams || {}, 
            <Zap className="h-5 w-5" />,
            specialTeamsOrder
          )}

          {/* Glossary */}
          <Card>
            <CardHeader>
              <CardTitle>Position Glossary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(positionGlossary).map(([abbrev, fullName]) => (
                  <div key={abbrev} className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs font-mono">
                      {abbrev}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{fullName}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
