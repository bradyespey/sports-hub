# Project Context

Read README.md for full project context before making changes.

## Overview
NFL picks app with live scores, odds integration, standings logic, and demo mode for public access.

## Stack
React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Firebase Auth/Firestore, Netlify Functions, ESPN API, The Odds API.

## Key Files
- src/pages/NFL/
- src/components/GameCard.tsx
- src/components/Standings.tsx
- src/providers/http/
- netlify/functions/odds_refresh.ts
- netlify/functions/daily_odds.ts
- netlify/functions/pulse.ts

## Dev Commands
- Start: npm run dev
- Build: npm run build
- Deploy: npm run deploy:watch

## Local Ports
- App dev: `http://localhost:5178`
- Netlify local shell: `http://localhost:8890` via `npm run dev:all`

## Rules
- Do not introduce new frameworks
- Follow existing structure and naming
- Keep solutions simple and fast

## Security
- Never expose paid API keys in browser bundles, `VITE_*` vars, or client-side fetch calls
- Put LLM and other paid provider keys behind server-side functions or a backend proxy only
- Do not enable auto-reload, polling, automatic retries, or repeated background inference against paid APIs unless the user explicitly asks for it

## Notes
- Use `npm run dev:all` when testing function behavior locally.
- Keep weighted playoff scoring and standings logic unchanged unless explicitly requested.
