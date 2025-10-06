// src/pages/NFL/Teams.tsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { NFLNavigation } from '@/components/NFLNavigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ExternalLink } from 'lucide-react';
import { ProviderFactory } from '@/providers/ProviderFactory';
import { Team } from '@/types/teams';
import { sortTeamsInDivision } from '@/lib/nflTiebreaking';

export const NFLTeams = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const teamsProvider = ProviderFactory.createTeamsProvider();

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        setLoading(true);
        const teamsData = await teamsProvider.getAllTeams();
        
        // Fetch records for all teams
        const teamsWithRecords = await Promise.all(
          teamsData.map(async (team) => {
            try {
              const teamWithRecord = await teamsProvider.getTeam(team.id);
              return teamWithRecord || team;
            } catch (err) {
              console.warn(`Failed to fetch record for ${team.displayName}:`, err);
              return team;
            }
          })
        );
        
        setTeams(teamsWithRecords);
        setError(null);
      } catch (err) {
        console.error('Error loading teams:', err);
        setError('Failed to load teams data');
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <NFLNavigation />
        
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            <span>Loading teams...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <NFLNavigation />
        
        <div className="container mx-auto px-4 py-6">
          <div className="text-center py-12">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Group teams by division and sort by record within each division
  const divisions = teams.reduce((acc, team) => {
    const division = team.division || 'Other';
    if (!acc[division]) {
      acc[division] = [];
    }
    acc[division].push(team);
    return acc;
  }, {} as Record<string, Team[]>);

  // Sort teams within each division using NFL tiebreaking procedures
  Object.keys(divisions).forEach(division => {
    divisions[division] = sortTeamsInDivision(divisions[division]);
  });

  // Separate AFC and NFC divisions
  const afcDivisions = ['AFC North', 'AFC East', 'AFC South', 'AFC West'];
  const nfcDivisions = ['NFC North', 'NFC East', 'NFC South', 'NFC West'];

  const afcDivisionsData = afcDivisions.map(division => [division, divisions[division] || []]);
  const nfcDivisionsData = nfcDivisions.map(division => [division, divisions[division] || []]);

  const DivisionCard = ({ division, divisionTeams }: { division: string; divisionTeams: Team[] }) => (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{division}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {divisionTeams.map(team => (
            <div 
              key={team.id} 
              className="flex items-center justify-between p-3 hover:bg-muted rounded-lg transition-colors"
            >
              <div className="flex items-center space-x-3">
                <img 
                  src={team.logoUrl} 
                  alt={`${team.displayName} logo`}
                  className="w-8 h-8 object-contain"
                  onError={(e) => {
                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${team.abbreviation}&background=random&size=32`;
                  }}
                />
                <div>
                  <Link 
                    to={`/nfl/teams/${team.abbreviation.toLowerCase()}`}
                    className="font-medium hover:underline text-foreground"
                  >
                    {team.displayName}
                  </Link>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">
                      {team.abbreviation}
                    </span>
                    {team.record && (
                      <Badge variant="secondary" className="text-xs">
                        {team.record.wins}-{team.record.losses}
                        {team.record.ties > 0 && `-${team.record.ties}`}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-2">
                {team.depthChartUrl && (
                  <Button asChild variant="ghost" size="sm">
                    <a 
                      href={team.depthChartUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center space-x-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span>ESPN</span>
                    </a>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <NFLNavigation />
      
      <div className="container mx-auto px-4 py-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">NFL Teams</h1>
          <p className="text-muted-foreground">Team information, depth charts, and stats from ESPN</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* AFC Divisions - Left Side */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-center mb-4">AFC</h2>
            {afcDivisionsData.map(([division, divisionTeams]) => (
              <DivisionCard 
                key={division} 
                division={division} 
                divisionTeams={divisionTeams} 
              />
            ))}
          </div>

          {/* NFC Divisions - Right Side */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-center mb-4">NFC</h2>
            {nfcDivisionsData.map(([division, divisionTeams]) => (
              <DivisionCard 
                key={division} 
                division={division} 
                divisionTeams={divisionTeams} 
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
