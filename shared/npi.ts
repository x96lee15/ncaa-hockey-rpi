import type {
  Game,
  GameOutcomeCode,
  NpiDials,
  NpiGameAudit,
  Team,
  TeamNpiResult,
} from './types.js';
import { DEFAULT_NPI_DIALS } from './types.js';

interface InternalTeamGame {
  game: Game;
  opponentId: string;
  location: 'H' | 'A' | 'N';
  teamScore: number;
  opponentScore: number;
  outcome: GameOutcomeCode;
  isOvertime: boolean;
  isShootout: boolean;
  winWeight: number;
  lossWeight: number;
  totalWeight: number;
  isWin: boolean;
  isLoss: boolean;
}

export function computeNpiGameWeights(
  outcome: GameOutcomeCode,
  location: 'H' | 'A' | 'N',
  dials: NpiDials,
  isPostseason = false,
): { winWeight: number; lossWeight: number; totalWeight: number } {
  const rw = isPostseason ? 1.0 : dials.roadWinWeight;
  const hw = isPostseason ? 1.0 : dials.homeWinWeight;
  const otWin = isPostseason ? 1.0 : dials.otWinShare;
  const otLoss = 1 - otWin;

  const winMult = location === 'A' ? rw : location === 'H' ? hw : 1.0;
  const lossMult = location === 'A' ? hw : location === 'H' ? rw : 1.0;

  if (outcome === 'W') {
    return { winWeight: winMult, lossWeight: 0, totalWeight: winMult };
  }
  if (outcome === 'L') {
    return { winWeight: 0, lossWeight: lossMult, totalWeight: lossMult };
  }
  if (outcome === 'T') {
    const w = 0.5 * winMult;
    const l = 0.5 * lossMult;
    return { winWeight: w, lossWeight: l, totalWeight: w + l };
  }
  if (outcome === 'OTW') {
    if (isPostseason) {
      return { winWeight: winMult, lossWeight: 0, totalWeight: winMult };
    }
    const avgBase = (rw + hw) / 2;
    const l = otLoss * lossMult;
    const w = Math.max(0, avgBase - l);
    return { winWeight: w, lossWeight: l, totalWeight: w + l };
  }
  // OTL
  if (isPostseason) {
    return { winWeight: 0, lossWeight: lossMult, totalWeight: lossMult };
  }
  const avgBase = (rw + hw) / 2;
  const w = otLoss * winMult;
  const l = Math.max(0, avgBase - w);
  return { winWeight: w, lossWeight: l, totalWeight: w + l };
}

function buildTeamGames(
  teams: Team[],
  games: Game[],
  dials: NpiDials,
): Map<string, InternalTeamGame[]> {
  const map = new Map<string, InternalTeamGame[]>();
  for (const t of teams) map.set(t.id, []);

  for (const g of games) {
    if (g.status !== 'final' || g.awayScore === null || g.homeScore === null) continue;
    if (!map.has(g.awayTeamId) || !map.has(g.homeTeamId)) continue;

    const aScore = g.awayScore;
    const hScore = g.homeScore;
    const isTie = aScore === hScore;

    const awayOutcome: GameOutcomeCode = isTie
      ? 'T'
      : aScore > hScore
        ? g.isOvertime
          ? 'OTW'
          : 'W'
        : g.isOvertime
          ? 'OTL'
          : 'L';
    const homeOutcome: GameOutcomeCode = isTie
      ? 'T'
      : hScore > aScore
        ? g.isOvertime
          ? 'OTW'
          : 'W'
        : g.isOvertime
          ? 'OTL'
          : 'L';

    const awayLoc: 'H' | 'A' | 'N' = g.isNeutralSite ? 'N' : 'A';
    const homeLoc: 'H' | 'A' | 'N' = g.isNeutralSite ? 'N' : 'H';

    const awayW = computeNpiGameWeights(awayOutcome, awayLoc, dials, Boolean(g.isPostseason));
    const homeW = computeNpiGameWeights(homeOutcome, homeLoc, dials, Boolean(g.isPostseason));

    map.get(g.awayTeamId)!.push({
      game: g,
      opponentId: g.homeTeamId,
      location: awayLoc,
      teamScore: aScore,
      opponentScore: hScore,
      outcome: awayOutcome,
      isOvertime: g.isOvertime,
      isShootout: Boolean(g.isShootout),
      ...awayW,
      isWin: awayOutcome === 'W' || awayOutcome === 'OTW',
      isLoss: awayOutcome === 'L' || awayOutcome === 'OTL',
    });

    map.get(g.homeTeamId)!.push({
      game: g,
      opponentId: g.awayTeamId,
      location: homeLoc,
      teamScore: hScore,
      opponentScore: aScore,
      outcome: homeOutcome,
      isOvertime: g.isOvertime,
      isShootout: Boolean(g.isShootout),
      ...homeW,
      isWin: homeOutcome === 'W' || homeOutcome === 'OTW',
      isLoss: homeOutcome === 'L' || homeOutcome === 'OTL',
    });
  }

  return map;
}

