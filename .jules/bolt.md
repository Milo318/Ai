## 2024-05-22 - O(N^2) Streak Calculation Bottleneck
**Learning:** The streak calculation was iterating through the entire history for every day in the streak, leading to O(N^2) complexity. Using a `Set` for O(1) lookup reduces this to O(N).
**Action:** Use `Set` for existence checks in loops over historical data.

## 2024-05-22 - Code Duplication in Vanilla JS
**Learning:** The `app.js` file contained significant code duplication (duplicated constants and event listeners), likely due to copy-paste errors or merge conflicts. This caused syntax errors (duplicate `const` declarations) preventing the app from running.
**Action:** Ensure thorough cleanup and syntax validation when modifying large vanilla JS files without a build step/linter.
