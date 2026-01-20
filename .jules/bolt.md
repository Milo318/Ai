## 2025-05-18 - Duplicate Code Execution
**Learning:** The `app.js` and `index.html` files contained duplicate code blocks, likely due to a bad merge. This caused event listeners to be attached twice, doubling the execution cost of user actions and API calls.
**Action:** Always verify file integrity and check for duplicate function definitions or event listeners when onboarding a legacy or messy codebase. Use `grep` to count occurrences of key functions.
