# Front Lever Coach (Static PWA + Vercel API)

## Vercel Setup

1. Deploy this repo to Vercel.
2. Add the environment variable `SAFE_API_KEY` in Vercel (Project Settings → Environment Variables).
3. Redeploy after setting the variable so the serverless function can access the key.

## GitHub Pages

The GitHub Pages deployment remains fully static and never uses secrets in the browser. It calls the
Vercel endpoint you configure in the UI (default placeholder: `https://<DEIN-VERCEL-PROJEKT>.vercel.app`).

## Notes

- The AI coach requests are proxied by `api/coach.js` on Vercel.
- If `SAFE_API_KEY` is missing, the API returns `{"error":"SAFE_API_KEY missing on server"}`.
