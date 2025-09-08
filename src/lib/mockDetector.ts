// src/lib/mockDetector.ts
// Utility to detect if we're using mock data anywhere in the app

export const isUsingMockData = (): boolean => {
  // Check if we're explicitly in mock mode
  if (import.meta.env.VITE_USE_MOCK === 'true') {
    return true;
  }
  
  // Check if we're falling back to mock due to API failures
  // This is a simple heuristic - in a real app you might want more sophisticated detection
  return false; // We'll set this to true when we detect API failures
};

export const setMockMode = (isMock: boolean) => {
  // This could be used to track when we fallback to mock data
  // For now, we'll just use the environment variable
  console.log(`Mock mode: ${isMock ? 'ON' : 'OFF'}`);
};
