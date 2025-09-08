// scripts/generate-nfl-season.ts
import * as fs from 'fs';
import * as path from 'path';

interface NFLWeek {
  week: number;
  startDate: string;
  endDate: string;
  games: NFLGame[];
}

interface NFLGame {
  gameId: string;
  season: number;
  week: number;
  kickoffUtc: string;
  homeTeam: string;
  awayTeam: string;
  status: 'scheduled' | 'live' | 'final';
}

// NFL 2025 Season Schedule Template
const NFL_2025_SCHEDULE: NFLWeek[] = [
  {
    week: 1,
    startDate: '2025-09-04T00:00:00Z',
    endDate: '2025-09-10T23:59:59Z',
    games: [
      { gameId: '2025-W01-DAL-PHI', season: 2025, week: 1, kickoffUtc: '2025-09-04T20:20:00Z', homeTeam: 'PHI', awayTeam: 'DAL', status: 'scheduled' },
      { gameId: '2025-W01-KC-LAC', season: 2025, week: 1, kickoffUtc: '2025-09-05T20:15:00Z', homeTeam: 'LAC', awayTeam: 'KC', status: 'scheduled' },
      { gameId: '2025-W01-NYG-WAS', season: 2025, week: 1, kickoffUtc: '2025-09-07T13:00:00Z', homeTeam: 'WAS', awayTeam: 'NYG', status: 'scheduled' },
      { gameId: '2025-W01-TB-ATL', season: 2025, week: 1, kickoffUtc: '2025-09-07T13:00:00Z', homeTeam: 'ATL', awayTeam: 'TB', status: 'scheduled' },
      { gameId: '2025-W01-CAR-JAX', season: 2025, week: 1, kickoffUtc: '2025-09-07T13:00:00Z', homeTeam: 'JAX', awayTeam: 'CAR', status: 'scheduled' },
      { gameId: '2025-W01-MIA-IND', season: 2025, week: 1, kickoffUtc: '2025-09-07T13:00:00Z', homeTeam: 'IND', awayTeam: 'MIA', status: 'scheduled' },
      { gameId: '2025-W01-LV-NE', season: 2025, week: 1, kickoffUtc: '2025-09-07T13:00:00Z', homeTeam: 'NE', awayTeam: 'LV', status: 'scheduled' },
      { gameId: '2025-W01-PIT-NYJ', season: 2025, week: 1, kickoffUtc: '2025-09-07T13:00:00Z', homeTeam: 'NYJ', awayTeam: 'PIT', status: 'scheduled' },
      { gameId: '2025-W01-CIN-CLE', season: 2025, week: 1, kickoffUtc: '2025-09-07T13:00:00Z', homeTeam: 'CLE', awayTeam: 'CIN', status: 'scheduled' },
      { gameId: '2025-W01-ARI-NO', season: 2025, week: 1, kickoffUtc: '2025-09-07T13:00:00Z', homeTeam: 'NO', awayTeam: 'ARI', status: 'scheduled' },
      { gameId: '2025-W01-SF-SEA', season: 2025, week: 1, kickoffUtc: '2025-09-07T16:05:00Z', homeTeam: 'SEA', awayTeam: 'SF', status: 'scheduled' },
      { gameId: '2025-W01-TEN-DEN', season: 2025, week: 1, kickoffUtc: '2025-09-07T16:05:00Z', homeTeam: 'DEN', awayTeam: 'TEN', status: 'scheduled' },
      { gameId: '2025-W01-DET-GB', season: 2025, week: 1, kickoffUtc: '2025-09-07T16:25:00Z', homeTeam: 'GB', awayTeam: 'DET', status: 'scheduled' },
      { gameId: '2025-W01-HOU-LAR', season: 2025, week: 1, kickoffUtc: '2025-09-07T16:25:00Z', homeTeam: 'LAR', awayTeam: 'HOU', status: 'scheduled' },
      { gameId: '2025-W01-BAL-BUF', season: 2025, week: 1, kickoffUtc: '2025-09-07T20:20:00Z', homeTeam: 'BUF', awayTeam: 'BAL', status: 'scheduled' },
      { gameId: '2025-W01-MIN-CHI', season: 2025, week: 1, kickoffUtc: '2025-09-08T20:15:00Z', homeTeam: 'CHI', awayTeam: 'MIN', status: 'scheduled' }
    ]
  }
  // We'll generate the rest programmatically
];

// NFL Teams for rotation
const NFL_TEAMS = [
  'ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE',
  'DAL', 'DEN', 'DET', 'GB', 'HOU', 'IND', 'JAX', 'KC',
  'LAC', 'LAR', 'LV', 'MIA', 'MIN', 'NE', 'NO', 'NYG',
  'NYJ', 'PHI', 'PIT', 'SF', 'SEA', 'TB', 'TEN', 'WAS'
];

