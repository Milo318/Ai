## 2024-05-22 - DOM Batching with DocumentFragment
**Learning:** Direct `appendChild` in loops causes unnecessary reflows and repaints, especially for lists.
**Action:** Use `DocumentFragment` to batch DOM insertions. Create the fragment, append elements to it, and then append the fragment to the DOM in one operation.
