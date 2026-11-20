export type Conference =
  | 'Big Ten'
  | 'NCHC'
  | 'Hockey East'
  | 'ECAC'
  | 'CCHA'
  | 'AHA'
  | 'Independent';

export interface Team {
  id: string;
  name: string;
  shortName: string;
  abbr: string;
  conference: Conference;
  primaryColor: string;
}

export type GameStatus = 'final' | 'scheduled';

export type GameOutcomeCode = 'W' | 'OTW' | 'T' | 'OTL' | 'L';

export interface Game {
  id: string;
  date: string; // YYYY-MM-DD
  awayTeamId: string;
  homeTeamId: string;
  awayScore: number | null;
  homeScore: number | null;
  isOvertime: boolean;
  isShootout?: boolean;
  isNeutralSite: boolean;
  isPostseason?: boolean;
  competition: string;
  venueNote?: string;
  status: GameStatus;
}

export interface RpiDials {
  wpWeight: number; // 0.25
  owpWeight: number; // 0.21
  oowpWeight: number; // 0.54
  roadWinWeight: number; // 1.2 (also home loss weight)
  homeWinWeight: number; // 0.8 (also road loss weight)
  otWinShare: number; // 0.55 (classic NCAA D-I 3v3 OT) or 0.60
  removeBadWins: boolean; // true
  includeQwb: boolean; // true
}

export interface NpiDials {
  wpWeight: number; // 0.25
  sosWeight: number; // 0.75
  roadWinWeight: number; // 1.2
  homeWinWeight: number; // 0.8
  otWinShare: number; // 0.60
  qwbBase: number; // 51.0
  qwbMultiplier: number; // 0.5
  minWins: number; // 12
  removeBadWins: boolean; // true
  removeGoodLosses: boolean; // true
}

export const DEFAULT_RPI_DIALS: RpiDials = {
  wpWeight: 0.25,
  owpWeight: 0.21,
  oowpWeight: 0.54,
  roadWinWeight: 1.2,
  homeWinWeight: 0.8,
  otWinShare: 0.55,
  removeBadWins: true,
  includeQwb: true,
};

export const DEFAULT_NPI_DIALS: NpiDials = {
  wpWeight: 0.25,
  sosWeight: 0.75,
  roadWinWeight: 1.2,
  homeWinWeight: 0.8,
  otWinShare: 0.60,
  qwbBase: 51.0,
  qwbMultiplier: 0.5,
  minWins: 12,
  removeBadWins: true,
  removeGoodLosses: true,
};

export interface TeamRecord {
  wins: number;
  losses: number;
  ties: number;
  otWins: number;
  otLosses: number;
  homeWins: number;
  homeLosses: number;
  homeTies: number;
  roadWins: number;
  roadLosses: number;
  roadTies: number;
  neutralWins: number;
  neutralLosses: number;
  neutralTies: number;
  goalsFor: number;
  goalsAgainst: number;
  gamesPlayed: number;
}

export interface RpiGameAudit {
  gameId: string;
  date: string;
  opponentId: string;
  opponentName: string;
  location: 'H' | 'A' | 'N';
  teamScore: number;
  opponentScore: number;
  outcome: GameOutcomeCode;
  isOvertime: boolean;
  isShootout: boolean;
  weightedWins: number;
  weightedGames: number;
  opponentWpExclSelf: number;
  excludedBadWin: boolean;
  qwbBonus: number;
}

export interface TeamRpiResult {
  teamId: string;
  rank: number;
  baseRpi: number; // 0..1 scale before QWB
  qwb: number; // Top-20 quality wins bonus
  rpi: number; // Final RPI (0..1 scale)
  wp: number; // Weighted WP (0..1)
  rawWp: number; // Unweighted WP (0..1)
  owp: number; // Opponents' WP (0..1)
  oowp: number; // Opponents' Opponents' WP (0..1)
  wpRank: number;
  owpRank: number;
  oowpRank: number;
  badWinsRemoved: number;
  adjustedGamesCount: number;
  games: RpiGameAudit[];
}

export interface NpiGameAudit {
  gameId: string;
  date: string;
  opponentId: string;
  opponentName: string;
  opponentNpi: number;
  location: 'H' | 'A' | 'N';
  teamScore: number;
  opponentScore: number;
  outcome: GameOutcomeCode;
  isOvertime: boolean;
  isShootout: boolean;
  winWeight: number;
  lossWeight: number;
  totalWeight: number;
  qwb: number;
  gameNpiValue: number; // Effective per-game NPI contribution (0..100+ scale)
  status: 'counted' | 'dropped_win' | 'dropped_loss';
}

export interface TeamNpiResult {
  teamId: string;
  rank: number;
  npi: number; // 0..100 scale
  weightedWp: number; // 0..100 scale
  weightedWpRank: number;
  sos: number; // 0..100 scale
  sosRank: number;
  qwb: number; // Avg QWB per weighted game
  adjustedWins: number;
  adjustedLosses: number;
  badWinsRemoved: number;
  goodLossesRemoved: number;
  iterations: number;
  games: NpiGameAudit[];
}

export interface CombinedRankingRow {
  team: Team;
  record: TeamRecord;
  rpiRank: number;
  npiRank: number;
  rankDelta: number; // rpiRank - npiRank (positive => ranked higher in NPI; negative => ranked higher in RPI)
  rpi: TeamRpiResult;
  npi: TeamNpiResult;
  uschoReferenceNpi?: number;
  uschoReferenceRank?: number;
}

export interface ConferenceSummary {
  conference: Conference;
  teamCount: number;
  avgRpi: number;
  avgNpi: number;
  top16RpiCount: number;
  top16NpiCount: number;
  topTeamByRpi: string;
  topTeamByNpi: string;
  nonConfWins: number;
  nonConfLosses: number;
  nonConfTies: number;
}

export interface RankingsPayload {
  season: string;
  asOfDate: string;
  totalTeams: number;
  completedGamesCount: number;
  scheduledGamesCount: number;
  rpiDials: RpiDials;
  npiDials: NpiDials;
  npiIterations: number;
  rankings: CombinedRankingRow[];
  conferences: ConferenceSummary[];
  sourceInfo: {
    name: string;
    url: string;
    lastSyncedAt: string;
    mode: 'live' | 'snapshot';
  };
}

export interface WhatIfOutcome {
  gameId: string;
  awayTeamId: string;
  homeTeamId: string;
  awayScore: number;
  homeScore: number;
  isOvertime: boolean;
  isNeutralSite?: boolean;
}

export interface TeamSimulationDelta {
  teamId: string;
  teamName: string;
  abbr: string;
  conference: Conference;
  beforeRpiRank: number;
  afterRpiRank: number;
  rpiRankChange: number; // positive = moved UP
  beforeRpi: number;
  afterRpi: number;
  beforeNpiRank: number;
  afterNpiRank: number;
  npiRankChange: number; // positive = moved UP
  beforeNpi: number;
  afterNpi: number;
}

export interface SimulationResponse {
  appliedGames: number;
  baseline: RankingsPayload;
  simulated: RankingsPayload;
  movers: TeamSimulationDelta[];
}
