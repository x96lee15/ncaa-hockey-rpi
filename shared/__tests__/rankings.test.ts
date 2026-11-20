import { describe, expect, it } from 'vitest';
import { RAW_SCHEDULE_2026_27 } from '../../server/data/rawSchedule2026_27.js';
import { D1_MENS_TEAMS, USCHO_NPI_REFERENCE_2026_11_20 } from '../../server/data/teams.js';
import { parseStructuredSchedule } from '../../server/scrapers/chiParser.js';
import { computeCombinedRankings, simulateWhatIf } from '../compare.js';
import { calculateNpi } from '../npi.js';
import { calculateRpi } from '../rpi.js';
import { DEFAULT_NPI_DIALS, DEFAULT_RPI_DIALS } from '../types.js';
import type { Game, Team } from '../types.js';

describe('2026-27 NCAA D-I Men\'s Ice Hockey RPI & NPI Engine', () => {
  const parsed = parseStructuredSchedule(RAW_SCHEDULE_2026_27);

  it('parses all 2026-27 schedule lines cleanly with exact W-L-T match across all 62 teams', () => {
    expect(parsed.unparsedLines).toHaveLength(0);
    const payload = computeCombinedRankings(D1_MENS_TEAMS, parsed.games);
    expect(payload.totalTeams).toBe(62);
    expect(payload.completedGamesCount).toBe(334);

    for (const row of payload.rankings) {
      const ref = USCHO_NPI_REFERENCE_2026_11_20[row.team.id];
      expect(ref).toBeDefined();
      expect(row.record.wins).toBe(ref.w);
      expect(row.record.losses).toBe(ref.l);
      expect(row.record.ties).toBe(ref.t);
    }
  });

  it('matches official USCHO live NPI rankings (Nov 20, 2026) within 0.001 for all 62 teams', () => {
    const payload = computeCombinedRankings(D1_MENS_TEAMS, parsed.games);
    for (const row of payload.rankings) {
      const ref = USCHO_NPI_REFERENCE_2026_11_20[row.team.id];
      expect(row.npiRank).toBe(ref.rank);
      expect(Math.abs(row.npi.npi - ref.npi)).toBeLessThan(0.001);
      if (ref.flag === '#') {
        expect(row.npi.goodLossesRemoved).toBeGreaterThan(0);
      } else {
        expect(row.npi.goodLossesRemoved).toBe(0);
      }
    }
  });

  it('computes classic NCAA Hockey RPI (25% WP, 21% OWP, 54% OOWP) with valid component bounds', () => {
    const rpiMap = calculateRpi(D1_MENS_TEAMS, parsed.games, DEFAULT_RPI_DIALS);
    expect(rpiMap.size).toBe(62);

    const dartmouth = rpiMap.get('dartmouth')!;
    const michigan = rpiMap.get('michigan')!;
    expect(dartmouth.rank).toBe(1);
    expect(michigan.rank).toBe(2);
    expect(dartmouth.wp).toBeCloseTo(1.0, 5);

    for (const r of rpiMap.values()) {
      expect(r.wp).toBeGreaterThanOrEqual(0);
      expect(r.wp).toBeLessThanOrEqual(1);
      expect(r.owp).toBeGreaterThanOrEqual(0);
      expect(r.owp).toBeLessThanOrEqual(1);
      expect(r.oowp).toBeGreaterThanOrEqual(0);
      expect(r.oowp).toBeLessThanOrEqual(1);
      expect(r.baseRpi).toBeCloseTo(0.25 * r.wp + 0.21 * r.owp + 0.54 * r.oowp, 10);
      expect(r.rpi).toBeCloseTo(r.baseRpi + r.qwb, 10);
    }
  });

  it('removes bad wins in RPI and in NPI once minWins threshold is exceeded', () => {
    const miniTeams: Team[] = [
      { id: 'a', name: 'Team A', shortName: 'A', abbr: 'A', conference: 'Big Ten', primaryColor: '#000' },
      { id: 'b', name: 'Team B', shortName: 'B', abbr: 'B', conference: 'Big Ten', primaryColor: '#111' },
      { id: 'c', name: 'Team C', shortName: 'C', abbr: 'C', conference: 'Big Ten', primaryColor: '#222' },
      { id: 'd', name: 'Team D', shortName: 'D', abbr: 'D', conference: 'Big Ten', primaryColor: '#333' },
    ];
    // Team A beats B and C (strong teams), and also beats D (0-win weak team) at home
    const miniGames: Game[] = [
      { id: '1', date: '2026-10-01', awayTeamId: 'a', homeTeamId: 'b', awayScore: 4, homeScore: 1, isOvertime: false, isNeutralSite: false, competition: 'Test', status: 'final' },
      { id: '2', date: '2026-10-02', awayTeamId: 'a', homeTeamId: 'c', awayScore: 3, homeScore: 1, isOvertime: false, isNeutralSite: false, competition: 'Test', status: 'final' },
      { id: '3', date: '2026-10-03', awayTeamId: 'd', homeTeamId: 'a', awayScore: 0, homeScore: 5, isOvertime: false, isNeutralSite: false, competition: 'Test', status: 'final' },
      { id: '4', date: '2026-10-04', awayTeamId: 'b', homeTeamId: 'c', awayScore: 3, homeScore: 2, isOvertime: false, isNeutralSite: false, competition: 'Test', status: 'final' },
      { id: '5', date: '2026-10-05', awayTeamId: 'd', homeTeamId: 'b', awayScore: 0, homeScore: 6, isOvertime: false, isNeutralSite: false, competition: 'Test', status: 'final' },
      { id: '6', date: '2026-10-06', awayTeamId: 'd', homeTeamId: 'c', awayScore: 1, homeScore: 5, isOvertime: false, isNeutralSite: false, competition: 'Test', status: 'final' },
    ];

    const rpiWithRemoval = calculateRpi(miniTeams, miniGames, { ...DEFAULT_RPI_DIALS, removeBadWins: true, includeQwb: false });
    const rpiNoRemoval = calculateRpi(miniTeams, miniGames, { ...DEFAULT_RPI_DIALS, removeBadWins: false, includeQwb: false });
    expect(rpiWithRemoval.get('a')!.badWinsRemoved).toBeGreaterThan(0);
    expect(rpiWithRemoval.get('a')!.baseRpi).toBeGreaterThan(rpiNoRemoval.get('a')!.baseRpi);

    const npiLowMin = calculateNpi(miniTeams, miniGames, { ...DEFAULT_NPI_DIALS, minWins: 1 });
    expect(npiLowMin.results.get('a')!.badWinsRemoved).toBeGreaterThan(0);
  });

  it('simulates What-If outcomes and computes accurate rank shifts', () => {
    // Simulate Michigan State beating #1 Michigan on the road on Nov 20
    const msuAtMic = parsed.games.find(
      (g) => g.status === 'scheduled' && g.awayTeamId === 'michigan-state' && g.homeTeamId === 'michigan',
    );
    expect(msuAtMic).toBeDefined();

    const sim = simulateWhatIf(D1_MENS_TEAMS, parsed.games, [
      {
        gameId: msuAtMic!.id,
        awayTeamId: 'michigan-state',
        homeTeamId: 'michigan',
        awayScore: 4,
        homeScore: 2,
        isOvertime: false,
      },
    ]);

    const msuDelta = sim.movers.find((m) => m.teamId === 'michigan-state')!;
    const micDelta = sim.movers.find((m) => m.teamId === 'michigan')!;
    expect(msuDelta.afterNpi).toBeGreaterThan(msuDelta.beforeNpi);
    expect(msuDelta.afterRpi).toBeGreaterThan(msuDelta.beforeRpi);
    expect(micDelta.afterNpi).toBeLessThan(micDelta.beforeNpi);
    expect(micDelta.afterRpi).toBeLessThan(micDelta.beforeRpi);
  });
});
