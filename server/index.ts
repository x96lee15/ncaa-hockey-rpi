import cors from 'cors';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NpiDials, RpiDials, WhatIfOutcome } from '../shared/types.js';
import { TEAM_BY_ID } from './data/teams.js';
import { seasonStore } from './store.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      season: '2026-27',
      teams: seasonStore.getTeams().length,
      games: seasonStore.getGames().length,
      customEdits: seasonStore.getCustomGameCount(),
    });
  });

  app.get('/api/rankings', (_req, res) => {
    const payload = seasonStore.getRankings();
    res.json(payload);
  });

  app.post('/api/rankings/custom', (req, res) => {
    const { rpiDials, npiDials } = (req.body ?? {}) as {
      rpiDials?: Partial<RpiDials>;
      npiDials?: Partial<NpiDials>;
    };
    const payload = seasonStore.getRankings({ rpiDials, npiDials });
    res.json(payload);
  });

  app.get('/api/teams', (_req, res) => {
    res.json({ teams: seasonStore.getTeams() });
  });

  app.get('/api/teams/:id', (req, res) => {
    const dossier = seasonStore.getTeamDossier(req.params.id);
    if (!dossier) {
      res.status(404).json({ error: `Unknown team id: ${req.params.id}` });
      return;
    }
    res.json(dossier);
  });

  app.get('/api/games', (req, res) => {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const teamId = typeof req.query.teamId === 'string' ? req.query.teamId : undefined;
    const conference = typeof req.query.conference === 'string' ? req.query.conference : undefined;
    const date = typeof req.query.date === 'string' ? req.query.date : undefined;

    let list = seasonStore.getGames();
    if (status === 'final' || status === 'scheduled') {
      list = list.filter((g) => g.status === status);
    }
    if (teamId) {
      list = list.filter((g) => g.awayTeamId === teamId || g.homeTeamId === teamId);
    }
    if (conference && conference !== 'All') {
      list = list.filter(
        (g) =>
          TEAM_BY_ID[g.awayTeamId]?.conference === conference ||
          TEAM_BY_ID[g.homeTeamId]?.conference === conference,
      );
    }
    if (date) {
      list = list.filter((g) => g.date === date);
    }

    const enriched = [...list]
      .sort((a, b) => (status === 'scheduled' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)))
      .map((g) => ({
        ...g,
        awayTeam: TEAM_BY_ID[g.awayTeamId],
        homeTeam: TEAM_BY_ID[g.homeTeamId],
      }));

    res.json({
      count: enriched.length,
      customEdits: seasonStore.getCustomGameCount(),
      games: enriched,
    });
  });

  app.post('/api/games', (req, res) => {
    const body = req.body ?? {};
    const {
      id,
      date,
      awayTeamId,
      homeTeamId,
      awayScore,
      homeScore,
      isOvertime = false,
      isShootout = false,
      isNeutralSite = false,
      competition = 'Manual Entry',
    } = body;

    if (!awayTeamId || !homeTeamId || !TEAM_BY_ID[awayTeamId] || !TEAM_BY_ID[homeTeamId]) {
      res.status(400).json({ error: 'Valid awayTeamId and homeTeamId are required.' });
      return;
    }
    if (awayTeamId === homeTeamId) {
      res.status(400).json({ error: 'Away and home teams must be different.' });
      return;
    }
    const aScore = Number(awayScore);
    const hScore = Number(homeScore);
    if (!Number.isInteger(aScore) || !Number.isInteger(hScore) || aScore < 0 || hScore < 0) {
      res.status(400).json({ error: 'Scores must be non-negative integers.' });
      return;
    }

    const saved = seasonStore.addOrUpdateGame({
      id,
      date: typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : '2026-11-20',
      awayTeamId,
      homeTeamId,
      awayScore: aScore,
      homeScore: hScore,
      isOvertime: Boolean(isOvertime) || aScore === hScore,
      isShootout: Boolean(isShootout),
      isNeutralSite: Boolean(isNeutralSite),
      competition: String(competition),
      status: 'final',
    });

    res.status(201).json({
      game: saved,
      rankings: seasonStore.getRankings(),
    });
  });

  app.delete('/api/games/custom', (_req, res) => {
    seasonStore.resetGames();
    res.json({ reset: true, rankings: seasonStore.getRankings() });
  });

  app.post('/api/simulate', (req, res) => {
    const { outcomes, rpiDials, npiDials } = (req.body ?? {}) as {
      outcomes?: WhatIfOutcome[];
      rpiDials?: Partial<RpiDials>;
      npiDials?: Partial<NpiDials>;
    };
    if (!Array.isArray(outcomes)) {
      res.status(400).json({ error: 'outcomes array is required.' });
      return;
    }
    const sim = seasonStore.simulate(outcomes, { rpiDials, npiDials });
    res.json(sim);
  });

  app.post('/api/sync', async (_req, res) => {
    const result = await seasonStore.syncLive();
    res.json({
      ...result,
      rankings: seasonStore.getRankings(),
    });
  });

  app.get('/api/export/csv', (_req, res) => {
    const payload = seasonStore.getRankings();
    const header = [
      'RPI_Rank',
      'NPI_Rank',
      'Rank_Delta_RPI_minus_NPI',
      'Team',
      'Conference',
      'W',
      'L',
      'T',
      'RPI',
      'Base_RPI',
      'RPI_QWB',
      'RPI_WP',
      'RPI_OWP',
      'RPI_OOWP',
      'RPI_BadWinsRemoved',
      'NPI',
      'NPI_WgtWP',
      'NPI_SOS',
      'NPI_QWB',
      'NPI_BadWinsRemoved',
      'NPI_GoodLossesRemoved',
    ].join(',');

    const lines = payload.rankings.map((r) =>
      [
        r.rpiRank,
        r.npiRank,
        r.rankDelta,
        `"${r.team.name}"`,
        `"${r.team.conference}"`,
        r.record.wins,
        r.record.losses,
        r.record.ties,
        r.rpi.rpi.toFixed(4),
        r.rpi.baseRpi.toFixed(4),
        r.rpi.qwb.toFixed(4),
        r.rpi.wp.toFixed(4),
        r.rpi.owp.toFixed(4),
        r.rpi.oowp.toFixed(4),
        r.rpi.badWinsRemoved,
        r.npi.npi.toFixed(3),
        r.npi.weightedWp.toFixed(3),
        r.npi.sos.toFixed(3),
        r.npi.qwb.toFixed(3),
        r.npi.badWinsRemoved,
        r.npi.goodLossesRemoved,
      ].join(','),
    );

    const csv = [header, ...lines].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="ncaa-d1-mens-hockey-rpi-npi-${payload.asOfDate}.csv"`,
    );
    res.send(csv);
  });

  app.get('/api/export/json', (_req, res) => {
    const payload = seasonStore.getRankings();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="ncaa-d1-mens-hockey-rpi-npi-${payload.asOfDate}.json"`,
    );
    res.send(JSON.stringify(payload, null, 2));
  });

  // Serve built frontend in production if dist/ exists
  const distDir = path.resolve(__dirname, '../dist');
  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get(/^\/(?!api\/).*/, (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  return app;
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);

if (isDirectRun) {
  const port = Number(process.env.PORT ?? 3001);
  const app = createApp();
  app.listen(port, () => {
    console.log(`[NCAA Hockey RPI/NPI API] Listening on http://localhost:${port}`);
  });
}
