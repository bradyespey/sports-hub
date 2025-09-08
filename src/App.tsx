import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthGuard } from "@/components/AuthGuard";
import { ThemeProvider } from "@/components/ThemeProvider";
import { CurrentWeek } from "@/pages/CurrentWeek";
import { NFLIndex } from "@/pages/NFL/Index";
import { NFLScoreboard } from "@/pages/NFL/Scoreboard";
import { NFLTeams } from "@/pages/NFL/Teams";
import { NFLTeamDetail } from "@/pages/NFL/TeamDetail";
import { NFLStandings } from "@/pages/NFL/Standings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="sportshub-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthGuard>
            <Routes>
              {/* Root redirects to NFL */}
              <Route path="/" element={<Navigate to="/nfl" replace />} />
              
              {/* NFL Routes */}
              <Route path="/nfl" element={<NFLIndex />} />
              <Route path="/nfl/scoreboard" element={<NFLScoreboard />} />
              <Route path="/nfl/teams" element={<NFLTeams />} />
              <Route path="/nfl/teams/:teamId" element={<NFLTeamDetail />} />
              <Route path="/nfl/schedule" element={<NFLScoreboard />} /> {/* Same as scoreboard for now */}
              <Route path="/nfl/standings" element={<NFLStandings />} />
              
              {/* Legacy route for backward compatibility */}
              <Route path="/current-week" element={<CurrentWeek />} />
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthGuard>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