interface EvaluatedGame {
  tg: InternalTeamGame;
  oppNpi: number;
  qwb: number;
  numerator: number;
  gameValue: number;
  status: 'counted' | 'dropped_win' | 'dropped_loss';
}

function evaluateTeamIteration(
  teamGames: InternalTeamGame[],
  npiByTeam: Map<string, number>,
  dials: NpiDials,
): {
  npi: number;
  weightedWp: number;
  sos: number;
  qwbAvg: number;
  adjustedWins: number;
  adjustedLosses: number;
  badWinsRemoved: number;
  goodLossesRemoved: number;
  evaluated: EvaluatedGame[];
} {
  if (teamGames.length === 0) {
    return {
      npi: 50.0,
      weightedWp: 50.0,
      sos: 50.0,
      qwbAvg: 0,
      adjustedWins: 0,
      adjustedLosses: 0,
      badWinsRemoved: 0,
      goodLossesRemoved: 0,
      evaluated: [],
    };
  }

  const evaluated: EvaluatedGame[] = teamGames.map((tg) => {
    const oppNpi = npiByTeam.get(tg.opponentId) ?? 50.0;
    const qwbUnit = Math.max(0, oppNpi - dials.qwbBase) * dials.qwbMultiplier;
    const qwb = tg.winWeight * qwbUnit;
    const wpContrib = 100 * dials.wpWeight * tg.winWeight;
    const sosContrib = dials.sosWeight * oppNpi * tg.totalWeight;
    const numerator = wpContrib + sosContrib + qwb;
    const gameValue = tg.totalWeight > 0 ? numerator / tg.totalWeight : 50.0;
    return {
      tg,
      oppNpi,
      qwb,
      numerator,
      gameValue,
      status: 'counted',
    };
  });

  // Start with all games included, then iteratively apply:
  // 1) Good-loss removal: a regulation loss (or OTL) cannot increase a team's NPI.
  // 2) Bad-win removal: once a team has >= minWins retained wins, additional wins
  //    cannot decrease a team's NPI.
  const active = new Set<number>(evaluated.map((_, idx) => idx));

  const calcNpiForSet = (indices: Set<number>): number => {
    let num = 0;
    let den = 0;
    for (const i of indices) {
      num += evaluated[i].numerator;
      den += evaluated[i].tg.totalWeight;
    }
    return den > 0 ? num / den : 50.0;
  };

  // Iterative selection of active set for this team (typically converges in 1-2 passes)
  for (let pass = 0; pass < 10; pass++) {
    let changed = false;

    // Step A: Good-loss exclusion (remove losses whose value exceeds team's NPI)
    if (dials.removeGoodLosses) {
      // Sort losses by highest gameValue first (most artificially helpful losses)
      const lossIndices = evaluated
        .map((e, idx) => ({ e, idx }))
        .filter(({ e }) => e.tg.outcome === 'L')
        .sort((a, b) => b.e.gameValue - a.e.gameValue);

      for (const { e, idx } of lossIndices) {
        if (!active.has(idx) || active.size <= 1) continue;
        const currentNpi = calcNpiForSet(active);
        if (e.gameValue > currentNpi + 1e-12) {
          active.delete(idx);
          e.status = 'dropped_loss';
          changed = true;
        }
      }
    }

    // Step B: Bad-win exclusion subject to minWins retained wins dial
    if (dials.removeBadWins) {
      const winEntries = evaluated
        .map((e, idx) => ({ e, idx }))
        .filter(({ e }) => e.tg.isWin)
        .sort((a, b) => b.e.gameValue - a.e.gameValue); // highest-value wins retained first

      if (winEntries.length > dials.minWins) {
        // Re-evaluate all wins beyond the mandatory top minWins
        const baseActive = new Set<number>(active);
        for (let k = dials.minWins; k < winEntries.length; k++) {
          baseActive.delete(winEntries[k].idx);
          winEntries[k].e.status = 'dropped_win';
        }
        // Greedily add wins from highest value downward only if they raise NPI
        for (let k = dials.minWins; k < winEntries.length; k++) {
          const { e, idx } = winEntries[k];
          const curr = calcNpiForSet(baseActive);
          if (e.gameValue >= curr - 1e-12) {
            baseActive.add(idx);
            e.status = 'counted';
          }
        }
        if (baseActive.size !== active.size || [...baseActive].some((i) => !active.has(i))) {
          active.clear();
          for (const i of baseActive) active.add(i);
          changed = true;
        }
      }
    }

    if (!changed) break;
  }

  let numSum = 0;
  let denSum = 0;
  let winSum = 0;
  let lossSum = 0;
  let sosWeightedSum = 0;
  let qwbSum = 0;
  let badWinsRemoved = 0;
  let goodLossesRemoved = 0;

  for (let i = 0; i < evaluated.length; i++) {
    const e = evaluated[i];
    if (e.status === 'dropped_win') {
      badWinsRemoved++;
      continue;
    }
    if (e.status === 'dropped_loss') {
      goodLossesRemoved++;
      continue;
    }
    numSum += e.numerator;
    denSum += e.tg.totalWeight;
    winSum += e.tg.winWeight;
    lossSum += e.tg.lossWeight;
    sosWeightedSum += e.oppNpi * e.tg.totalWeight;
    qwbSum += e.qwb;
  }

  const npi = denSum > 0 ? numSum / denSum : 50.0;
  const weightedWp = denSum > 0 ? (winSum / denSum) * 100 : 50.0;
  const sos = denSum > 0 ? sosWeightedSum / denSum : 50.0;
  const qwbAvg = denSum > 0 ? qwbSum / denSum : 0;

  return {
    npi,
    weightedWp,
    sos,
    qwbAvg,
    adjustedWins: winSum,
    adjustedLosses: lossSum,
    badWinsRemoved,
    goodLossesRemoved,
    evaluated,
  };
}

