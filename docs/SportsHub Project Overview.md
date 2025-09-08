# SportsHub Project Overview

## Overview
A modern, mobile-first NFL picks app for Brady and Jenny to compete in weekly outright winner predictions. Features strategic pick reveals, live scores from ESPN API, betting odds from The Odds API, and clean Fox Sports-inspired design.

## Tech Stack
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Firebase Auth + Firestore
- **Deployment**: Netlify
- **Domain**: sportshub.theespeys.com
- **Data**: ESPN API (scores), The Odds API (betting lines), Real-time data only
- **Live Data**: 5-minute auto-sync for scores and odds during games

## Project Structure
```
/Users/brady/Projects/SportsHub/
├── src/                    # Source code
│   ├── components/         # Reusable UI components
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utilities and Firebase config
│   ├── pages/             # Route components
│   ├── providers/         # Data provider implementations
│   └── types/             # TypeScript type definitions
├── docs/                  # Documentation
├── scripts/               # Data seeding scripts
├── .env                   # Environment variables (local)
└── firestore.rules        # Firestore security rules
```

## Setup Steps

### 1. Environment Setup
```bash
# Clone repository
git clone https://github.com/bradyespey/sports-hub.git
cd sports-hub

# Install dependencies
npm install
```

### 2. Environment Variables
```bash
# Copy template and configure
cp .env.example .env
# Edit .env with Firebase config values
```

**Required Variables:**
```env
VITE_FIREBASE_API_KEY=AIzaSyAlYHZM0CoBiy38EM0JijMJKzxHUMPHGTE
VITE_FIREBASE_AUTH_DOMAIN=sportshub-9dad7.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=sportshub-9dad7
VITE_FIREBASE_STORAGE_BUCKET=sportshub-9dad7.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=926541191216
VITE_FIREBASE_APP_ID=1:926541191216:web:2c4813b6f829339472b5f5
VITE_ALLOWED_EMAILS=baespey@gmail.com,jennycespey@gmail.com
VITE_ODDS_API_KEY=b5eb9f22e89c5f32def183d66bea0a7e
```

### 3. Firebase Setup
- **Project Name**: SportsHub
- **Project ID**: sportshub-9dad7
- **Region**: us-south1 (Dallas)
- **Configuration**: Google Auth + Firestore
- **Domains**: localhost:8080, espeysportshub.netlify.app, sportshub.theespeys.com

### 4. Development
```bash
# Start development server
npm run dev
# App runs at http://localhost:8080
```

### 5. Deployment
- **Repository**: https://github.com/bradyespey/sports-hub
- **Netlify Site**: espeysportshub
- **Domain**: sportshub.theespeys.com
- **Build Command**: npm run build
- **Environment Variables**: Mirrored from .env

## Code Base Details

### Core Components
#### `src/lib/firebase.ts`
- **Purpose**: Firebase configuration and initialization
- **Features**: Environment variable validation, auth setup, Firestore connection
- **Dependencies**: Firebase SDK v12.2.1

#### `src/hooks/useAuth.ts`
- **Purpose**: Authentication state management
- **Features**: Google sign-in, user session handling
- **State Management**: React context for auth state

#### `src/providers/ProviderFactory.ts`
- **Purpose**: Data provider abstraction layer
- **Features**: Mock/HTTP provider switching, API integration
- **Dependencies**: Provider pattern implementation

#### `src/pages/CurrentWeek.tsx`
- **Purpose**: Main game display and pick submission
- **Features**: Week selector, game sorting (Live/Upcoming/Finished), pick management
- **State Management**: Local state for games, picks, and pending selections

#### `src/components/GameCard.tsx`
- **Purpose**: Individual game display with picks
- **Features**: Compact layout, live indicators, pick selection, win/loss highlighting
- **Dependencies**: Team logos, score display, pick reveal logic

#### `src/components/WeekSelector.tsx`
- **Purpose**: Week navigation dropdown
- **Features**: Previous/next buttons, week labels, dynamic week loading
- **Dependencies**: Week data from Firestore

#### `src/components/Standings.tsx`
- **Purpose**: Weekly and season standings display
- **Features**: Win/loss tracking, pick accuracy, opponent comparison
- **Dependencies**: Game results and pick data

### Key Features
- **Weekly NFL Picks**: Pick outright winners for each game
- **Strategic Reveal**: See opponent picks only after both submit AND game starts
- **Live Scores**: Real-time game updates and standings
- **Spread Context**: View betting lines for informed picks
- **Mobile First**: Responsive design optimized for phones
- **Google Auth**: Secure authentication with email allowlist
- **Professional URLs**: Clean routing structure (/nfl/scoreboard, /nfl/teams, /nfl/standings)
- **Game Sorting**: Yahoo-style organization (Live, Upcoming, Finished)
- **Real Data Integration**: Live scores and odds from external APIs
- **Theme Support**: Light/dark/system theme with persistent user preference

## Current Status

