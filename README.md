# SportsHub

**Scope**: This README replaces prior selected overview docs

## Overview

A modern, mobile-first NFL picks application enabling Brady and Jenny to compete in weekly outright winner predictions. Features strategic pick reveals, live scores from ESPN API, betting odds from The Odds API, Yahoo Fantasy Football integration, automated daily updates via GitHub Actions, and a clean Fox Sports-inspired design with comprehensive team depth charts, real-time standings calculation, and NFL tiebreaking procedures.

Now features a **Public Demo Mode** that allows visitors to explore the full application functionality with real-time data but mocked user information.

## Live and Admin

- **App URL**: https://sportshub.theespeys.com
- **Hosting**: Netlify with auto-deploy from GitHub
- **Firebase Console**: https://console.firebase.google.com/project/sportshub-9dad7
- **Netlify Dashboard**: https://app.netlify.com/sites/espeysportshub
- **The Odds API**: https://the-odds-api.com/account (500 credits/month free)
- **GitHub Actions**: Automated daily odds refresh at 2 AM CDT + weekly database backup (Friday 12:00 AM CT)

## Features & Demo Mode

### Public Demo Mode
Visitors can access the site without logging in to experience the full UI:
- **Real-Time Data**: Uses realistic mock NFL schedules with proper team abbreviations for logo display
- **Privacy First**: Masks real user identities as "User 1" and "User 2"
- **Mock Interaction**: "User 1" (visitor) can make local-only picks to test the interface, while "User 2" (opponent) has pre-filled mock picks
- **Full Scope**: Includes demo versions of the Scoreboard (16 games with Live/Upcoming/Final statuses), Standings, and Fantasy pages
- **Team Logos**: All team logos display correctly using standard NFL abbreviations (BAL, KC, PHI, etc.)

### Core Features
- **Strategic Picks**: Picks are hidden until kickoff or until both users have picked.
- **Live Updates**: Real-time scores and game status.
- **Playoff Scoring**: Weighted scoring system for postseason games:
  - Regular season (Weeks 1-18): 1 point per correct pick
  - Wild Card, Divisional, Conference (Weeks 19-21): 2 points per correct pick
  - Super Bowl (Week 22): 3 points per correct pick
- **Yahoo Fantasy**: Integrated fantasy football roster and matchup viewing.
- **Depth Charts**: Detailed team rosters and depth charts.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Firebase Auth + Firestore + Netlify Functions
- **APIs**: ESPN API (scores/teams), The Odds API (betting lines), Yahoo Fantasy API
- **Deployment**: Netlify with continuous integration
- **Automation**: GitHub Actions for daily odds refresh
- **Domain**: sportshub.theespeys.com via Cloudflare DNS

## Quick Start

```bash
git clone https://github.com/bradyespey/sports-hub.git
cd SportsHub
npm install

# Install 1Password CLI (if not already installed)
brew install --cask 1password-cli

# Set up 1Password Environment (see Environment section below)
npm run dev
```

Open `http://localhost:5178` (Vite dev server) or `http://localhost:8888` (Netlify dev with functions).

## Environment

**All projects use 1Password Developer Environments for local environment variables.** This allows seamless setup on any computer without managing local `.env` files.

### 1Password Setup

1. **Enable 1Password Developer**:
   - Open 1Password desktop app
   - Settings → Developer → Turn on "Show 1Password Developer experience"

2. **Create Environment**:
   - Go to Developer → Environments (Espey Family account)
   - Create new environment: `SportsHub`
   - Import `.env` file or add variables manually

3. **Install 1Password CLI**:
   ```bash
   brew install --cask 1password-cli
   ```

4. **Run Project**:
   ```bash
   npm run dev
   ```
   - The `dev` script uses `op run --env-file=.env -- vite` to automatically load variables from 1Password
   - No local `.env` file needed

### Required Environment Variables

All variables should be stored in your 1Password Environment:

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=YOUR_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=sportshub-9dad7.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=sportshub-9dad7
VITE_FIREBASE_STORAGE_BUCKET=sportshub-9dad7.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID
VITE_FIREBASE_APP_ID=YOUR_APP_ID

# Authentication
VITE_ALLOWED_EMAILS=YOUR_EMAIL@gmail.com,PARTNER_EMAIL@gmail.com

# The Odds API (Free Tier)
VITE_ODDS_API_KEY=YOUR_ODDS_API_KEY
VITE_USE_MOCK=false

# Yahoo Fantasy Football
VITE_FANTASY_PROVIDER=yahoo
VITE_YAHOO_LEAGUE_ID=590446
VITE_YAHOO_TEAM_NAME=Espeys in the Endzone

# Netlify Functions (Server-side)
FIREBASE_PROJECT_ID=sportshub-9dad7
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@sportshub-9dad7.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n" # Single line with \n escapes
ODDS_API_KEY=YOUR_ODDS_API_KEY

