# Espey Pick'em

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
- **Data**: Provider pattern for Mock/HTTP data sources

## Local Development

1. **Clone and install**
   ```bash
   git clone <YOUR_GIT_URL>
   cd espey-pickem
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
| `VITE_FIREBASE_PROJECT_ID` | Yes | Firebase project ID | `espey-pickem` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Yes | Firebase storage bucket | `project.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Yes | Firebase sender ID | `123456789` |
| `VITE_FIREBASE_APP_ID` | Yes | Firebase app ID | `1:123:web:abc` |
| `VITE_ALLOWED_EMAILS` | Yes | Comma-separated allowed emails | `user1@gmail.com,user2@gmail.com` |
| `VITE_USE_MOCK` | No | Use mock data (true/false) | `true` |
| `VITE_ODDS_API_URL` | No* | Odds API endpoint | `https://api.provider.com/v1` |
| `VITE_ODDS_API_KEY` | No* | Odds API key | `your_api_key` |
| `VITE_SCORES_API_URL` | No* | Scores API endpoint | `https://api.provider.com/v1` |
| `VITE_SCORES_API_KEY` | No* | Scores API key | `your_api_key` |
| `VITE_LOGO_CDN_BASE` | No | Team logos CDN | `https://cdn.com/logos` |
| `VITE_FANTASY_PROVIDER` | No | Fantasy provider (sleeper/yahoo) | `sleeper` |
| `VITE_FANTASY_LEAGUE_ID` | No** | Fantasy league ID | `123456789` |
| `VITE_FANTASY_TEAM_ID_BRADY` | No** | Brady's team ID | `1` |
| `VITE_FANTASY_TEAM_ID_JENNY` | No** | Jenny's team ID | `2` |

*Required when `VITE_USE_MOCK=false`  
**Required when fantasy provider is enabled

## Deployment (Netlify)

1. **Connect GitHub repo** to Netlify
2. **Mirror environment variables** from .env to Netlify dashboard
3. **Add authorized domains** in Firebase Console:
   - `localhost:8080` (development)
   - `your-netlify-domain.netlify.app` (production)
   - Any custom domains

## Data Sources

### Mock Mode (Development)
Set `VITE_USE_MOCK=true` to use local JSON data from `src/devdata/`:
- No API keys required
- Perfect for development and testing
- Includes sample games, odds, and scores

### HTTP Mode (Production)
Set `VITE_USE_MOCK=false` and provide API credentials:
- Requires valid API keys for odds and scores
- Real-time data from external providers
- Configure CDN for team logos

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
├── devdata/            # Mock JSON data for development
├── hooks/              # Custom React hooks
├── lib/                # Utilities and Firebase config
├── pages/              # Route components
├── providers/          # Data provider implementations
│   ├── interfaces.ts   # Provider contracts
│   ├── mock/          # Mock implementations
│   ├── http/          # HTTP implementations
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
