import type { Game } from '../../shared/types.js';
import { resolveTeamId } from '../data/teams.js';

const MONTHS: Record<string, string> = {
  january: '01',
  february: '02',
  march: '03',
  april: '04',
  may: '05',
  june: '06',
  july: '07',
  august: '08',
  september: '09',
  october: '10',
  november: '11',
  december: '12',
};

const COMP_LABELS = [
  'Exhibition',
  'Non-Conference',
  'Big Ten',
  'NCHC',
  'Hockey East',
  'ECAC',
  'CCHA',
  'AHA',
  'Ice Breaker',
  'Friendship Four',
  'Adirondack Winter Invitational',
  'Empire State Holiday Invitational',
  'Great Lakes Invitational',
  'Holiday Face-Off',
  'Connecticut Ice Tournament',
  'Beanpot',
];

export interface ParsedScheduleResult {
  games: Game[];
  skippedExhibitions: number;
  unparsedLines: string[];
}

/**
 * Parses College Hockey, Inc. composite schedule lines (structured format or raw HTML stripped to lines).
 * Expected line format for structured schedule lines:
 *   DATE: YYYY-MM-DD
 *   COMP: <competition name> [NEUTRAL:<venue>]
 *   GAME: AwayTeam Score at|vs HomeTeam Score [ot] [so] [| note]
 *   SCHED: AwayTeam at|vs HomeTeam | Time
 */
export function parseStructuredSchedule(raw: string): ParsedScheduleResult {
  const games: Game[] = [];
  const unparsedLines: string[] = [];
  let skippedExhibitions = 0;

  let currentDate = '';
  let currentComp = 'Non-Conference';
  let isExhibition = false;
  let compNeutralHostId: string | null = null; // e.g., Ice Breaker at UConn -> only UConn games are home
  let compAllNeutral = false;
  let compVenueNote: string | undefined;
  let gameCounter = 0;

  const lines = raw.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    // Date header: "Friday, October 2, 2026" or "DATE: 2026-10-02"
    const isoDateMatch = line.match(/^DATE:\s*(\d{4}-\d{2}-\d{2})$/);
    if (isoDateMatch) {
      currentDate = isoDateMatch[1];
      continue;
    }

    const longDateMatch = line.match(
      /^(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})$/,
    );
    if (longDateMatch) {
      const m = MONTHS[longDateMatch[1].toLowerCase()];
      const d = longDateMatch[2].padStart(2, '0');
      currentDate = `${longDateMatch[3]}-${m}-${d}`;
      continue;
    }

    // Competition header: "COMP: ..." or plain label
    if (line.startsWith('COMP:')) {
      const compSpec = line.slice(5).trim();
      isExhibition = /^Exhibition/i.test(compSpec);
      compAllNeutral = false;
      compNeutralHostId = null;
      compVenueNote = undefined;

      if (compSpec.includes('|HOST:')) {
        const [namePart, rest] = compSpec.split('|HOST:');
        currentComp = namePart.trim();
        const [hostId, note] = rest.split('|NOTE:');
        compNeutralHostId = hostId.trim();
        compVenueNote = note?.trim();
      } else if (compSpec.includes('|NEUTRAL')) {
        const [namePart, rest] = compSpec.split('|NEUTRAL');
        currentComp = namePart.trim();
        compAllNeutral = true;
        compVenueNote = rest.replace(/^:/, '').trim() || undefined;
      } else {
        currentComp = compSpec;
      }
      continue;
    }

    if (COMP_LABELS.some((lbl) => line === lbl || line.startsWith(`${lbl} (`))) {
      isExhibition = line.startsWith('Exhibition');
      currentComp = line;
      compAllNeutral = false;
      compNeutralHostId = null;
      compVenueNote = undefined;
      continue;
    }

    if (isExhibition) {
      skippedExhibitions++;
      continue;
    }

    // Scheduled game: "SCHED: Away at Home | 7:00 ET" or "SCHED: Away vs. Home | 7:00 ET"
    if (line.startsWith('SCHED:')) {
      const body = line.slice(6).trim();
      const [matchupPart, notePart] = body.split('|').map((s) => s.trim());
      const vsMatch = matchupPart.match(/^(.+?)\s+(at|vs\.?)\s+(.+)$/i);
      if (!vsMatch) {
        unparsedLines.push(line);
        continue;
      }
      const awayId = resolveTeamId(vsMatch[1]);
      const homeId = resolveTeamId(vsMatch[3]);
      if (!awayId || !homeId) {
        unparsedLines.push(line);
        continue;
      }
      const explicitNeutral = vsMatch[2].toLowerCase().startsWith('vs');
      const isNeutralSite =
        explicitNeutral ||
        compAllNeutral ||
        (compNeutralHostId !== null && homeId !== compNeutralHostId && awayId !== compNeutralHostId);

      gameCounter++;
      games.push({
        id: `g-${currentDate}-${String(gameCounter).padStart(3, '0')}`,
        date: currentDate,
        awayTeamId: awayId,
        homeTeamId: homeId,
        awayScore: null,
        homeScore: null,
        isOvertime: false,
        isShootout: false,
        isNeutralSite,
        competition: currentComp,
        venueNote: notePart || compVenueNote,
        status: 'scheduled',
      });
      continue;
    }

    // Completed game: "AwayTeam 3 at HomeTeam 2 [ot] [so] [| note]"
    // or "AwayTeam 5 vs. HomeTeam 3 [ot] [so] [| note]"
    const [corePart, notePart] = line.split('|').map((s) => s.trim());
    const finalMatch = corePart.match(
      /^(.+?)\s+(\d+)\s+(at|vs\.?)\s+(.+?)\s+(\d+)(\s+ot)?(\s+so)?$/i,
    );
    if (finalMatch) {
      const awayId = resolveTeamId(finalMatch[1]);
      const awayScore = Number(finalMatch[2]);
      const separator = finalMatch[3].toLowerCase();
      const homeId = resolveTeamId(finalMatch[4]);
      const homeScore = Number(finalMatch[5]);
      const isOvertime = Boolean(finalMatch[6]) || Boolean(finalMatch[7]);
      const isShootout = Boolean(finalMatch[7]);

      if (!awayId || !homeId) {
        unparsedLines.push(line);
        continue;
      }

      const explicitNeutral = separator.startsWith('vs');
      const isNeutralSite =
        explicitNeutral ||
        compAllNeutral ||
        (compNeutralHostId !== null && homeId !== compNeutralHostId && awayId !== compNeutralHostId);

      gameCounter++;
      games.push({
        id: `g-${currentDate}-${String(gameCounter).padStart(3, '0')}`,
        date: currentDate,
        awayTeamId: awayId,
        homeTeamId: homeId,
        awayScore,
        homeScore,
        isOvertime,
        isShootout,
        isNeutralSite,
        competition: currentComp,
        venueNote: notePart || compVenueNote,
        status: 'final',
      });
      continue;
    }

    unparsedLines.push(line);
  }

  return { games, skippedExhibitions, unparsedLines };
}

