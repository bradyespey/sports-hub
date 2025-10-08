// src/components/NFLNavigation.tsx
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { getCurrentNFLWeek } from '@/lib/dayjs';
import { FantasyProviderFactory } from '@/providers/fantasy/FantasyProviderFactory';

interface NFLNavigationProps {
  onScoresClick?: () => void;
}

export const NFLNavigation = ({ onScoresClick }: NFLNavigationProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const fantasyEnabled = FantasyProviderFactory.isEnabled();

  const handleScoresClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // Always navigate to current week when clicking Scores
    if (location.pathname === '/nfl/scoreboard') {
      // If already on scores page, call the reset function
      onScoresClick?.();
    } else {
      navigate('/nfl/scoreboard');
    }
  };

  const navItems = [
    { label: 'SCORES', path: '/nfl/scoreboard', onClick: handleScoresClick },
    ...(fantasyEnabled ? [{ label: 'FANTASY', path: '/nfl/fantasy' }] : []),
    { label: 'STANDINGS', path: '/nfl/standings' },
    { label: 'TEAMS', path: '/nfl/teams' },
  ];

  const isActive = (path: string) => {
    if (path === '/nfl/teams') {
      // For teams, match both /nfl/teams and /nfl/teams/[teamId]
      return location.pathname === path || location.pathname.startsWith(path + '/');
    }
    return location.pathname === path;
  };

  return (
    <div className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <nav className="flex space-x-8">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={item.onClick}
              className={cn(
                "py-4 px-2 text-sm font-semibold border-b-2 transition-colors",
                isActive(item.path)
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
};
