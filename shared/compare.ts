import { calculateNpi } from './npi.js';
import { calculateRpi } from './rpi.js';
import type {
  CombinedRankingRow,
  Conference,
  ConferenceSummary,
  Game,
  NpiDials,
  RankingsPayload,
  RpiDials,
  SimulationResponse,
  Team,
  TeamRecord,
  TeamSimulationDelta,
  WhatIfOutcome,
} from './types.js';
import { DEFAULT_NPI_DIALS, DEFAULT_RPI_DIALS } from './types.js';

export function computeTeamRecords(teams: Team[], games: Game[]): Map<string, TeamRecord> {
  const map = new Map<string, TeamRecord>();
  for (const t of teams) {
    map.set(t.id, {
      wins: 0,
      losses: 0,
      ties: 0,
      otWins: 0,
      otLosses: 0,
      homeWins: 0,
      homeLosses: 0,
      homeTies: 0,
      roadWins: 0,
      roadLosses: 0,
      roadTies: 0,
      neutralWins: 0,
      neutralLosses: 0,
      neutralTies: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      gamesPlayed: 0,
    });
  }

  for (const g of games) {
    if (g.status !== 'final' || g.awayScore === null || g.homeScore === null) continue;
    const away = map.get(g.awayTeamId);
    const home = map.get(g.homeTeamId);
    if (!away || !home) continue;

    away.gamesPlayed++;
    home.gamesPlayed++;
    away.goalsFor += g.awayScore;
    away.goalsAgainst += g.homeScore;
    home.goalsFor += g.homeScore;
    home.goalsAgainst += g.awayScore;

    if (g.awayScore > g.homeScore) {
      away.wins++;
      home.losses++;
      if (g.isOvertime) {
        away.otWins++;
        home.otLosses++;
      }
      if (g.isNeutralSite) {
        away.neutralWins++;
        home.neutralLosses++;
      } else {
        away.roadWins++;
        home.homeLosses++;
      }
    } else if (g.homeScore > g.awayScore) {
      home.wins++;
      away.losses++;
      if (g.isOvertime) {
        home.otWins++;
        away.otLosses++;
      }
      if (g.isNeutralSite) {
        home.neutralWins++;
        away.neutralLosses++;
      } else {
        home.homeWins++;
        away.roadLosses++;
      }
    } else {
      away.ties++;
      home.ties++;
      if (g.isNeutralSite) {
        away.neutralTies++;
        home.neutralTies++;
      } else {
        away.roadTies++;
        home.homeTies++;
      }
    }
  }

  return map;
}

export function buildConferenceSummaries(
  rows: CombinedRankingRow[],
  games: Game[],
): ConferenceSummary[] {
  const confOrder: Conference[] = [
    'Big Ten',
    'NCHC',
    'Hockey East',
    'ECAC',
    'CCHA',
    'AHA',
    'Independent',
  ];

  const teamConfMap = new Map(rows.map((r) => [r.team.id, r.team.conference]));

  return confOrder.map((conf) => {
    const members = rows.filter((r) => r.team.conference === conf);
    const count = members.length || 1;
    const avgRpi = members.reduce((s, r) => s + r.rpi.rpi, 0) / count;
    const avgNpi = members.reduce((s, r) => s + r.npi.npi, 0) / count;
    const top16RpiCount = members.filter((r) => r.rpiRank <= 16).length;
    const top16NpiCount = members.filter((r) => r.npiRank <= 16).length;

    const topRpi = [...members].sort((a, b) => a.rpiRank - b.rpiRank)[0]?.team.name ?? '—';
    const topNpi = [...members].sort((a, b) => a.npiRank - b.npiRank)[0]?.team.name ?? '—';

    let nonConfWins = 0;
    let nonConfLosses = 0;
    let nonConfTies = 0;

    for (const g of games) {
      if (g.status !== 'final' || g.awayScore === null || g.homeScore === null) continue;
      const aConf = teamConfMap.get(g.awayTeamId);
      const hConf = teamConfMap.get(g.homeTeamId);
      if (aConf === hConf) continue;

      if (aConf === conf) {
        if (g.awayScore > g.homeScore) nonConfWins++;
        else if (g.awayScore < g.homeScore) nonConfLosses++;
        else nonConfTies++;
      }
      if (hConf === conf) {
        if (g.homeScore > g.awayScore) nonConfWins++;
        else if (g.homeScore < g.awayScore) nonConfLosses++;
        else nonConfTies++;
      }
    }

    return {
      conference: conf,
      teamCount: members.length,
      avgRpi,
      avgNpi,
      top16RpiCount,
      top16NpiCount,
      topTeamByRpi: topRpi,
      topTeamByNpi: topNpi,
      nonConfWins,
      nonConfLosses,
      nonConfTies,
    };
  }).sort((a, b) => b.avgNpi - a.avgNpi);
}

export interface ReferenceNpiMap {
  [teamId: string]: { rank: number; npi: number };
}

