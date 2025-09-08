// src/components/NFLNavigation.tsx
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

export const NFLNavigation = () => {
  const location = useLocation();

  const navItems = [
    { label: 'SCORES', path: '/nfl/scoreboard' },
    { label: 'STANDINGS', path: '/nfl/standings' },
    { label: 'TEAMS', path: '/nfl/teams' },
  ];

  return (
    <div className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <nav className="flex space-x-8">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "py-4 px-2 text-sm font-semibold border-b-2 transition-colors",
                location.pathname === item.path
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
