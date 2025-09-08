// src/pages/NFL/Teams.tsx
import { Header } from '@/components/Header';
import { NFLNavigation } from '@/components/NFLNavigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const NFLTeams = () => {
  const teams = [
    { name: 'Arizona Cardinals', abbr: 'ARI', division: 'NFC West' },
    { name: 'Atlanta Falcons', abbr: 'ATL', division: 'NFC South' },
    { name: 'Baltimore Ravens', abbr: 'BAL', division: 'AFC North' },
    { name: 'Buffalo Bills', abbr: 'BUF', division: 'AFC East' },
    { name: 'Carolina Panthers', abbr: 'CAR', division: 'NFC South' },
    { name: 'Chicago Bears', abbr: 'CHI', division: 'NFC North' },
    { name: 'Cincinnati Bengals', abbr: 'CIN', division: 'AFC North' },
    { name: 'Cleveland Browns', abbr: 'CLE', division: 'AFC North' },
    { name: 'Dallas Cowboys', abbr: 'DAL', division: 'NFC East' },
    { name: 'Denver Broncos', abbr: 'DEN', division: 'AFC West' },
    { name: 'Detroit Lions', abbr: 'DET', division: 'NFC North' },
    { name: 'Green Bay Packers', abbr: 'GB', division: 'NFC North' },
    { name: 'Houston Texans', abbr: 'HOU', division: 'AFC South' },
    { name: 'Indianapolis Colts', abbr: 'IND', division: 'AFC South' },
    { name: 'Jacksonville Jaguars', abbr: 'JAX', division: 'AFC South' },
    { name: 'Kansas City Chiefs', abbr: 'KC', division: 'AFC West' },
    { name: 'Las Vegas Raiders', abbr: 'LV', division: 'AFC West' },
    { name: 'Los Angeles Chargers', abbr: 'LAC', division: 'AFC West' },
    { name: 'Los Angeles Rams', abbr: 'LAR', division: 'NFC West' },
    { name: 'Miami Dolphins', abbr: 'MIA', division: 'AFC East' },
    { name: 'Minnesota Vikings', abbr: 'MIN', division: 'NFC North' },
    { name: 'New England Patriots', abbr: 'NE', division: 'AFC East' },
    { name: 'New Orleans Saints', abbr: 'NO', division: 'NFC South' },
    { name: 'New York Giants', abbr: 'NYG', division: 'NFC East' },
    { name: 'New York Jets', abbr: 'NYJ', division: 'AFC East' },
    { name: 'Philadelphia Eagles', abbr: 'PHI', division: 'NFC East' },
    { name: 'Pittsburgh Steelers', abbr: 'PIT', division: 'AFC North' },
    { name: 'Seattle Seahawks', abbr: 'SEA', division: 'NFC West' },
    { name: 'San Francisco 49ers', abbr: 'SF', division: 'NFC West' },
    { name: 'Tampa Bay Buccaneers', abbr: 'TB', division: 'NFC South' },
    { name: 'Tennessee Titans', abbr: 'TEN', division: 'AFC South' },
    { name: 'Washington Commanders', abbr: 'WAS', division: 'NFC East' }
  ];

  const divisions = teams.reduce((acc, team) => {
    if (!acc[team.division]) {
      acc[team.division] = [];
    }
    acc[team.division].push(team);
    return acc;
  }, {} as Record<string, typeof teams>);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <NFLNavigation />
      
      <div className="container mx-auto px-4 py-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">NFL Teams</h1>
          <p className="text-muted-foreground">Team information, depth charts, and stats</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(divisions).map(([division, divisionTeams]) => (
            <Card key={division}>
              <CardHeader>
                <CardTitle className="text-lg">{division}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {divisionTeams.map(team => (
                    <div key={team.abbr} className="flex items-center space-x-2 p-2 hover:bg-muted rounded">
                      <span className="font-medium">{team.abbr}</span>
                      <span className="text-sm text-muted-foreground">{team.name}</span>
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
