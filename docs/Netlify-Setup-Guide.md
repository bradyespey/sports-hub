# Netlify Setup Guide for SportsHub

## Environment Variables Setup

### In Netlify Dashboard:
Go to Site Settings > Environment Variables and add:

**Server-side variables (for Netlify functions):**
```
FIREBASE_PROJECT_ID=sportshub-9dad7
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@sportshub-9dad7.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n[your private key]\n-----END PRIVATE KEY-----\n"
ODDS_API_KEY=25b2a8031ea329712ee276e354d6ab4a
```

**Client-side variables (already configured):**
```
VITE_FIREBASE_API_KEY=AIzaSyAlYHZM0CoBiy38EM0JijMJKzxHUMPHGTE
VITE_FIREBASE_AUTH_DOMAIN=sportshub-9dad7.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=sportshub-9dad7
VITE_FIREBASE_STORAGE_BUCKET=sportshub-9dad7.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=926541191216
VITE_FIREBASE_APP_ID=1:926541191216:web:2c4813b6f829339472b5f5
VITE_ALLOWED_EMAILS=baespey@gmail.com,jennycespey@gmail.com
VITE_USE_MOCK=false
```

## Firebase Service Account Setup

1. Go to Firebase Console > Project Settings > Service Accounts
2. Click "Generate new private key"
3. Download the JSON file
4. Extract the values:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY` (keep the newlines as `\n`)

## API Architecture

### How it works:
1. **Netlify Function** (`/api/pulse`) runs every 15 minutes
2. **Fetches real odds** using h2h market only (1 credit per call)
3. **Stores snapshots** in Firestore with timestamps
4. **Client reads snapshots** instead of calling API directly
5. **Manual sync** available via API usage monitor

### Cost Optimization:
- Only `h2h` market (1 credit vs 2-3 for multiple markets)
- 15-minute intervals (vs page refresh)
- Cached in Firestore (no repeated calls)
- Auto-fallback when quota low

## Testing the Setup

After deployment:
1. Visit `https://your-site.netlify.app/.netlify/functions/pulse?action=usage`
2. Should show API usage data
3. Visit `https://your-site.netlify.app/.netlify/functions/pulse?action=pulse&season=2025&week=1`
4. Should trigger data sync

## Firestore Collections Created

```
/system/api_usage - API usage tracking
/weeks/{season_week}/snapshots/odds - Odds snapshots
/weeks/{season_week}/snapshots/scores - Scores snapshots
```

## Expected Behavior

- **Week 1**: Uses cached snapshots + fallback to mock for finished games
- **Week 2+**: Real-time snapshots for unstarted games
- **API Usage**: ~96 credits/day during active weeks (15min × 4/hr × 24hr)
- **Fallback**: Auto-switches to mock when <50 credits remaining
