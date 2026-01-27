## 2024-05-22 - O(N^2) Streak Calculation & Duplicate Code
**Learning:** Found an O(N^2) (or O(N*M)) complexity in the daily streak calculation. It was iterating through all sessions to find unique dates, then linearly searching that list for every day of the streak. For long streaks and history, this becomes expensive.
**Action:** Replaced array lookups with `Set` (O(1)). Also noticed `app.js` contained duplicate code blocks causing syntax errors - likely a merge artifact. Cleaned this up while applying optimizations.
