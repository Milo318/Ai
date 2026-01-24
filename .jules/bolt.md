## 2024-05-22 - Duplicated Code Cleanup
**Learning:** The codebase contained significant duplicated code in `app.js` and `index.html` (likely from a bad merge), leading to redundant event listeners and conflicting logic.
**Action:** Always scan files for large blocks of repetition or re-declarations (e.g., `const` being declared twice) before optimizing. Cleaning this yields immediate performance and correctness wins.
