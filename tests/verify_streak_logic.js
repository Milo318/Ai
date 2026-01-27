
const assert = require('assert');

function calculateStreakOptimized(sessions) {
  if (!sessions.length) return 0;

  // Create a Set for O(1) lookup
  const uniqueDates = new Set(sessions.map((session) => session.date));

  // Start checking from the most recent session's date (assuming sessions are sorted desc)
  let currentStr = sessions[0].date;
  let streak = 0;

  // We need a Date object to subtract days
  let current = new Date(currentStr);

  while (uniqueDates.has(currentStr)) {
    streak += 1;
    current.setDate(current.getDate() - 1);
    currentStr = current.toISOString().split("T")[0];
  }
  return streak;
}

// Test Helper
function test(desc, sessions, expected) {
  const result = calculateStreakOptimized(sessions);
  if (result === expected) {
    console.log(`✅ ${desc}`);
  } else {
    console.error(`❌ ${desc}: Expected ${expected}, got ${result}`);
    process.exit(1);
  }
}

// Scenarios
const today = new Date().toISOString().split('T')[0];
const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
const dayBefore = new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0];
const gapDay = new Date(Date.now() - 86400000 * 4).toISOString().split('T')[0];

console.log("Running Streak Logic Tests...");

// 1. Empty
test("Empty sessions", [], 0);

// 2. Single
test("Single session", [{ date: today }], 1);

// 3. Consecutive
test("3 Days Consecutive", [
  { date: today },
  { date: yesterday },
  { date: dayBefore }
], 3);

// 4. Duplicate dates (same day training)
test("Duplicate dates should not double count", [
  { date: today },
  { date: today }, // Second session today
  { date: yesterday }
], 2);

// 5. Gap
test("Gap breaks streak", [
  { date: today },
  { date: gapDay }
], 1);

// 6. Multiple duplicates and sequence
test("Complex sequence", [
  { date: today },
  { date: yesterday },
  { date: yesterday },
  { date: dayBefore },
  { date: gapDay }
], 3);

console.log("All tests passed!");