export function computeCombinedRankings(
  teams: Team[],
  games: Game[],
  options?: {
    rpiDials?: Partial<RpiDials>;
    npiDials?: Partial<NpiDials>;
    season?: string;
    asOfDate?: string;
    referenceNpi?: ReferenceNpiMap;
    sourceInfo?: RankingsPayload['sourceInfo'];
  },
): RankingsPayload {
  const rpiDials: RpiDials = { ...DEFAULT_RPI_DIALS, ...options?.rpiDials };
  const npiDials: NpiDials = { ...DEFAULT_NPI_DIALS, ...options?.npiDials };

  const records = computeTeamRecords(teams, games);
  const rpiMap = calculateRpi(teams, games, rpiDials);
  const { results: npiMap, iterations } = calculateNpi(teams, games, npiDials);

  const rankings: CombinedRankingRow[] = teams
    .map((team) => {
      const rpi = rpiMap.get(team.id)!;
      const npi = npiMap.get(team.id)!;
      const record = records.get(team.id)!;
      const ref = options?.referenceNpi?.[team.id];
      return {
        team,
        record,
        rpiRank: rpi.rank,
        npiRank: npi.rank,
        rankDelta: rpi.rank - npi.rank,
        rpi,
        npi,
        uschoReferenceNpi: ref?.npi,
        uschoReferenceRank: ref?.rank,
      };
    })
    .sort((a, b) => a.rpiRank - b.rpiRank);

  const completedGames = games.filter((g) => g.status === 'final');
  const scheduledGames = games.filter((g) => g.status === 'scheduled');
  const latestFinalDate =
    completedGames.reduce((max, g) => (g.date > max ? g.date : max), '2026-10-02');

  return {
    season: options?.season ?? '2026-27',
    asOfDate: options?.asOfDate ?? latestFinalDate,
    totalTeams: teams.length,
    completedGamesCount: completedGames.length,
    scheduledGamesCount: scheduledGames.length,
    rpiDials,
    npiDials,
    npiIterations: iterations,
    rankings,
    conferences: buildConferenceSummaries(rankings, games),
    sourceInfo: options?.sourceInfo ?? {
      name: 'College Hockey, Inc. 2026-27 Composite Schedule',
      url: 'https://www.collegehockeyinc.com/men/compnatfull27.php',
      lastSyncedAt: new Date().toISOString(),
      mode: 'snapshot',
    },
  };
}

export function simulateWhatIf(
  teams: Team[],
  baseGames: Game[],
  outcomes: WhatIfOutcome[],
  options?: {
    rpiDials?: Partial<RpiDials>;
    npiDials?: Partial<NpiDials>;
    referenceNpi?: ReferenceNpiMap;
    sourceInfo?: RankingsPayload['sourceInfo'];
  },
): SimulationResponse {
  const baseline = computeCombinedRankings(teams, baseGames, options);

  const outcomeById = new Map(outcomes.map((o) => [o.gameId, o]));
  const updatedGames: Game[] = baseGames.map((g) => {
    const sim = outcomeById.get(g.id);
    if (!sim) return g;
    return {
      ...g,
      awayScore: sim.awayScore,
      homeScore: sim.homeScore,
      isOvertime: sim.isOvertime,
      isNeutralSite: sim.isNeutralSite ?? g.isNeutralSite,
      status: 'final',
    };
  });

  // Also allow brand-new custom hypothetical games not already in baseGames
  const existingIds = new Set(baseGames.map((g) => g.id));
  for (const o of outcomes) {
    if (!existingIds.has(o.gameId)) {
      updatedGames.push({
        id: o.gameId,
        date: '2026-11-20',
        awayTeamId: o.awayTeamId,
        homeTeamId: o.homeTeamId,
        awayScore: o.awayScore,
        homeScore: o.homeScore,
        isOvertime: o.isOvertime,
        isNeutralSite: Boolean(o.isNeutralSite),
        competition: 'Simulated',
        status: 'final',
      });
    }
  }

  const simulated = computeCombinedRankings(teams, updatedGames, options);

  const baseById = new Map(baseline.rankings.map((r) => [r.team.id, r]));
  const simById = new Map(simulated.rankings.map((r) => [r.team.id, r]));

  const movers: TeamSimulationDelta[] = teams
    .map((t) => {
      const b = baseById.get(t.id)!;
      const s = simById.get(t.id)!;
      return {
        teamId: t.id,
        teamName: t.name,
        abbr: t.abbr,
        conference: t.conference,
        beforeRpiRank: b.rpiRank,
        afterRpiRank: s.rpiRank,
        rpiRankChange: b.rpiRank - s.rpiRank,
        beforeRpi: b.rpi.rpi,
        afterRpi: s.rpi.rpi,
        beforeNpiRank: b.npiRank,
        afterNpiRank: s.npiRank,
        npiRankChange: b.npiRank - s.npiRank,
        beforeNpi: b.npi.npi,
        afterNpi: s.npi.npi,
      };
    })
    .sort(
      (a, b) =>
        Math.abs(b.rpiRankChange) +
        Math.abs(b.npiRankChange) -
        (Math.abs(a.rpiRankChange) + Math.abs(a.npiRankChange)),
    );

  return {
    appliedGames: outcomes.length,
    baseline,
    simulated,
    movers,
  };
}
