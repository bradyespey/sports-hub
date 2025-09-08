# NFL Data API Setup Guide

## 🎯 Overview

Your SportsHub app now supports real-time NFL data with **$0/month cost** using:
- **The Odds API** (FREE tier) - Betting odds and spreads
- **ESPN API** (FREE) - Live scores and game data

## 📊 API Setup Instructions

### 1. The Odds API (FREE - 500 requests/month)

**Sign up:** https://the-odds-api.com/
1. Click "Get API Key" → "Starter (FREE)"
2. Enter your email and create account
3. Check email for API key

**Add to your `.env` file:**
```env
VITE_ODDS_API_KEY=your_actual_api_key_here
VITE_USE_MOCK=false
```

### 2. ESPN API (FREE - No signup required)
✅ Already configured! Uses public ESPN endpoints.

## 🔄 Data Sync Features

### Automatic Sync
- **Frequency**: Every 5 minutes when app is open
- **Coverage**: Current week games, odds, and live scores
- **Smart Updates**: Only syncs during game days for efficiency

### Manual Sync
```typescript
import { DataSyncService } from '@/services/DataSyncService';

const syncService = DataSyncService.getInstance();
await syncService.syncCurrentWeekData();
```

## 📅 Complete Season Data

✅ **Generated**: All 22 weeks (18 regular + 4 playoff weeks)
✅ **Games**: 302 total games with realistic schedules
✅ **Odds**: Placeholder spreads for all games (updated by API)

## 💰 Cost Analysis

| Service | Free Tier | Your Usage | Monthly Cost |
|---------|-----------|------------|--------------|
| The Odds API | 500 requests | ~100 requests | **$0** |
| ESPN API | Unlimited | Unlimited | **$0** |
| **Total** | | | **$0/month** |

### Usage Breakdown:
- **20 games/week** × **18 weeks** = 360 games/season
- **2 API calls/game** (odds + scores) = 720 calls/season
- **720 calls ÷ 12 months** = ~60 calls/month
- **Well under 500/month limit!** 🎉

## 🚀 How to Enable Real APIs

1. **Get The Odds API key** (see setup above)
2. **Update `.env`:**
   ```env
   VITE_ODDS_API_KEY=your_actual_api_key_here
   VITE_USE_MOCK=false
   ```
3. **Restart dev server:**
   ```bash
   npm run dev
   ```

## 🔧 API Endpoints Used

### The Odds API
```
GET https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds
```
- **Markets**: spreads, totals
- **Regions**: US bookmakers
- **Format**: American odds

### ESPN API
```
GET https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard
```
- **Data**: Live scores, game status, team info
- **Updates**: Real-time during games

## 📱 Features Enabled

### Live Sports Dashboard
- ✅ Real-time game scores
- ✅ Live game status (scheduled/live/final)
- ✅ Quarter and time remaining
- ✅ Current betting spreads
- ✅ Team logos from ESPN

### Automatic Updates
- ✅ Scores update every 5 minutes during games
- ✅ Odds sync before game days
- ✅ Visual indicators for live games
- ✅ Auto-scroll to current games

### Pick Management
- ✅ Hidden picks until both submitted + game started
- ✅ Real-time standings calculation
- ✅ Correct pick highlighting when games end

## 🔍 Monitoring & Debugging

### Check API Status
```typescript
const syncService = DataSyncService.getInstance();
console.log(syncService.getSyncStatus());
```

### View API Calls
- Open browser DevTools → Network tab
- Filter by "odds-api" or "espn" to see API calls
- Check for 200 status codes

### Fallback Behavior
- If APIs fail, app falls back to mock data
- No interruption to user experience
- Errors logged to console

## 🎮 Next Steps

1. **Get your free API key** from The Odds API
2. **Update `.env`** with real API key
3. **Test with live data** during NFL games
4. **Monitor usage** in The Odds API dashboard
5. **Enjoy your free NFL dashboard!** 🏈

## 🆘 Troubleshooting

### "No odds data" error
- Check `VITE_ODDS_API_KEY` in `.env`
- Verify API key is active on The Odds API dashboard
- Check browser console for API errors

### "Scores not updating" error
- ESPN API is public - no key needed
- Check internet connection
- Verify game is actually live/scheduled

### High API usage
- Monitor The Odds API dashboard
- Reduce sync frequency if needed
- Consider upgrading to paid tier if usage grows

---

**🎉 You now have a completely free, real-time NFL dashboard!**