### ✅ Completed
- **Repository Setup**: Cloned and configured locally
- **Firebase Configuration**: Project created with Google Auth + Firestore
- **Environment Variables**: Local .env configured with Firebase credentials
- **Netlify Deployment**: Connected to GitHub with custom domain
- **DNS Configuration**: Cloudflare CNAME pointing to Netlify
- **Development Server**: Running locally on localhost:8080
- **Firestore Rules**: Updated to production-ready security rules
- **Authentication Testing**: Google Auth flow working locally and production
- **API Integration**: The Odds API integration with real data
- **Data Seeding**: Week 1 picks seeded for Brady and Jenny
- **UI/UX Improvements**: Compact layout, live indicators, game sorting
- **Professional URLs**: Implemented /nfl/scoreboard, /nfl/teams structure
- **Real Scores**: Live score integration with actual game results
- **Pick System**: Complete pick submission and reveal logic
- **Team Logos**: ESPN logo integration with fallback system
- **Week Navigation**: Functional week selector with dynamic data loading
- **Fox Sports Navigation**: Added Scores/Teams/Standings navigation tabs (kept original scoreboard design)
- **Standings Page**: Moved standings to dedicated /nfl/standings route
- **Theme System**: Added light/dark/system theme toggle with local storage persistence
- **Navigation Consistency**: Added NFL navigation tabs to all pages (Scores, Teams, Standings)
- **Fox Sports Layout**: Redesigned GameCard to match Fox Sports compact horizontal layout
- **Responsive Grid**: Adaptive grid showing 1-2 cards on mobile, 3-4 on desktop
- **Fox Sports Styling**: Added divider lines, larger logos, improved odds display
- **Inline Picks**: Moved Brady/Jenny picks to display next to each team for cleaner layout
- **Clean Game Layout**: Team logo + name + score + pick name format with vertical divider
- **Live API Integration**: ESPN scores and The Odds API betting lines with auto-sync
- **Fox Sports Design**: Clean horizontal cards matching Fox Sports layout exactly
- **Separate Pick Badges**: Brady and Jenny picks displayed as individual badges side by side
- **Real-Time Data**: Live scores and odds working for 2025 NFL season
- **Enhanced Live Display**: Quarter, time remaining, and possession with football emoji
- **Team Abbreviation Normalization**: Fixed Washington (WSH→WAS) and other team name mismatches
- **Full Team Names**: Changed from abbreviations (DAL) to full names (Cowboys) throughout app
- **Sticky Navigation**: NFL nav bar and week selector stay fixed at top when scrolling
- **Optimized Card Layout**: Redesigned cards to fit 4 per row with better spacing and no text truncation
- **Standings Functionality**: Fixed standings to show real win/loss data with proper names (Brady/Jenny)
- **Local Timezone Support**: Game times display in user's local timezone with CST fallback
- **Navigation Reorder**: Moved Standings before Teams in navigation bar
- **Smart Odds Management**: Auto-loads real odds for unstarted games with 5-minute caching
- **Manual Odds Refresh**: Refresh button only updates unstarted games for current week
- **TV Network Display**: Fixed duplicate TV network information display
- **Real Data Only**: App now uses only real-time data from external APIs
- **Sticky Navigation**: Week selector and refresh button stay fixed when scrolling
- **Efficient API Usage**: 2 credits per refresh call, cached to prevent redundant requests
- **Cost-Optimized Odds**: Reduced from 3 to 1 credit per call by fetching only spreads market
- **Perfect Team Matching**: All 16 games now match correctly between ESPN and Odds API
- **Spread-Only Display**: Shows `[Team] [+/-][Spread] TV: [Network]` format as requested
- **Server-Side Caching**: ESPN API calls cached for 30 minutes to prevent abuse
- **Client-Side Caching**: Schedule data cached 30 min, live scores 30 sec
- **Improved Pick UX**: Auto-save picks with immediate visual feedback, removed bottom submit bar
- **Consistent Odds Display**: Always shows favored team with negative spread for clarity
- **Smart Pick Reveals**: Picks only revealed after kickoff AND both players submit
- **Mobile-Optimized Pick Buttons**: Larger touch targets and responsive design

### 🔄 In Progress
- **Mobile Optimization**: Fine-tuning responsive design

### ❌ Not Started
- **Fantasy Integration**: Sleeper/Yahoo fantasy widgets
- **NCAAF Support**: College football league support
- **Multi-User Support**: Expand beyond Brady and Jenny
- **Advanced Statistics**: Historical data and analytics

## Technical Challenges & Solutions

### 1. Firebase Configuration
**Problem**: Environment variables blocked by gitignore
**Solution**: Used sed commands to update .env file with actual Firebase config
**Status**: Resolved

### 2. Netlify Build Configuration
**Problem**: Build command set to `bun run build` instead of `npm run build`
**Solution**: Updated to use npm build command
**Status**: Resolved

### 3. Team Logo Loading
**Problem**: via.placeholder.com errors and missing logos
**Solution**: Implemented ESPN logo CDN with fallback to ui-avatars.com
**Status**: Resolved

### 4. Data Seeding Issues
**Problem**: Firestore permission errors during seeding
**Solution**: Temporary rule relaxation for seeding, then restored security
**Status**: Resolved

