// src/pages/NFL/Teams.tsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { NFLNavigation } from '@/components/NFLNavigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ExternalLink } from 'lucide-react';
import { ProviderFactory } from '@/providers/ProviderFactory';
import { Team } from '@/types/teams';

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
        setTeams(teamsData);
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

  // Group teams by division
  const divisions = teams.reduce((acc, team) => {
    const division = team.division || 'Other';
    if (!acc[division]) {
      acc[division] = [];
    }
    acc[division].push(team);
    return acc;
  }, {} as Record<string, Team[]>);

  // Sort divisions
  const sortedDivisions = Object.entries(divisions).sort(([a], [b]) => {
    const order = ['AFC East', 'AFC North', 'AFC South', 'AFC West', 'NFC East', 'NFC North', 'NFC South', 'NFC West'];
    return order.indexOf(a) - order.indexOf(b);
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <NFLNavigation />
      
      <div className="container mx-auto px-4 py-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">NFL Teams</h1>
          <p className="text-muted-foreground">Team information, depth charts, and stats from ESPN</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sortedDivisions.map(([division, divisionTeams]) => (
            <Card key={division}>
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
                          <div className="text-sm text-muted-foreground">{team.abbreviation}</div>
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
          ))}
        </div>
      </div>
    </div>
  );
};
