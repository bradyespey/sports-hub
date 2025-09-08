# Local Development Guide

## Running the App Locally

### 1. Start the Vite dev server
```bash
npm run dev
```
This runs on `http://localhost:5173`

### 2. Start Netlify Functions (Optional)
For full functionality including odds refresh, you need to run Netlify functions locally:

```bash
# Install Netlify CLI if you haven't
npm install -g netlify-cli

# Start Netlify functions
netlify dev
```

This runs on `http://localhost:8888` and includes the functions.

### 3. Environment Variables

#### For Netlify Functions (when running `netlify dev`)
Create `.env` file in project root:
```bash
# Firebase Admin
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# The Odds API
ODDS_API_KEY=your-odds-api-key
```

#### For Vite (always needed)
Keep your existing `.env` file:
```bash
VITE_USE_MOCK=false
VITE_ODDS_API_KEY=your-odds-api-key
VITE_ODDS_API_URL=https://api.the-odds-api.com/v4
```

## Development Modes

### Mode 1: Vite Only (Mock Data)
- Run: `npm run dev`
- **Pros**: Fast, no setup needed
- **Cons**: No real odds refresh, uses mock data only
- **Use case**: UI development, testing layout

### Mode 2: Vite + Netlify Functions (Full Features)
- Run: `netlify dev` (includes both Vite and functions)
- **Pros**: Full functionality, real API calls
- **Cons**: Requires environment variables, slower startup
- **Use case**: Testing complete system

## What Happens Without Netlify Functions

When Netlify functions aren't running:
- ✅ App loads normally with mock data
- ✅ All UI components work
- ⚠️ "Refresh Odds" button shows error (expected)
- ⚠️ Bootstrap attempts fail gracefully (expected)
- ✅ App continues with mock data

## Testing the Full System

1. Start with `netlify dev`
2. Set up environment variables
3. Navigate to different weeks
4. Click "Refresh Odds" button
5. Check browser console for API calls
6. Verify Firestore data is created

## Troubleshooting

### 404 Errors
- **Cause**: Netlify functions not running
- **Fix**: Run `netlify dev` instead of `npm run dev`

### Firebase Errors
- **Cause**: Missing or incorrect environment variables
- **Fix**: Check `.env` file has correct Firebase credentials

### API Errors
- **Cause**: Invalid API key or quota exceeded
- **Fix**: Check `ODDS_API_KEY` and API usage