export function calculateNpi(
  teams: Team[],
  games: Game[],
  dials: NpiDials = DEFAULT_NPI_DIALS,
  maxIterations = 250,
  tolerance = 1e-9,
): { results: Map<string, TeamNpiResult>; iterations: number } {
  const teamById = new Map(teams.map((t) => [t.id, t]));
  const teamGamesMap = buildTeamGames(teams, games, dials);

  let npiMap = new Map<string, number>();
  for (const t of teams) npiMap.set(t.id, 50.0);

  let iterations = 0;
  for (let iter = 1; iter <= maxIterations; iter++) {
    iterations = iter;
    const nextMap = new Map<string, number>();
    let maxDiff = 0;

    for (const t of teams) {
      const tGames = teamGamesMap.get(t.id) ?? [];
      const res = evaluateTeamIteration(tGames, npiMap, dials);
      nextMap.set(t.id, res.npi);
      maxDiff = Math.max(maxDiff, Math.abs(res.npi - (npiMap.get(t.id) ?? 50.0)));
    }

    npiMap = nextMap;
    if (maxDiff < tolerance) break;
  }

  // Final pass using converged NPIs to capture exact audits & components
  const rawResults: TeamNpiResult[] = teams.map((t) => {
    const tGames = teamGamesMap.get(t.id) ?? [];
    const evalRes = evaluateTeamIteration(tGames, npiMap, dials);

    const audits: NpiGameAudit[] = evalRes.evaluated.map((e) => ({
      gameId: e.tg.game.id,
      date: e.tg.game.date,
      opponentId: e.tg.opponentId,
      opponentName: teamById.get(e.tg.opponentId)?.name ?? e.tg.opponentId,
      opponentNpi: e.oppNpi,
      location: e.tg.location,
      teamScore: e.tg.teamScore,
      opponentScore: e.tg.opponentScore,
      outcome: e.tg.outcome,
      isOvertime: e.tg.isOvertime,
      isShootout: e.tg.isShootout,
      winWeight: e.tg.winWeight,
      lossWeight: e.tg.lossWeight,
      totalWeight: e.tg.totalWeight,
      qwb: e.qwb,
      gameNpiValue: e.gameValue,
      status: e.status,
    }));

    return {
      teamId: t.id,
      rank: 0,
      npi: evalRes.npi,
      weightedWp: evalRes.weightedWp,
      weightedWpRank: 0,
      sos: evalRes.sos,
      sosRank: 0,
      qwb: evalRes.qwbAvg,
      adjustedWins: evalRes.adjustedWins,
      adjustedLosses: evalRes.adjustedLosses,
      badWinsRemoved: evalRes.badWinsRemoved,
      goodLossesRemoved: evalRes.goodLossesRemoved,
      iterations,
      games: audits,
    };
  });

  // Assign ranks (NPI, Wgt W%, SOS)
  const byNpi = [...rawResults].sort((a, b) => b.npi - a.npi || b.weightedWp - a.weightedWp);
  byNpi.forEach((r, idx) => {
    r.rank = idx + 1;
  });

  const byWp = [...rawResults].sort((a, b) => b.weightedWp - a.weightedWp);
  byWp.forEach((r, idx) => {
    r.weightedWpRank = idx + 1;
  });

  const bySos = [...rawResults].sort((a, b) => b.sos - a.sos);
  bySos.forEach((r, idx) => {
    r.sosRank = idx + 1;
  });

  const resultMap = new Map<string, TeamNpiResult>();
  for (const r of rawResults) resultMap.set(r.teamId, r);

  return { results: resultMap, iterations };
}
