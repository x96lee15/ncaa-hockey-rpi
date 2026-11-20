import type {
  Game,
  GameOutcomeCode,
  RpiDials,
  RpiGameAudit,
  Team,
  TeamRpiResult,
} from './types.js';
import { DEFAULT_RPI_DIALS } from './types.js';

interface RpiTeamGame {
  game: Game;
  opponentId: string;
  location: 'H' | 'A' | 'N';
  teamScore: number;
  opponentScore: number;
  outcome: GameOutcomeCode;
  isOvertime: boolean;
  isShootout: boolean;
  rawWins: number;
  weightedWins: number;
  weightedGames: number;
  isWin: boolean;
}

export function computeRpiGameWeights(
  outcome: GameOutcomeCode,
  location: 'H' | 'A' | 'N',
  dials: RpiDials,
  isPostseason = false,
): { rawWins: number; weightedWins: number; weightedGames: number } {
  const rw = isPostseason ? 1.0 : dials.roadWinWeight;
  const hw = isPostseason ? 1.0 : dials.homeWinWeight;
  const otWin = isPostseason ? 1.0 : dials.otWinShare;
  const otLoss = 1 - otWin;

  const winMult = location === 'A' ? rw : location === 'H' ? hw : 1.0;
  const lossMult = location === 'A' ? hw : location === 'H' ? rw : 1.0;

  if (outcome === 'W') {
    return { rawWins: 1.0, weightedWins: winMult, weightedGames: winMult };
  }
  if (outcome === 'L') {
    return { rawWins: 0.0, weightedWins: 0, weightedGames: lossMult };
  }
  if (outcome === 'T') {
    const w = 0.5 * winMult;
    const l = 0.5 * lossMult;
    return { rawWins: 0.5, weightedWins: w, weightedGames: w + l };
  }
  if (outcome === 'OTW') {
    const w = otWin * winMult;
    const l = otLoss * lossMult;
    return { rawWins: otWin, weightedWins: w, weightedGames: w + l };
  }
  // OTL
  const w = otLoss * winMult;
  const l = otWin * lossMult;
  return { rawWins: otLoss, weightedWins: w, weightedGames: w + l };
}

/**
 * Classic NCAA Division I Men's Ice Hockey RPI:
 *   Base RPI = wpWeight * WP + owpWeight * OWP + oowpWeight * OOWP
 *   Default NCAA Hockey weights: 25% WP + 21% OWP + 54% OOWP
 *   Home/Road weighting on WP: 1.2 road win / home loss, 0.8 home win / road loss, 1.0 neutral
 *   3-on-3 OT split: 55/45 (configurable)
 *   OWP: Average of each opponent's unweighted WP excluding head-to-head games against the evaluated team
 *   OOWP: Average of each opponent's OWP
 *   Bad-win removal: Removes any win(s) that lower a team's base RPI (marked with '*')
 *   Quality Wins Bonus (QWB): Sliding scale for wins vs. top-20 RPI opponents
 *     (0.0020 for #1 down to 0.0001 for #20, scaled by otWinShare for OT wins)
 */