/**
 * Strips HTML from College Hockey, Inc.'s live composite schedule page
 * (https://www.collegehockeyinc.com/men/compnatfull27.php) and extracts completed & upcoming games.
 */
export function parseChiHtml(html: string): ParsedScheduleResult {
  // Replace table cells / block elements with newlines/spaces so date & game rows stay separable
  const rows = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/td>/gi, ' ')
    .replace(/<\/th>/gi, ' ')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#8211;|&ndash;/g, '-')
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const normalized: string[] = [];
  for (const row of rows) {
    if (/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+[A-Za-z]+\s+\d{1,2},\s+\d{4}$/.test(row)) {
      normalized.push(row);
      continue;
    }
    if (/^Exhibition/i.test(row)) {
      normalized.push('COMP: Exhibition');
      continue;
    }
    if (/^Ice Breaker/i.test(row)) {
      normalized.push('COMP: Ice Breaker|HOST:uconn|NOTE:Toscano Forum, Storrs, Conn.');
      continue;
    }
    if (/^(Big Ten|NCHC|Hockey East|ECAC|CCHA|AHA|Non-Conference)$/i.test(row)) {
      normalized.push(`COMP: ${row}`);
      continue;
    }

    // Match completed score lines like: "Michigan 4 at Denver 1 Box Gameday"
    const cleaned = row
      .replace(/\bBox\b/g, '')
      .replace(/\bGameday\b/g, '')
      .replace(/\bWatch\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const m = cleaned.match(/^(.+?)\s+(\d+)\s+(at|vs\.?)\s+(.+?)\s+(\d+)(\s+ot)?/i);
    if (m) {
      const hasSo = /shootout/i.test(cleaned);
      normalized.push(
        `${m[1].trim()} ${m[2]} ${m[3]} ${m[4].trim()} ${m[5]}${m[6] ? ' ot' : ''}${hasSo ? ' so' : ''}`,
      );
    }
  }

  return parseStructuredSchedule(normalized.join('\n'));
}

export const CHI_COMPOSITE_URL = 'https://www.collegehockeyinc.com/men/compnatfull27.php';

export async function fetchLiveChiSchedule(timeoutMs = 8000): Promise<ParsedScheduleResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(CHI_COMPOSITE_URL, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'NCAA-Hockey-RPI-NPI-Tracker/1.0 (+https://github.com)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} fetching College Hockey, Inc. schedule`);
    }
    const html = await res.text();
    const parsed = parseChiHtml(html);
    if (parsed.games.length < 50) {
      throw new Error(`Parsed only ${parsed.games.length} games from live page; format may have changed`);
    }
    return parsed;
  } finally {
    clearTimeout(timer);
  }
}
