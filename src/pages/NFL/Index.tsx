// src/pages/NFL/Index.tsx
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Users, BarChart3, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FantasyProviderFactory } from '@/providers/fantasy/FantasyProviderFactory';

export const NFLIndex = () => {
  const fantasyEnabled = FantasyProviderFactory.isEnabled();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">NFL</h1>
          <p className="text-muted-foreground">National Football League</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Trophy className="w-5 h-5" />
                <span>Scoreboard & Picks</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                View live scores, make picks, and track your progress against Jenny.
              </p>
              <div className="text-xs text-muted-foreground mb-4 space-y-1">
                <p>• Picks auto-save when selected</p>
                <p>• Change picks until kickoff</p>
                <p>• Reveals after both players pick + kickoff</p>
                <p>• Odds update daily + manual refresh available</p>
              </div>
              <Button asChild className="w-full">
                <Link to="/nfl/scoreboard">View Scoreboard</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5" />
                <span>Standings</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                League standings and playoff picture.
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link to="/nfl/standings">View Standings</Link>
              </Button>
            </CardContent>
          </Card>

          {fantasyEnabled && (
            <Card className="border-primary/50 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="w-5 h-5 text-primary" />
                  <span>Fantasy Football</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Espeys in the Endzone - Double Coverage League
                </p>
                <div className="text-xs text-muted-foreground mb-4 space-y-1">
                  <p>• View your team roster and stats</p>
                  <p>• Check live matchup scores</p>
                  <p>• See all league matchups</p>
                </div>
                <Button asChild variant="default" className="w-full">
                  <Link to="/nfl/fantasy">View Fantasy Team</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>Teams</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Team information, depth charts, and player stats.
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link to="/nfl/teams">View Teams</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