# Yahoo OAuth (Get from https://developer.yahoo.com/apps/)
YAHOO_CLIENT_ID=YOUR_YAHOO_CLIENT_ID
YAHOO_CLIENT_SECRET=YOUR_YAHOO_CLIENT_SECRET
YAHOO_REFRESH_TOKEN=YOUR_YAHOO_REFRESH_TOKEN
YAHOO_REDIRECT_URI=http://localhost:8888/.netlify/functions/yahoo-auth-callback
```

**Note**: See `YAHOO_FANTASY_SETUP.md` for detailed Yahoo Fantasy integration setup instructions.

## Run Modes

- **Development**: `npm run dev` — Vite dev server at localhost:5173 (fast development)
- **Netlify Dev**: `npm run dev:netlify` — Full Netlify dev server with functions at localhost:8888
- **Production**: `npm run build` — Optimized build for deployment

## Scripts and Ops

- **Development**: `npm run dev` — Start Vite dev server (fast development)
- **Netlify Dev**: `npm run dev:netlify` — Start Netlify dev server with functions
- **Build**: `npm run build` — Create production build
- **Deploy & Watch**: `npm run deploy:watch` — Push to GitHub and monitor Netlify build
- **Seed Data**: `npm run seed:nfl2025` — Generate complete 2025 NFL season
- **Seed Picks**: `npm run seed:week1-picks` — Add Week 1 picks for Brady/Jenny
- **Generate Season**: `npm run generate:season` — Create NFL schedule data

### Daily Automation
- **GitHub Actions**: Runs daily at 2 AM CDT to refresh odds
- **Manual Refresh**: "Refresh Odds" button for current week unstarted games
- **API Optimization**: Uses h2h market only (1 credit vs 3 for multiple markets)

## Deploy

- **Repository**: https://github.com/bradyespey/sports-hub
- **Branch**: `main` triggers automatic Netlify deployment
- **Build Command**: `npm run build`
- **Publish Directory**: `dist`
- **Domain**: sportshub.theespeys.com via Cloudflare CNAME

Manual deploy: Push to GitHub `main` branch

## App Pages / Routes

- **/** — Redirects directly to Scores page
- **/nfl/scoreboard** — Main picks interface with live scores and odds (default landing page)
- **/nfl/fantasy** — Yahoo Fantasy Football team roster and matchups (when enabled)
- **/nfl/standings** — Weekly and season standings between Brady and Jenny
- **/nfl/teams** — Team directory with logos, divisions, records, win percentages, and depth chart links
- **/nfl/teams/:teamId** — Individual team depth charts (offense, defense, special teams)

### Navigation Features
- **Week Selector**: Navigate between NFL weeks with current week highlighting
- **Sticky Navigation**: NFL nav bar stays fixed when scrolling
- **Current Week Button**: Quick navigation back to current week from past/future weeks
- **Interactive Tooltips**: Click-only help tooltips on each page with page-specific guidance
- **Page Order**: Scores → Fantasy → Standings → Teams (reorganized for better UX)

### Team Records & Standings
- **Live Records**: Real-time team records displayed on Scores and Teams pages
- **Win Percentages**: Displayed alongside win-loss records using NFL tiebreaking calculations
- **NFL Tiebreaking**: Official NFL tiebreaking procedures for division standings
- **Preseason Handling**: Alphabetical sorting for 0-0 records before season starts
- **Conference Layout**: AFC divisions on left, NFC divisions on right
- **Division Order**: North → East → South → West within each conference
- **Playoff Scoring Display**: Standings page shows weighted points for playoff weeks with visual indicators (2x for playoffs, 3x for Super Bowl)

## Directory Map

```
SportsHub/
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── ui/            # shadcn/ui components
│   │   ├── GameCard.tsx   # Individual game display
│   │   ├── WeekSelector.tsx # Week navigation
│   │   └── Standings.tsx  # Win/loss tracking
│   ├── pages/
│   │   └── NFL/           # Route components
│   ├── providers/         # Data provider implementations
│   │   ├── http/          # ESPN/Odds API providers
│   │   └── fantasy/       # Sleeper/Yahoo integration
│   ├── lib/               # Firebase config, utilities, and NFL tiebreaking
│   └── types/             # TypeScript definitions
├── netlify/
│   └── functions/         # Server-side functions
│       ├── odds_refresh.ts # Odds fetching logic for manual refresh
│       ├── daily_odds.ts  # Scheduled automation (GitHub Actions)
│       ├── pulse.ts       # Real-time odds/scores monitoring with usage tracking
│       ├── schedule_daily.ts # Daily scheduled function for odds refresh
│       ├── yahoo-fantasy.ts # Yahoo Fantasy API proxy with caching
│       ├── yahoo-auth.ts  # Yahoo OAuth authentication flow
│       ├── yahoo-auth-callback.ts # Yahoo OAuth callback handler
│       └── yahoo-manual-token.ts # Yahoo token refresh utility
├── scripts/               # Data seeding and utilities
└── docs/                  # Project documentation (archived)
```

## Netlify Functions

The application uses 8 serverless functions for backend operations:

### Data Management Functions
- **`odds_refresh.ts`** — Manual odds refresh endpoint with caching logic
- **`daily_odds.ts`** — Scheduled automation triggered by GitHub Actions at 2 AM CDT
- **`pulse.ts`** — Real-time monitoring with API usage tracking and intelligent refresh intervals
- **`schedule_daily.ts`** — Daily scheduled function for automated odds refresh

### Yahoo Fantasy Integration Functions  
- **`yahoo-fantasy.ts`** — Main API proxy with caching, rate limiting, and error handling
- **`yahoo-auth.ts`** — OAuth authentication flow initiation
- **`yahoo-auth-callback.ts`** — OAuth callback handler for token exchange
- **`yahoo-manual-token.ts`** — Manual token refresh utility for development

### Function Features
- **Caching Strategy**: Firestore persistence for completed weeks (instant loading)
- **Rate Limiting**: Intelligent API usage tracking to stay within quotas
- **Error Handling**: Comprehensive error handling with fallback mechanisms
- **Authentication**: Secure OAuth flow with automatic token refresh
- **Monitoring**: Real-time usage tracking and performance metrics

## Troubleshooting

### Common Issues

1. **Environment Variables Not Loading**
   - Check VITE_ prefix for client-side variables
   - Verify Netlify environment variable configuration
   - Ensure Firebase service account JSON is properly formatted

2. **Netlify Functions 404 Errors**
   - Run `netlify dev` instead of `npm run dev:vite` for full functionality
   - Check function environment variables in Netlify dashboard
   - Verify Firebase Admin SDK credentials

3. **The Odds API Errors**
   - Check API key validity at https://the-odds-api.com/account
   - Monitor usage limits (500 credits/month free tier)
   - Verify h2h market parameter in API calls

4. **Firebase Auth Issues**
   - Add authorized domains in Firebase Console (localhost:8888, production URLs)
   - Check email allowlist in VITE_ALLOWED_EMAILS
   - Verify Google OAuth configuration

5. **Pick Submission/Reveal Issues**
   - Ensure both users submit picks before game kickoff
   - Check Firestore security rules for proper user isolation
   - Verify game status and kickoff times

6. **Yahoo Fantasy Integration Issues**
   - Verify Yahoo OAuth credentials are valid and not expired
   - Check league ID and team name match your Yahoo Fantasy league
   - Use manual token refresh at `http://localhost:8888/.netlify/functions/yahoo-manual-token`
   - Ensure `VITE_FANTASY_PROVIDER=yahoo` is set in environment variables

