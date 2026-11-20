import type {
  CombinedRankingRow,
  Game,
  NpiDials,
  RankingsPayload,
  RpiDials,
  SimulationResponse,
  Team,
  WhatIfOutcome,
} from '../shared/types';

export interface EnrichedGame extends Game {
  awayTeam: Team;
  homeTeam: Team;
}

export interface TeamDossierResponse {
  season: string;
  asOfDate: string;
  row: CombinedRankingRow;
  uschoReference: {
    rank: number;
    npi: number;
    w: number;
    l: number;
    t: number;
    wgtWp: number;
    sos: number;
    qwb: number;
    flag?: '*' | '#';
  } | null;
  upcomingGames: Array<
    Game & {
      location: 'H' | 'A' | 'N';
      opponent: {
        rpiRank: number;
        npiRank: number;
        npi: number;
        rpi: number;
        name: string;
        abbr: string;
      } | null;
    }
  >;
  rankByTeam: Record<
    string,
    { rpiRank: number; npiRank: number; npi: number; rpi: number; name: string; abbr: string }
  >;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export function getRankings(): Promise<RankingsPayload> {
  return fetchJson<RankingsPayload>('/api/rankings');
}

export function getCustomRankings(
  rpiDials: RpiDials,
  npiDials: NpiDials,
): Promise<RankingsPayload> {
  return fetchJson<RankingsPayload>('/api/rankings/custom', {
    method: 'POST',
    body: JSON.stringify({ rpiDials, npiDials }),
  });
}

export function getTeamDossier(teamId: string): Promise<TeamDossierResponse> {
  return fetchJson<TeamDossierResponse>(`/api/teams/${encodeURIComponent(teamId)}`);
}

export function getGames(params?: {
  status?: 'final' | 'scheduled';
  teamId?: string;
  conference?: string;
}): Promise<{ count: number; customEdits: number; games: EnrichedGame[] }> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.teamId) qs.set('teamId', params.teamId);
  if (params?.conference) qs.set('conference', params.conference);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return fetchJson(`/api/games${suffix}`);
}

export function submitGameResult(payload: {
  id?: string;
  date: string;
  awayTeamId: string;
  homeTeamId: string;
  awayScore: number;
  homeScore: number;
  isOvertime: boolean;
  isNeutralSite: boolean;
}): Promise<{ game: Game; rankings: RankingsPayload }> {
  return fetchJson('/api/games', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function resetCustomGames(): Promise<{ reset: boolean; rankings: RankingsPayload }> {
  return fetchJson('/api/games/custom', { method: 'DELETE' });
}

export function runSimulation(
  outcomes: WhatIfOutcome[],
  dials?: { rpiDials?: RpiDials; npiDials?: NpiDials },
): Promise<SimulationResponse> {
  return fetchJson<SimulationResponse>('/api/simulate', {
    method: 'POST',
    body: JSON.stringify({
      outcomes,
      rpiDials: dials?.rpiDials,
      npiDials: dials?.npiDials,
    }),
  });
}

export function syncLiveGames(): Promise<{
  synced: boolean;
  message: string;
  completedGamesCount: number;
  mode: 'live' | 'snapshot';
  rankings: RankingsPayload;
}> {
  return fetchJson('/api/sync', { method: 'POST' });
}
