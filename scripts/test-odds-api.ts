#!/usr/bin/env tsx

// Test script for The Odds API
// Run with: npx tsx scripts/test-odds-api.ts

const API_KEY = '25b2a8031ea329712ee276e354d6ab4a'; // New API key
const BASE_URL = 'https://api.the-odds-api.com/v4';

async function testOddsAPI() {
  console.log('🔍 Testing The Odds API...');
  console.log('API Key:', API_KEY.substring(0, 8) + '...');
  console.log('Base URL:', BASE_URL);
  console.log('');

  try {
    // Test 1: Check if API key is valid by making a simple request
    console.log('📡 Test 1: Checking API key validity...');
    const testUrl = `${BASE_URL}/sports?apiKey=${API_KEY}`;
    console.log('Request URL:', testUrl);
    
    const sportsResponse = await fetch(testUrl);
    console.log('Sports API Status:', sportsResponse.status, sportsResponse.statusText);
    
    if (sportsResponse.ok) {
      const sportsData = await sportsResponse.json();
      console.log('✅ API key is valid! Found sports:', sportsData.length);
      console.log('Available sports:', sportsData.map((s: any) => s.title).slice(0, 5));
    } else {
      console.log('❌ API key test failed');
      const errorText = await sportsResponse.text();
      console.log('Error response:', errorText);
    }
    console.log('');

    // Test 2: Try NFL odds request (CAREFULLY - this costs usage credits)
    console.log('🏈 Test 2: Testing NFL odds request...');
    console.log('⚠️  WARNING: This will use usage credits if successful!');
    
    // Only proceed if the API key test passed
    if (!sportsResponse.ok) {
      console.log('⏭️  Skipping odds test due to failed API key validation');
    } else {
      const oddsUrl = `${BASE_URL}/sports/americanfootball_nfl/odds?apiKey=${API_KEY}&regions=us&markets=spreads,totals&oddsFormat=american&dateFormat=iso`;
      console.log('Request URL:', oddsUrl);
      
      const oddsResponse = await fetch(oddsUrl);
      console.log('Odds API Status:', oddsResponse.status, oddsResponse.statusText);
      
      if (oddsResponse.ok) {
        const oddsData = await oddsResponse.json();
        console.log('✅ NFL odds request successful! Found games:', oddsData.length);
        console.log('📊 Usage cost: ~', oddsData.length > 0 ? '20 credits (2 markets x 1 region x 10)' : '0 credits');
        if (oddsData.length > 0) {
          console.log('Sample game teams:', oddsData[0].home_team, 'vs', oddsData[0].away_team);
        }
      } else {
        console.log('❌ NFL odds request failed');
        const errorText = await oddsResponse.text();
        console.log('Error response:', errorText);
      }
    }
    console.log('');

    // Test 3: Check rate limits
    console.log('⏱️ Test 3: Checking rate limits...');
    const rateLimitUrl = `${BASE_URL}/usage?apiKey=${API_KEY}`;
    console.log('Request URL:', rateLimitUrl);
    
    const usageResponse = await fetch(rateLimitUrl);
    console.log('Usage API Status:', usageResponse.status, usageResponse.statusText);
    
    if (usageResponse.ok) {
      const usageData = await usageResponse.json();
      console.log('✅ Usage data retrieved:');
      console.log('Requests used:', usageData.requests_used);
      console.log('Requests remaining:', usageData.requests_remaining);
      console.log('Reset date:', usageData.reset_date);
    } else {
      console.log('❌ Usage request failed');
      const errorText = await usageResponse.text();
      console.log('Error response:', errorText);
    }

  } catch (error) {
    console.error('💥 Test failed with error:', error);
  }
}

// Run the test
testOddsAPI().then(() => {
  console.log('');
  console.log('🏁 Test completed!');
}).catch(console.error);
