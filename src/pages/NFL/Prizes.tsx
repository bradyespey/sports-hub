// src/pages/NFL/Prizes.tsx
import { Header } from '@/components/Header';
import { NFLNavigation } from '@/components/NFLNavigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Gift } from 'lucide-react';

type PrizeIdea = {
  title: string;
  description: string;
};

const prizeIdeas: PrizeIdea[] = [
  {
    title: "Winner's Choice Movie Night (Theater + Home)",
    description:
      'Winner picks 1 movie to see in theaters + 1 movie to watch at home (stream/rent). Must be used before next NFL season.',
  },
  {
    title: 'Takeout/DoorDash “No Questions Asked” Night',
    description:
      'Winner chooses the restaurant and the order. No cooking, no debating, no dishes.',
  },
  {
    title: 'Sleep-In Pass',
    description:
      'Winner gets to sleep in one morning while the other parent handles the baby wake-up routine.',
  },
  {
    title: 'Chore Coupon (Pick the chore)',
    description:
      'Winner assigns one unpleasant chore (trash, dishes, laundry, bottles, etc.) and the other does it that day.',
  },
  {
    title: 'At-Home “Date Night” Kit',
    description:
      'Winner picks a theme: pizza + dessert, charcuterie, or breakfast-for-dinner with candles/music at home.',
  },
  {
    title: 'Massage / Foot Rub Voucher',
    description:
      'A 20–30 minute at-home massage or foot rub session, scheduled on the winner’s timeline.',
  },
  {
    title: 'Coffee Run Week',
    description:
      'For 5 weekdays, the loser is on coffee duty (pickup or make the fancy version at home).',
  },
  {
    title: 'Streaming Control for a Week',
    description:
      'Winner picks what’s on TV for 7 nights (within reason), including the “what do you want to watch?” decision.',
  },
  {
    title: 'Baby-Free Hour (Home Edition)',
    description:
      'Winner gets 60 uninterrupted minutes to do anything at home: nap, game, bath, read, hobby, etc.',
  },
  {
    title: 'Small Treat / Upgrade',
    description:
      'Winner gets a small “upgrade” purchase (ex: new hoodie, AirTag, nice candle, fancy snacks) with a set budget.',
  },
];

export const NFLPrizes = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <NFLNavigation />

      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold">Prizes</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Fun, newborn-friendly prize ideas for season winners (or weekly side bets).
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Prize Ideas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {prizeIdeas.map((idea, idx) => (
              <div key={idea.title} className="rounded-md border p-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                    {idx + 1}
                  </div>
                  <div className="space-y-1">
                    <div className="font-semibold">{idea.title}</div>
                    <div className="text-sm text-muted-foreground">{idea.description}</div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

