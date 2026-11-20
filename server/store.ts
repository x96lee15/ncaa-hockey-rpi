import { computeCombinedRankings, simulateWhatIf } from '../shared/compare.js';
import type {
  Game,
  NpiDials,
  RankingsPayload,
  RpiDials,
  SimulationResponse,
  WhatIfOutcome,
} from '../shared/types.js';
import { RAW_SCHEDULE_2026_27 } from './data/rawSchedule2026_27.js';
import { D1_MENS_TEAMS, USCHO_NPI_REFERENCE_2026_11_20 } from './data/teams.js';
import {
  CHI_COMPOSITE_URL,
  fetchLiveChiSchedule,
  parseStructuredSchedule,
} from './scrapers/chiParser.js';

const REFERENCE_MAP = Object.fromEntries(
  Object.entries(USCHO_NPI_REFERENCE_2026_11_20).map(([id, v]) => [
    id,
    { rank: v.rank, npi: v.npi },
  ]),
);

class SeasonStore {
  private baseGames: Game[];
  private games: Game[];
  private customGameIds = new Set<string>();
  private sourceInfo: RankingsPayload['sourceInfo'];

  constructor() {
    const parsed = parseStructuredSchedule(RAW_SCHEDULE_2026_27);
    this.baseGames = parsed.games;
    this.games = parsed.games.map((g) => ({ ...g }));
    this.sourceInfo = {
      name: 'College Hockey, Inc. 2026-27 Composite Schedule (Verified vs. USCHO)',
      url: CHI_COMPOSITE_URL,
      lastSyncedAt: '2026-11-20T06:05:19-05:00',
      mode: 'snapshot',
    };
  }

  getTeams() {
    return D1_MENS_TEAMS;
  }

  getGames(): Game[] {
    return this.games;
  }

  getCustomGameCount(): number {
    return this.customGameIds.size;
  }

  getRankings(options?: {
    rpiDials?: Partial<RpiDials>;
    npiDials?: Partial<NpiDials>;
  }): RankingsPayload {
    return computeCombinedRankings(D1_MENS_TEAMS, this.games, {
      rpiDials: options?.rpiDials,
      npiDials: options?.npiDials,
      season: '2026-27',
      referenceNpi: this.customGameIds.size === 0 ? REFERENCE_MAP : undefined,
      sourceInfo: this.sourceInfo,
    });
  }

  getTeamDossier(teamId: string, options?: { rpiDials?: Partial<RpiDials>; npiDials?: Partial<NpiDials> }) {
    const payload = this.getRankings(options);
    const row = payload.rankings.find((r) => r.team.id === teamId);
    if (!row) return null;

    const upcomingGames = this.games
      .filter((g) => g.status === 'scheduled' && (g.awayTeamId === teamId || g.homeTeamId === teamId))
      .sort((a, b) => a.date.localeCompare(b.date));

    const rankByTeam = Object.fromEntries(
      payload.rankings.map((r) => [
        r.team.id,
        { rpiRank: r.rpiRank, npiRank: r.npiRank, npi: r.npi.npi, rpi: r.rpi.rpi, name: r.team.name, abbr: r.team.abbr },
      ]),
    );

    return {
      season: payload.season,
      asOfDate: payload.asOfDate,
      row,
      uschoReference: USCHO_NPI_REFERENCE_2026_11_20[teamId] ?? null,
      upcomingGames: upcomingGames.map((g) => {
        const isHome = g.homeTeamId === teamId;
        const oppId = isHome ? g.awayTeamId : g.homeTeamId;
        return {
          ...g,
          location: g.isNeutralSite ? 'N' : isHome ? 'H' : 'A',
          opponent: rankByTeam[oppId] ?? null,
        };
      }),
      rankByTeam,
    };
  }

  addOrUpdateGame(input: Omit<Game, 'id'> & { id?: string }): Game {
    if (input.id) {
      const idx = this.games.findIndex((g) => g.id === input.id);
      if (idx !== -1) {
        const updated: Game = { ...this.games[idx], ...input, id: input.id };
        this.games[idx] = updated;
        this.customGameIds.add(updated.id);
        return updated;
      }
    }
    const id = input.id || `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const created: Game = { ...input, id };
    this.games.push(created);
    this.customGameIds.add(id);
    return created;
  }

  resetGames(): void {
    this.games = this.baseGames.map((g) => ({ ...g }));
    this.customGameIds.clear();
  }

  simulate(
    outcomes: WhatIfOutcome[],
    options?: { rpiDials?: Partial<RpiDials>; npiDials?: Partial<NpiDials> },
  ): SimulationResponse {
    return simulateWhatIf(D1_MENS_TEAMS, this.games, outcomes, {
      rpiDials: options?.rpiDials,
      npiDials: options?.npiDials,
      referenceNpi: this.customGameIds.size === 0 ? REFERENCE_MAP : undefined,
      sourceInfo: this.sourceInfo,
    });
  }

  async syncLive(): Promise<{
    synced: boolean;
    message: string;
    completedGamesCount: number;
    mode: 'live' | 'snapshot';
  }> {
    try {
      const parsed = await fetchLiveChiSchedule(7000);
      const liveFinals = parsed.games.filter((g) => g.status === 'final');
      if (liveFinals.length >= this.baseGames.filter((g) => g.status === 'final').length) {
        this.baseGames = parsed.games;
        this.games = parsed.games.map((g) => ({ ...g }));
        this.customGameIds.clear();
        this.sourceInfo = {
          name: 'College Hockey, Inc. Live Composite Schedule',
          url: CHI_COMPOSITE_URL,
          lastSyncedAt: new Date().toISOString(),
          mode: 'live',
        };
        return {
          synced: true,
          message: `Synced ${liveFinals.length} completed 2026-27 games live from College Hockey, Inc.`,
          completedGamesCount: liveFinals.length,
          mode: 'live',
        };
      }
      return {
        synced: false,
        message: 'Live schedule contained fewer completed games than local snapshot; retained verified Nov 20, 2026 dataset.',
        completedGamesCount: this.games.filter((g) => g.status === 'final').length,
        mode: this.sourceInfo.mode,
      };
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      return {
        synced: false,
        message: `Live fetch unavailable (${reason}). Serving verified 2026-27 season snapshot through Nov 19, 2026.`,
        completedGamesCount: this.games.filter((g) => g.status === 'final').length,
        mode: this.sourceInfo.mode,
      };
    }
  }
}

export const seasonStore = new SeasonStore();