function generateWeekSchedule(week: number, startDate: Date): NFLGame[] {
  const games: NFLGame[] = [];
  const teams = [...NFL_TEAMS];
  
  // Shuffle teams for variety
  for (let i = teams.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [teams[i], teams[j]] = [teams[j], teams[i]];
  }

  // Generate 16 games (32 teams / 2)
  for (let i = 0; i < 32; i += 2) {
    const awayTeam = teams[i];
    const homeTeam = teams[i + 1];
    
    // Distribute games across Sunday
    const gameDate = new Date(startDate);
    gameDate.setDate(gameDate.getDate() + 3); // Sunday
    
    // Vary kickoff times
    const timeSlots = ['13:00:00Z', '16:05:00Z', '16:25:00Z', '20:20:00Z'];
    const timeSlot = timeSlots[i % timeSlots.length];
    gameDate.setUTCHours(parseInt(timeSlot.split(':')[0]));
    gameDate.setUTCMinutes(parseInt(timeSlot.split(':')[1]));

    games.push({
      gameId: `2025-W${week.toString().padStart(2, '0')}-${awayTeam}-${homeTeam}`,
      season: 2025,
      week,
      kickoffUtc: gameDate.toISOString(),
      homeTeam,
      awayTeam,
      status: 'scheduled'
    });
  }

  return games;
}

function generateFullSeason(): void {
  const schedule: Record<string, NFLGame[]> = {};
  const odds: Record<string, any[]> = {};
  
  // Week 1 is already defined
  schedule['2025_01'] = NFL_2025_SCHEDULE[0].games;
  
  // Generate weeks 2-18
  for (let week = 2; week <= 18; week++) {
    const startDate = new Date('2025-09-04');
    startDate.setDate(startDate.getDate() + (week - 1) * 7);
    
    const weekKey = `2025_${week.toString().padStart(2, '0')}`;
    schedule[weekKey] = generateWeekSchedule(week, startDate);
    
    // Generate placeholder odds for each game
    odds[weekKey] = schedule[weekKey].map(game => ({
      gameId: game.gameId,
      spreadHome: (Math.random() * 14 - 7).toFixed(1), // -7 to +7
      spreadAway: -(parseFloat((Math.random() * 14 - 7).toFixed(1))),
      total: (40 + Math.random() * 20).toFixed(1), // 40-60
      provider: 'Generated'
    }));
  }

  // Add playoff weeks (19-22)
  for (let week = 19; week <= 22; week++) {
    const startDate = new Date('2025-09-04');
    startDate.setDate(startDate.getDate() + (week - 1) * 7);
    
    const weekKey = `2025_${week.toString().padStart(2, '0')}`;
    const playoffGames = generatePlayoffGames(week, startDate);
    
    schedule[weekKey] = playoffGames;
    odds[weekKey] = playoffGames.map(game => ({
      gameId: game.gameId,
      spreadHome: (Math.random() * 6 - 3).toFixed(1), // Tighter spreads in playoffs
      spreadAway: -(parseFloat((Math.random() * 6 - 3).toFixed(1))),
      total: (42 + Math.random() * 16).toFixed(1),
      provider: 'Generated'
    }));
  }

  // Write files
  const scheduleFile = path.join(process.cwd(), 'src/devdata/schedule.json');
  const oddsFile = path.join(process.cwd(), 'src/devdata/odds.json');
  
  fs.writeFileSync(scheduleFile, JSON.stringify(schedule, null, 2));
  fs.writeFileSync(oddsFile, JSON.stringify(odds, null, 2));
  
  console.log('✅ Generated complete NFL 2025 season schedule (18 weeks + playoffs)');
  console.log(`📊 Total games: ${Object.values(schedule).flat().length}`);
  console.log(`📅 Weeks: ${Object.keys(schedule).length}`);
}

function generatePlayoffGames(week: number, startDate: Date): NFLGame[] {
  const games: NFLGame[] = [];
  const playoffTeams = NFL_TEAMS.slice(0, week === 19 ? 14 : week === 20 ? 8 : week === 21 ? 4 : 2);
  
  for (let i = 0; i < playoffTeams.length; i += 2) {
    const awayTeam = playoffTeams[i];
    const homeTeam = playoffTeams[i + 1];
    
    const gameDate = new Date(startDate);
    gameDate.setDate(gameDate.getDate() + (i / 2) + 1); // Spread across weekend
    gameDate.setUTCHours(20, 0, 0, 0); // 8 PM ET
    
    games.push({
      gameId: `2025-W${week.toString().padStart(2, '0')}-${awayTeam}-${homeTeam}`,
      season: 2025,
      week,
      kickoffUtc: gameDate.toISOString(),
      homeTeam,
      awayTeam,
      status: 'scheduled'
    });
  }
  
  return games;
}

// Run the generator
generateFullSeason();