export function calculateRpi(
  teams: Team[],
  games: Game[],
  dials: RpiDials = DEFAULT_RPI_DIALS,
): Map<string, TeamRpiResult> {
  const teamById = new Map(teams.map((t) => [t.id, t]));
  const gamesByTeam = new Map<string, RpiTeamGame[]>();
  for (const t of teams) gamesByTeam.set(t.id, []);

  for (const g of games) {
    if (g.status !== 'final' || g.awayScore === null || g.homeScore === null) continue;
    if (!gamesByTeam.has(g.awayTeamId) || !gamesByTeam.has(g.homeTeamId)) continue;

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

    const awayW = computeRpiGameWeights(awayOutcome, awayLoc, dials, Boolean(g.isPostseason));
    const homeW = computeRpiGameWeights(homeOutcome, homeLoc, dials, Boolean(g.isPostseason));

    gamesByTeam.get(g.awayTeamId)!.push({
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
    });

    gamesByTeam.get(g.homeTeamId)!.push({
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
    });
  }

  // Helper: unweighted WP of `subjectId` excluding games against `excludeOpponentId`
  const getUnweightedWpExcl = (subjectId: string, excludeOpponentId?: string): number => {
    const list = gamesByTeam.get(subjectId) ?? [];
    let w = 0;
    let count = 0;
    for (const tg of list) {
      if (excludeOpponentId && tg.opponentId === excludeOpponentId) continue;
      w += tg.rawWins;
      count += 1;
    }
    return count > 0 ? w / count : 0.5;
  };

  // Precompute full OWP for every team (used to compute OOWP)
  const fullOwp = new Map<string, number>();
  for (const t of teams) {
    const list = gamesByTeam.get(t.id) ?? [];
    if (list.length === 0) {
      fullOwp.set(t.id, 0.5);
      continue;
    }
    let sum = 0;
    for (const tg of list) {
      sum += getUnweightedWpExcl(tg.opponentId, t.id);
    }
    fullOwp.set(t.id, sum / list.length);
  }

  // Normalize weights in case user modified sliders
  const weightSum = dials.wpWeight + dials.owpWeight + dials.oowpWeight;
  const wWp = weightSum > 0 ? dials.wpWeight / weightSum : 0.25;
  const wOwp = weightSum > 0 ? dials.owpWeight / weightSum : 0.21;
  const wOowp = weightSum > 0 ? dials.oowpWeight / weightSum : 0.54;

  // Compute Base RPI + optional bad-win removal for each team
  const provisional: TeamRpiResult[] = teams.map((t) => {
    const list = gamesByTeam.get(t.id) ?? [];
    const rawWp = getUnweightedWpExcl(t.id);

    if (list.length === 0) {
      return {
        teamId: t.id,
        rank: 0,
        baseRpi: 0.5,
        qwb: 0,
        rpi: 0.5,
        wp: 0.5,
        rawWp: 0.5,
        owp: 0.5,
        oowp: 0.5,
        wpRank: 0,
        owpRank: 0,
        oowpRank: 0,
        badWinsRemoved: 0,
        adjustedGamesCount: 0,
        games: [],
      };
    }

    const oppWpPerGame = list.map((tg) => getUnweightedWpExcl(tg.opponentId, t.id));
    const oppOwpPerGame = list.map((tg) => fullOwp.get(tg.opponentId) ?? 0.5);

    const evaluateSubset = (excluded: Set<number>) => {
      let wWins = 0;
      let wGames = 0;
      let owpSum = 0;
      let oowpSum = 0;
      let count = 0;
      for (let i = 0; i < list.length; i++) {
        if (excluded.has(i)) continue;
        wWins += list[i].weightedWins;
        wGames += list[i].weightedGames;
        owpSum += oppWpPerGame[i];
        oowpSum += oppOwpPerGame[i];
        count++;
      }
      const wp = wGames > 0 ? wWins / wGames : 0.5;
      const owp = count > 0 ? owpSum / count : 0.5;
      const oowp = count > 0 ? oowpSum / count : 0.5;
      const baseRpi = wWp * wp + wOwp * owp + wOowp * oowp;
      return { wp, owp, oowp, baseRpi, count };
    };

    const excluded = new Set<number>();
    const full = evaluateSubset(excluded);
    let best = full;

    if (dials.removeBadWins && list.length > 1) {
      // Single-pass NCAA Hockey bad-win rule: only exclude a win whose own
      // contribution falls below the team's full-schedule Base RPI (prevents
      // undefeated teams from cascading down to a single opponent).
      const candidates: Array<{ idx: number; gameRpi: number }> = [];
      for (let i = 0; i < list.length; i++) {
        if (!list[i].isWin) continue;
        const gameWp = list[i].weightedGames > 0 ? list[i].weightedWins / list[i].weightedGames : 1;
        const gameRpi = wWp * gameWp + wOwp * oppWpPerGame[i] + wOowp * oppOwpPerGame[i];
        if (gameRpi < full.baseRpi - 1e-12) {
          candidates.push({ idx: i, gameRpi });
        }
      }
      // Remove weakest wins first, verifying each removal raises Base RPI
      candidates.sort((a, b) => a.gameRpi - b.gameRpi);
      for (const c of candidates) {
        if (list.length - excluded.size <= 1) break;
        excluded.add(c.idx);
        const next = evaluateSubset(excluded);
        if (next.baseRpi > best.baseRpi + 1e-12) {
          best = next;
        } else {
          excluded.delete(c.idx);
        }
      }
    }

    const audits: RpiGameAudit[] = list.map((tg, idx) => ({
      gameId: tg.game.id,
      date: tg.game.date,
      opponentId: tg.opponentId,
      opponentName: teamById.get(tg.opponentId)?.name ?? tg.opponentId,
      location: tg.location,
      teamScore: tg.teamScore,
      opponentScore: tg.opponentScore,
      outcome: tg.outcome,
      isOvertime: tg.isOvertime,
      isShootout: tg.isShootout,
      weightedWins: tg.weightedWins,
      weightedGames: tg.weightedGames,
      opponentWpExclSelf: oppWpPerGame[idx],
      excludedBadWin: excluded.has(idx),
      qwbBonus: 0,
    }));

    return {
      teamId: t.id,
      rank: 0,
      baseRpi: best.baseRpi,
      qwb: 0,
      rpi: best.baseRpi,
      wp: best.wp,
      rawWp,
      owp: best.owp,
      oowp: best.oowp,
      wpRank: 0,
      owpRank: 0,
      oowpRank: 0,
      badWinsRemoved: excluded.size,
      adjustedGamesCount: best.count,
      games: audits,
    };
  });

  // Top-20 Quality Wins Bonus (QWB) based on Base RPI ranking:
  // Classic NCAA Hockey QWB awards 0.0020 for beating #1 down to 0.0001 for beating #20
  // (scaled by otWinShare for 3-on-3 OT wins).
  if (dials.includeQwb) {
    const baseRanked = [...provisional].sort((a, b) => b.baseRpi - a.baseRpi);
    const baseRankMap = new Map<string, number>();
    baseRanked.forEach((r, idx) => baseRankMap.set(r.teamId, idx + 1));

    for (const r of provisional) {
      let totalQwb = 0;
      for (const ga of r.games) {
        if (ga.excludedBadWin) continue;
        if (ga.outcome !== 'W' && ga.outcome !== 'OTW') continue;
        const oppRank = baseRankMap.get(ga.opponentId) ?? 99;
        if (oppRank <= 20) {
          const baseBonus = (21 - oppRank) * 0.0001;
          const bonus = ga.outcome === 'OTW' ? baseBonus * dials.otWinShare : baseBonus;
          ga.qwbBonus = bonus;
          totalQwb += bonus;
        }
      }
      r.qwb = totalQwb;
      r.rpi = r.baseRpi + totalQwb;
    }
  }

  // Assign final ranks
  const byRpi = [...provisional].sort((a, b) => b.rpi - a.rpi || b.wp - a.wp);
  byRpi.forEach((r, idx) => {
    r.rank = idx + 1;
  });

  const byWp = [...provisional].sort((a, b) => b.wp - a.wp);
  byWp.forEach((r, idx) => {
    r.wpRank = idx + 1;
  });

  const byOwp = [...provisional].sort((a, b) => b.owp - a.owp);
  byOwp.forEach((r, idx) => {
    r.owpRank = idx + 1;
  });

  const byOowp = [...provisional].sort((a, b) => b.oowp - a.oowp);
  byOowp.forEach((r, idx) => {
    r.oowpRank = idx + 1;
  });

  const resultMap = new Map<string, TeamRpiResult>();
  for (const r of provisional) resultMap.set(r.teamId, r);
  return resultMap;
}
