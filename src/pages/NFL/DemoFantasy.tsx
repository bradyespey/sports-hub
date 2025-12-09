import { Header } from '@/components/Header';
import { NFLNavigation } from '@/components/NFLNavigation';
import { WeekSelector } from '@/components/WeekSelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { getCurrentNFLWeek } from '@/lib/dayjs';
import { useState } from 'react';

export const DemoFantasy = () => {
  const [selectedWeek, setSelectedWeek] = useState(getCurrentNFLWeek());
  const availableWeeks = Array.from({ length: 18 }, (_, i) => i + 1);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <NFLNavigation />

      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-blue-500 text-blue-600">
              Demo Mode
            </Badge>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Sample fantasy matchup and league view for <span className="font-semibold">User 1</span>{' '}
              vs <span className="font-semibold">User 2</span>.
            </p>
          </div>
        </div>

        {/* Week Selector */}
        <div className="mb-4 flex items-center justify-center gap-4">
          <WeekSelector
            currentWeek={selectedWeek}
            onWeekChange={setSelectedWeek}
            availableWeeks={availableWeeks}
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="matchup" className="space-y-6">
          <TabsList className="grid grid-cols-3 max-w-lg mx-auto">
            <TabsTrigger value="matchup">Matchup</TabsTrigger>
            <TabsTrigger value="league">League</TabsTrigger>
            <TabsTrigger value="team">My Team</TabsTrigger>
          </TabsList>

          <TabsContent value="matchup">
            <div className="space-y-4 max-w-5xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle>Week {selectedWeek} Matchup</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 items-center">
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-lg bg-gradient-primary mx-auto mb-2" />
                      <p className="font-semibold">User 1</p>
                      <p className="text-xs text-muted-foreground">4-1-0 | 2nd</p>
                      <p className="text-2xl font-bold mt-1">112.4</p>
                      <p className="text-xs text-muted-foreground">Proj: 118.7</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-muted-foreground">VS</p>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-lg bg-muted mx-auto mb-2" />
                      <p className="font-semibold">User 2</p>
                      <p className="text-xs text-muted-foreground">2-3-0 | 8th</p>
                      <p className="text-2xl font-bold mt-1">98.1</p>
                      <p className="text-xs text-muted-foreground">Proj: 104.3</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Starters (Demo)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1.5">
                    {[
                      { pos: 'QB', name: 'J. Allen', team: 'BUF', pts: 28.4, proj: 26.1 },
                      { pos: 'RB', name: 'C. McCaffrey', team: 'SF', pts: 24.7, proj: 22.3 },
                      { pos: 'WR', name: 'J. Jefferson', team: 'MIN', pts: 19.3, proj: 18.0 },
                      { pos: 'TE', name: 'T. Kelce', team: 'KC', pts: 16.1, proj: 15.4 },
                    ].map((p) => (
                      <div
                        key={p.pos}
                        className="flex items-center p-2.5 rounded-lg border bg-card"
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <span className="font-mono text-xs font-semibold w-10 text-center bg-primary/10 rounded px-1.5 py-0.5">
                            {p.pos}
                          </span>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{p.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {p.team} • Starter
                            </p>
                          </div>
                        </div>
                        <div className="text-right text-sm ml-4">
                          <p className="font-bold">{p.pts.toFixed(1)}</p>
                          <p className="text-xs text-muted-foreground">
                            Proj: {p.proj.toFixed(1)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="league">
            <Card>
              <CardHeader>
                <CardTitle>Week {selectedWeek} League Matchups (Demo)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  This is a demo view showing how league matchups are displayed. Real league and team
                  names are hidden in demo mode.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team">
            <Card>
              <CardHeader>
                <CardTitle>User 1 Roster (Demo)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  In the live app, this tab shows your full fantasy roster with live and projected
                  points for each player. Demo mode hides real league data but keeps the layout so you
                  can see how it works.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}


