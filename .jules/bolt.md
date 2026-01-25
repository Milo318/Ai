## 2025-01-25 - DOM Reflows & File Corruption
**Learning:** The codebase contained significant duplication in `app.js` and `index.html`, likely from a bad merge. This not only broke the app (syntax errors) but increased bundle size.
**Action:** Always check for duplicate code blocks when seeing `SyntaxError: Identifier has already been declared`.
**Learning:** `innerHTML` clearing followed by `appendChild` in a loop causes multiple reflows.
**Action:** Use `DocumentFragment` to batch DOM updates.
