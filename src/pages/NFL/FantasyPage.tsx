import { useAuth } from '@/hooks/useAuth';
import { NFLFantasy } from './Fantasy';
import { DemoFantasy } from './DemoFantasy';

export const NFLFantasyPage = () => {
  const { user } = useAuth();

  if (!user) {
    return <DemoFantasy />;
  }

  return <NFLFantasy />;
};