### 5. Game Sorting and Layout
**Problem**: Games not sorted like professional sports sites
**Solution**: Implemented Yahoo-style sorting (Live, Upcoming, Finished) with proper indicators
**Status**: Resolved

### 6. Odds Data Management
**Problem**: Odds data not persisting on page refresh, duplicate TV network display, excessive API usage
**Solution**: Implemented smart odds loading with caching, fixed TV display logic, added manual refresh for unstarted games only
**Status**: Resolved

### 7. The Odds API Integration
**Problem**: 401/422 errors, incorrect week filtering, high API usage costs, incomplete team matching
**Solution**: Removed date filtering, added proper error handling, implemented comprehensive team name mapping, optimized to spreads-only (1 credit vs 3)
**Status**: Resolved

### 8. ESPN/Odds API Team Matching
**Problem**: Only 7 of 16 games matching due to team name differences (GB vs Green Bay Packers)
**Solution**: Comprehensive team name mapping with full names, abbreviations, and city variations
**Status**: Resolved

### 9. Pick Selection UX Issues
**Problem**: Intrusive bottom submit bar, picks not persisting on refresh, inconsistent odds display, premature pick reveals
**Solution**: Implemented auto-save with immediate visual feedback, removed bottom bar, added top save button, fixed odds to always show favored team, corrected reveal logic to require both kickoff AND both players picking
**Status**: Resolved

## Next Steps

### Immediate (Next Session)
1. **Live Data Sync**: Implement real-time score updates during games
2. **Mobile Testing**: Test and optimize mobile experience
3. **Error Handling**: Add comprehensive error handling for API failures

### Short Term
1. **Fantasy Integration**: Add Sleeper fantasy widget showing Brady vs Jenny matchup
2. **NCAAF Support**: Add college football league support
3. **Advanced UI**: Add game highlights and better visual feedback
4. **Data Validation**: Add input validation and error states

### Long Term
1. **Multi-User Support**: Expand beyond Brady and Jenny
2. **Other Leagues**: Add support for NBA, MLB, etc.
3. **Advanced Features**: Statistics, historical data, pick accuracy tracking
4. **Admin Panel**: Add admin controls for game management

## Dependencies & Versions

### Core Dependencies
```json
{
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "firebase": "^12.2.1",
  "react-router-dom": "^6.30.1",
  "vite": "^5.4.19",
  "typescript": "^5.8.3",
  "tailwindcss": "^3.4.17",
  "@tanstack/react-query": "^5.0.0",
  "lucide-react": "^0.400.0",
  "dayjs": "^1.11.0",
  "dotenv": "^16.4.5"
}
```

## API Integration Points

### Firebase API
- **Authentication**: Google OAuth
- **Database**: Firestore NoSQL
- **Features**: User management, data persistence

### The Odds API
- **Endpoint**: `/v4/sports/americanfootball_nfl/odds`
- **Authentication**: API key (500 requests/month free tier)
- **Usage**: Spreads only (1 credit per call) for cost optimization
- **Capabilities**: Real-time NFL betting spreads with comprehensive team matching

### ESPN API
- **Endpoint**: `/apis/site/v2/sports/football/nfl/scoreboard`
- **Authentication**: None required
- **Caching**: 30 minutes for schedule, 30 seconds for live scores
- **Capabilities**: Live game scores, schedules, team logos

## Data Sources

### Real-Time Data Only
The app now uses only real-time data from external APIs:
- Requires valid API keys for odds and scores
- Real-time data from external providers
- Configure CDN for team logos
- If data is unavailable, fields will be blank rather than showing placeholder data

## Security

- **Authentication**: Google OAuth with email allowlist
- **Firestore Rules**: User isolation and read/write permissions
- **Pick Reveals**: Server-enforced logic prevents early reveals
- **API Keys**: Environment variables only (never in source code)

## Scripts

```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run preview          # Preview production build
npm run seed:week1-picks # Seed Week 1 picks data
```

## Cost Considerations
- **Firebase**: Free tier (generous limits for 1-2 users)
- **Netlify**: Free tier (100GB bandwidth/month)
- **Cloudflare**: Free tier (unlimited bandwidth)
- **The Odds API**: Free tier (500 requests/month)

## Troubleshooting

### Common Issues
1. **Environment Variables Not Loading**: Check VITE_ prefix and Netlify configuration
2. **Firebase Auth Errors**: Verify authorized domains in Firebase Console
3. **Build Failures**: Ensure all dependencies installed and TypeScript compiles
4. **Logo Loading Errors**: Check ESPN CDN availability and fallback system
5. **Pick Submission Errors**: Verify Firestore rules and user authentication

### Debug Tools
- **Browser DevTools**: Console errors and network requests
- **Firebase Console**: Authentication and Firestore logs
- **Netlify Dashboard**: Build logs and deployment status

## Contact & Resources
- **GitHub**: https://github.com/bradyespey/sports-hub
- **Live Site**: https://sportshub.theespeys.com
- **Firebase Project**: sportshub-9dad7
- **Netlify Site**: espeysportshub
- **The Odds API**: https://the-odds-api.com/