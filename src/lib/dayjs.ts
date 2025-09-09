// src/lib/dayjs.ts
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import advancedFormat from 'dayjs/plugin/advancedFormat';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(advancedFormat);

// Get local timezone with CST fallback
const getLocalTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Chicago';
  } catch {
    return 'America/Chicago'; // CST fallback
  }
};

export const LOCAL_TIMEZONE = getLocalTimezone();

// NFL Week Logic: Weeks run Tuesday to Monday
export const getCurrentNFLWeek = (): number => {
  const now = dayjs().tz(LOCAL_TIMEZONE);
  
  // For 2025 season, Week 1 starts September 2nd (Tuesday)
  const seasonStart = dayjs('2025-09-02').tz(LOCAL_TIMEZONE);
  
  // Calculate weeks since season start
  const weeksSinceStart = now.diff(seasonStart, 'week');
  
  // NFL season is 18 weeks + playoffs
  // For now, we'll cap at 22 weeks (18 regular + 4 playoff)
  const currentWeek = Math.max(1, Math.min(22, weeksSinceStart + 1));
  
  return currentWeek;
};

// Check if a given week is the current NFL week
export const isCurrentNFLWeek = (week: number): boolean => {
  return week === getCurrentNFLWeek();
};

// Get the start and end dates for a given NFL week
export const getNFLWeekDates = (week: number) => {
  const seasonStart = dayjs('2025-09-02').tz(LOCAL_TIMEZONE);
  const weekStart = seasonStart.add((week - 1) * 7, 'days');
  const weekEnd = weekStart.add(6, 'days').endOf('day');
  
  return {
    start: weekStart,
    end: weekEnd
  };
};

export default dayjs;