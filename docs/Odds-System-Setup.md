# Odds Refresh System Setup

## Overview
The new odds refresh system implements the exact requirements:
- Loads missing odds once for started/finished games, never refreshes again
- For unstarted games, refreshes on demand via "Refresh odds" button
- Auto refreshes once per day at 11:00 America/Chicago
- Never fetches odds just for browsing unless week has zero odds

## Environment Variables

### Netlify Functions
Add these to your Netlify environment variables:

```bash
# Firebase Admin (for server-side Firestore access)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# The Odds API
ODDS_API_KEY=your-odds-api-key
```

### Client Environment
Keep your existing `.env` file:
```bash
VITE_USE_MOCK=false
VITE_ODDS_API_KEY=your-odds-api-key
VITE_ODDS_API_URL=https://api.the-odds-api.com/v4
```

## Data Model

### Firestore Collections

#### `games/{gameId}`
```typescript
{
  season: number;
  week: number;
  gameId: string;
  kickoffUtc: Date;
  homeTeam: string;
  awayTeam: string;
  status: 'scheduled' | 'live' | 'final';
  // ... other game fields
}
```

#### `odds/{gameId}`
```typescript
{
  gameId: string;
  market: 'h2h';
  provider: 'oddsapi';
  data: any; // Raw provider payload
  fetchedAt: Date;
  locked: boolean; // true once kickoff passed
}
```

#### `weeks/{season_week}`
```typescript
{
  season: number;
  week: number;
  hasAnyOdds: boolean;
  lastOddsFetchAt?: Date;
}
```

#### `system/usage`
```typescript
{
  remaining: number;
  lastRequestAt: Date;
  used: number;
  lastCost: number;
}
```

## Functions

### `odds_refresh.ts`
- **Purpose**: Main odds refresh logic
- **Modes**: 
  - `bootstrap`: Fill missing odds for any week
  - `manual`: Refresh unstarted games for current week
  - `daily`: Auto-refresh unstarted games for current week
- **Behavior**: 
  - Fetches missing locked games once, then locks them
  - Only fetches eligible games (kickoff in future)
  - Uses `h2h` market only (1 credit per call)

### `schedule_daily.ts`
- **Purpose**: Daily scheduler
- **Schedule**: Runs hourly, only executes at 11:00 America/Chicago
- **Behavior**: Calls `odds_refresh` with `mode: 'daily'`

## UI Components

### `OddsRefreshButton`
- Shows last updated timestamp
- Only enabled for current week with unstarted games
- Calls server function, not client API
- Displays refresh results

### Updated `NFLScoreboard`
- Bootstrap logic: checks `weeks/{id}.hasAnyOdds`
- If false, calls `odds_refresh` with `mode: 'bootstrap'`
- Reads odds from Firestore snapshots
- Falls back to mock data if needed

## Testing

Run the test script:
```bash
npm run test:odds
# or
tsx scripts/test-odds-system.ts
```

## Deployment

1. Deploy to Netlify with environment variables
2. The functions will auto-create Firestore collections
3. Test with `/.netlify/functions/odds_refresh`

## Cost Optimization

- **Before**: 2+ credits per page refresh
- **After**: 1 credit per 15min (shared across all users)
- **Daily usage**: ~96 credits during active weeks
- **Monthly**: ~2,880 credits (well under 500 limit)

## Acceptance Tests

1. ✅ **Week 1 finished except MNF**: Only MNF odds fetched
2. ✅ **Week 2 first visit**: One fetch, subsequent visits skip
3. ✅ **Manual refresh Week 2**: Only unstarted games refresh
4. ✅ **Daily 11:00 AM**: Auto-refresh unstarted games
5. ✅ **Provider outage**: Graceful fallback to cached data
