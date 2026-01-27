
const { performance } = require('perf_hooks');

// Mock data generation
function generateSessions(count) {
  const sessions = [];
  const today = new Date();
  for (let i = 0; i < count; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    sessions.push({
      date: date.toISOString().split('T')[0],
      variation: 'tuck',
      holdTime: 10,
      sets: 3,
      rpe: 7
    });
  }
  return sessions;
}

// Original function (adapted to accept sessions argument)
function calculateStreakOriginal(sessions) {
  if (!sessions.length) return 0;
  const dates = [...new Set(sessions.map((session) => session.date))];
  let streak = 0;
  let current = new Date(dates[0]);
  while (dates.includes(current.toISOString().split("T")[0])) {
    streak += 1;
    current.setDate(current.getDate() - 1);
  }
  return streak;
}

// Optimized function
function calculateStreakOptimized(sessions) {
  if (!sessions.length) return 0;
  const uniqueDates = new Set(sessions.map((session) => session.date));
  let streak = 0;
  // Assuming the first session is the most recent (as per data generation and app logic)
  let currentStr = sessions[0].date;
  let current = new Date(currentStr);

  while (uniqueDates.has(currentStr)) {
    streak += 1;
    current.setDate(current.getDate() - 1);
    currentStr = current.toISOString().split("T")[0];
  }
  return streak;
}

const sessions = generateSessions(1000); // 1000 days streak

console.log(`Benchmarking with ${sessions.length} sessions...`);

const startOriginal = performance.now();
for (let i = 0; i < 100; i++) {
    calculateStreakOriginal(sessions);
}
const endOriginal = performance.now();
console.log(`Original: ${(endOriginal - startOriginal).toFixed(2)}ms`);

const startOptimized = performance.now();
for (let i = 0; i < 100; i++) {
    calculateStreakOptimized(sessions);
}
const endOptimized = performance.now();
console.log(`Optimized: ${(endOptimized - startOptimized).toFixed(2)}ms`);
