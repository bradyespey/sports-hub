# SportsHub

A modern, mobile-first NFL picks app for Brady and Jenny to compete in weekly outright winner predictions.

## Features

- 🏈 **Weekly NFL Picks** - Pick outright winners for each game
- 🔒 **Strategic Reveal** - See opponent picks only after both submit AND game starts
- 📊 **Live Scores** - Real-time game updates and standings
- 🎯 **Spread Context** - View betting lines for informed picks
- 📱 **Mobile First** - Responsive design optimized for phones
- 🔐 **Google Auth** - Secure authentication with email allowlist
- 🏆 **Fantasy Widget** - Optional integration with Sleeper/Yahoo (coming soon)

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Firebase Auth + Firestore
- **Deployment**: Netlify
- **Data**: Real-time data from external APIs

## Local Development

1. **Clone and install**
   ```bash
   git clone https://github.com/bradyespey/sports-hub.git
   cd sports-hub
   npm install
   ```

2. **Environment setup**
   ```bash
   cp .env.example .env
   # Edit .env with your Firebase config and API keys
   ```

3. **Firebase setup**
   - Create Firebase project
   - Enable Authentication (Google provider)
   - Create Firestore database
   - Add authorized domains in Firebase Console

4. **Start development server**
   ```bash
   npm run dev
   ```

## Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_FIREBASE_API_KEY` | Yes | Firebase API key | `AIza...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Yes | Firebase auth domain | `project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Yes | Firebase project ID | `sportshub-9dad7` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Yes | Firebase storage bucket | `project.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Yes | Firebase sender ID | `123456789` |
| `VITE_FIREBASE_APP_ID` | Yes | Firebase app ID | `1:123:web:abc` |
| `VITE_ALLOWED_EMAILS` | Yes | Comma-separated allowed emails | `user1@gmail.com,user2@gmail.com` |
| `VITE_ODDS_API_URL` | No | Odds API endpoint | `https://api.provider.com/v1` |
| `VITE_ODDS_API_KEY` | Yes | Odds API key | `your_api_key` |
| `VITE_SCORES_API_URL` | No | Scores API endpoint | `https://api.provider.com/v1` |
| `VITE_SCORES_API_KEY` | No | Scores API key | `your_api_key` |
| `VITE_LOGO_CDN_BASE` | No | Team logos CDN | `https://cdn.com/logos` |
| `VITE_FANTASY_PROVIDER` | No | Fantasy provider (sleeper/yahoo) | `sleeper` |
| `VITE_FANTASY_LEAGUE_ID` | No** | Fantasy league ID | `123456789` |
| `VITE_FANTASY_TEAM_ID_BRADY` | No** | Brady's team ID | `1` |
| `VITE_FANTASY_TEAM_ID_JENNY` | No** | Jenny's team ID | `2` |

**Required when fantasy provider is enabled

## Deployment (Netlify)

1. **Connect GitHub repo** to Netlify
2. **Mirror environment variables** from .env to Netlify dashboard
3. **Add authorized domains** in Firebase Console:
   - `localhost:8080` (development)
   - `espeysportshub.netlify.app` (production)
   - `sportshub.theespeys.com` (custom domain)

### Current Configuration
- **Netlify Site**: espeysportshub
- **Custom Domain**: sportshub.theespeys.com
- **Firebase Project**: sportshub-9dad7
- **Build Command**: npm run build
- **Publish Directory**: dist

## Data Sources

### Real-Time Data Only
The app now uses only real-time data from external APIs:
- Requires valid API keys for odds and scores
- Real-time data from external providers
- Configure CDN for team logos
- If data is unavailable, fields will be blank rather than showing placeholder data

## Database Setup

1. **Deploy Firestore rules**
   ```bash
   firebase deploy --only firestore:rules,firestore:indexes
   ```

2. **Seed initial data**
   ```bash
   npm run seed
   ```

## Fantasy Integration

### Sleeper (Ready)
```env
VITE_FANTASY_PROVIDER=sleeper
VITE_FANTASY_LEAGUE_ID=your_league_id
VITE_FANTASY_TEAM_ID_BRADY=1
VITE_FANTASY_TEAM_ID_JENNY=2
```

### Yahoo (Coming Soon)
Requires server-side OAuth implementation via Netlify Functions.

## Project Structure

```
src/
├── components/          # Reusable UI components
├── docs/               # Project documentation
├── hooks/              # Custom React hooks
├── lib/                # Utilities and Firebase config
├── pages/              # Route components
├── providers/          # Data provider implementations
│   ├── interfaces.ts   # Provider contracts
│   ├── http/          # HTTP API implementations
│   └── fantasy/       # Fantasy providers
└── types/             # TypeScript type definitions
```

## Security

- **Authentication**: Google OAuth with email allowlist
- **Firestore Rules**: User isolation and read/write permissions
- **Pick Reveals**: Server-enforced logic prevents early reveals
- **API Keys**: Environment variables only (never in source code)

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run seed         # Seed Firestore with initial data
```

## Development Roadmap

### 🔄 In Progress
- **Production Firestore Rules**: Update from test mode to production-ready rules

### 📋 Core Features (Priority 1)
- **Firestore Data Model**: Design and implement complete data model for users, weeks, games, and picks
- **Hidden Picks Logic**: Implement reveal logic - show picks only when both submitted AND game started
- **Live Scores Integration**: Integrate live NFL scores API
- **Standings Calculation**: Build weekly and season standings logic between Brady and Jenny

### 🎨 UI/UX Improvements (Priority 2)
- **Mobile Responsive**: Ensure mobile-first design is fully responsive
- **Current Week Scroll**: Auto-scroll to current week when opening the app
- **Game Highlights**: Highlight correct picks when games are final
- **Light/Dark Themes**: Implement theme toggle

### 🏈 Advanced Features (Priority 3)
- **Fantasy Integration**: Add Yahoo Fantasy Football dashboard card showing matchup
- **NCAAF Support**: Add college football league support
- **Multi-User Support**: Expand beyond Brady and Jenny (future)

### 🎯 Current Focus
Working on core pick submission and reveal logic with proper Firestore integration.
