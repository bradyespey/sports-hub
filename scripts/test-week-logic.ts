#!/usr/bin/env tsx

/**
 * Test script to debug week logic
 */

console.log('🧪 Testing Week Logic\n');

// Simulate current date
const now = new Date();
console.log('Current date:', now.toISOString());
console.log('Day of week:', now.getDay(), '(0=Sunday, 1=Monday, etc.)');

// Simulate week data
const week1 = {
  season: 2025,
  week: 1,
  startDateUtc: new Date('2025-09-04'),
  endDateUtc: new Date('2025-09-10')
};

console.log('\nWeek 1 data:');
console.log('Start:', week1.startDateUtc.toISOString());
console.log('End:', week1.endDateUtc.toISOString());

// Check if we're in week 1
const isInWeek1 = now >= week1.startDateUtc && now <= week1.endDateUtc;
console.log('\nIs current date in Week 1?', isInWeek1);

// Check if there are unstarted games (simulate)
const games = [
  { gameId: 'game1', status: 'scheduled', kickoffUtc: new Date('2025-09-08T20:00:00Z') },
  { gameId: 'game2', status: 'live', kickoffUtc: new Date('2025-09-08T17:00:00Z') },
  { gameId: 'game3', status: 'final', kickoffUtc: new Date('2025-09-08T14:00:00Z') }
];

console.log('\nGames:');
games.forEach(game => {
  const kickoff = new Date(game.kickoffUtc);
  const isUnstarted = kickoff > now;
  console.log(`${game.gameId}: ${game.status} (kickoff: ${kickoff.toISOString()}, unstarted: ${isUnstarted})`);
});

const unstartedGames = games.filter(game => {
  const kickoff = new Date(game.kickoffUtc);
  return kickoff > now;
});

console.log('\nUnstarted games:', unstartedGames.length);
console.log('Should refresh button be enabled?', unstartedGames.length > 0);