## Fantasy Football Integration

The app integrates with Yahoo Fantasy Football to display:
- Team roster with individual player fantasy points and detailed game statistics
- Live matchup scores during games
- All league matchups for the current week
- Player-by-player matchup comparison with stats display
- League-specific scoring calculations
- Rolling average projections based on historical performance
- Mobile-responsive matchup interface

**Setup**: See `YAHOO_FANTASY_SETUP.md` for complete integration instructions.

**Features**:
- Read-only access via Yahoo OAuth
- Automatic token refresh
- **Individual player fantasy points** calculated from league scoring settings
- **Detailed game statistics** (e.g., "283 Pass Yds, 2 Pass TD, 2 2-PT")
- Real-time stat updates during games
- Full PPR, Half PPR, or Standard scoring support
- **Smart rolling average projections** excluding zero-point weeks (bye weeks/injuries)
- **Intelligent historical data fetching** for mid-season pickups (fetches missing player data from API)
- **Firestore persistence** for completed weeks (instant loading)
- **Mobile-responsive design** with card-based layout for small screens
- Conditional display (only shows when `VITE_FANTASY_PROVIDER=yahoo`)

**Technical Details**: See `docs/FANTASY_SCORING_IMPLEMENTATION.md` for implementation details.

## Next Steps / Future Work

### 🏈 Advanced Features (Priority 3)
- **Fantasy Enhancements**: Historical matchups, league standings integration
- **NCAAF Support**: Add college football league support
- **Multi-User Support**: Expand beyond Brady and Jenny (future)

## Future Fantasy Enhancements

Possible additions if you want more features:
- Historical week matchups
- League standings integration
- Player add/drop notifications (would require write access)
- Projected vs actual points charts
- Integration with NFL Picks standings

## Documentation

All project documentation should be placed in the `/docs` subfolder for organization.

## AI Handoff

This is a React + TypeScript + Firebase application for NFL picks competition. Focus on the provider pattern for data abstraction, Netlify functions for server-side operations, and the strategic pick reveal logic. The app uses real-time data from ESPN and The Odds API with automated daily updates via GitHub Actions. Key components include GameCard for individual games, WeekSelector for navigation, and comprehensive team depth chart integration.
