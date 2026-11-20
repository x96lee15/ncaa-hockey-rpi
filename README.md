# IceIndex — 2026–27 NCAA Division I Men's Ice Hockey RPI & NPI Tracker

Full-stack TypeScript/React web application that computes and compares both the **classic NCAA Hockey Ratings Percentage Index (RPI)** and the **current NCAA Power Index (NPI)** for all 62 Division I Men's Ice Hockey programs across the 2026–27 season.

## Key Features

- **Side-by-Side RPI & NPI Rankings**: Sortable, filterable 62-team table with conference filters, Top-16 NCAA Tournament cutline, `Δ Rank` swings, `*` (bad win removed) and `#` (good loss removed) annotations, and CSV/JSON export.
- **Verified 2026–27 Dataset & Live Sync**: Preloaded with all 334 completed regular-season D-I Men's Hockey games through November 19, 2026 (plus 51 upcoming Nov 20–21 games) from College Hockey, Inc., verified against live USCHO NPI rankings (`62/62` teams exact rank match, `max Δ ≤ 0.0005`). Includes a live `/api/sync` scraper for `collegehockeyinc.com/men/compnatfull27.php`.
- **Team Dossier Drawer**: Click any team for full RPI (`WP` / `OWP` / `OOWP` / `QWB`) and NPI (`Wgt W%` / `SOS` / `QWB`) breakdowns, home/road/neutral splits, and game-by-game contribution audits.
- **RPI vs. NPI Divergence & Conference Matrix**: Interactive SVG scatter plot comparing RPI Rank vs. NPI Rank, biggest methodological risers/fallers, and conference strength comparisons.
- **What-If Game Simulator & Score Logger**: Pick hypothetical outcomes (Reg Win, OT Win, Tie, OT Loss, Reg Loss) for upcoming Nov 20–21 games to preview instant rank shifts, or log official final scores directly into the API.
- **Interactive Formula & Dial Lab**: Tune RPI weights (`WP / OWP / OOWP`, home/road multiplier, OT split, QWB) and NPI dials (`WP / SOS`, `Home/Away`, `OT 60/40`, `QWB Base 51 / 0.5×`, `Min Retained Wins 12`) in real time.

## Ranking Formulas

### Classic NCAA Division I Men's Hockey RPI (`shared/rpi.ts`)
- **Base RPI** = `25% × Weighted WP + 21% × OWP + 54% × OOWP`
- **Home / Road Weighting**: `1.2` for road wins & home losses, `0.8` for home wins & road losses, `1.0` for neutral-site contests.
- **3-on-3 Overtime**: `55% / 45%` win/loss split (configurable in Dial Lab).
- **OWP & OOWP**: Average unweighted opponent winning percentage (excluding head-to-head matchups) and opponents' average OWP.
- **Adjustments**: Removes wins that lower a team's Base RPI (`*`) and adds the sliding Top-20 Quality Wins Bonus (`+0.0020` for #1 down to `+0.0001` for #20).

### NCAA Power Index — NPI (`shared/npi.ts`)
Official 2025–27 NCAA Division I Men's Ice Hockey dials:
- **Win % / Strength of Schedule**: `25% / 75%`
- **Home / Away**: `1.2 / 0.8` regular season (`1.0 / 1.0` postseason & neutral)
- **Overtime**: `60 / 40` regular season (`100 / 0` postseason)
- **Quality Win Bonus (QWB)**: Base `51.0`, Multiplier `0.5` — applied as `winWeight × max(0, OppNPI - 51.0) × 0.5`
- **Minimum Retained Wins**: `12` (wins beyond 12 that lower NPI are excluded and flagged `*`)
- **Good-Loss Exclusion**: Regulation losses that would raise a team's NPI are excluded (`#`)
- Solved iteratively to `< 1e-9` convergence (~100 iterations).

## Project Structure

```
ncaa-hockey-rpi/
├── shared/
│   ├── types.ts              # Domain models & official NCAA dial defaults
│   ├── rpi.ts                # Classic NCAA Hockey RPI engine
│   ├── npi.ts                # Iterative NCAA NPI solver
│   ├── compare.ts            # Side-by-side comparison, conferences, What-If simulator
│   └── __tests__/
│       └── rankings.test.ts  # Vitest verification suite (62-team USCHO accuracy check)
├── server/
│   ├── index.ts              # Express REST API + static production server
│   ├── store.ts              # Season state, manual game logging, live sync
│   ├── data/
│   │   ├── teams.ts          # 62 D-I Men's teams, conferences, USCHO Nov 20 reference
│   │   └── rawSchedule2026_27.ts
│   └── scrapers/
│       └── chiParser.ts      # College Hockey, Inc. schedule parser & live fetcher
└── src/
    ├── App.tsx               # Main application shell & navigation
    ├── api.ts                # Typed API client
    ├── index.css             # Editorial sports-analytics Vanilla CSS design system
    └── components/
        ├── RankingsTable.tsx
        ├── TeamDossierDrawer.tsx
        ├── ComparisonView.tsx
        ├── WhatIfSimulator.tsx
        └── DialLab.tsx
```

## Scripts

```bash
npm run dev      # Run Express API (:3001) and Vite React dev server (:5173) concurrently
npm run build    # Type-check and build production frontend into dist/
npm run start    # Serve built app + Express API on http://localhost:3001
npm test         # Run Vitest unit & USCHO verification tests
```
