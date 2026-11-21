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

const KNOWN_NEUTRAL_GAMES = new Set<string>([
  // Maine vs. Holy Cross on Oct 3, 2026 was played at a neutral site (Cross Insurance Arena),
  // though CHI's composite table lists "at".
  '2026-10-03|maine|holy-cross',
]);

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#8211;|&ndash;/gi, '-')
    .replace(/&#8212;|&mdash;/gi, '-')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function stripTagsToText(htmlFragment: string): string {
  return decodeHtmlEntities(htmlFragment.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function parseLongDate(text: string): string | null {
  const m = text.match(
    /^(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})$/,
  );
  if (!m) return null;
  const month = MONTHS[m[1].toLowerCase()];
  if (!month) return null;
  return `${m[3]}-${month}-${m[2].padStart(2, '0')}`;
}

function isPostseasonCompetition(comp: string): boolean {
  // Regular-season holiday/in-season tournaments (e.g. Connecticut Ice Tournament) are NOT postseason.
  if (/Connecticut Ice/i.test(comp)) return false;
  return /\b(HEA|CCHA|NCHC|Big Ten|ECAC|AHA|NCAA)\s+Tournament\b/i.test(comp);
}

/**
 * Parses HTML from College Hockey, Inc.'s live composite schedule page
 * (https://www.collegehockeyinc.com/men/compnatfull27.php) and extracts completed & upcoming games.
 */
export function parseChiHtml(html: string): ParsedScheduleResult {
  const cleanedHtml = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');

      const trMatches = [...cleanedHtml.matchAll(/<tr\b([^>]*)>([\s\S]*?)<\/tr>/gi)];

      const games: Game[] = [];
      const unparsedLines: string[] = [];
      let skippedExhibitions = 0;

      let currentDate = '';
      let currentComp = 'Non-Conference';
      let isExhibition = false;
      let gameCounter = 0;

      for (const match of trMatches) {
        const attrs = match[1];
        const inner = match[2];
        if (/class\s*=\s*["'][^"']*\bempty\b/i.test(attrs)) continue;

        const tds = [...inner.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cell) =>
          stripTagsToText(cell[1]),
        );
        if (tds.length === 0) continue;

        // Date header row: <tr class="stats-section"><td colspan="99">Friday, October 2, 2026</td></tr>
        if (/stats-section/i.test(attrs)) {
          const parsedDate = parseLongDate(tds.join(' ').trim());
          if (parsedDate) currentDate = parsedDate;
          continue;
        }

          // Competition header row: <tr class="sked-header"><td colspan="99">Big Ten</td></tr>
          if (/sked-header/i.test(attrs)) {
            const headerText = tds.join(' ').trim();
            if (headerText) {
              isExhibition = /^Exhibition/i.test(headerText);
              currentComp = headerText;
            }
            continue;
          }

            // Fallback detection if a simplified HTML table omits CSS classes
            if (tds.length === 1) {
              const only = tds[0];
              const parsedDate = parseLongDate(only);
              if (parsedDate) {
                currentDate = parsedDate;
                continue;
              }
              if (/^Exhibition/i.test(only)) {
                isExhibition = true;
                currentComp = only;
                continue;
              }
              if (COMP_LABELS.some((lbl) => only === lbl || only.startsWith(`${lbl} (`))) {
                isExhibition = false;
                currentComp = only;
                continue;
              }
              continue;
            }

              if (isExhibition) {
                skippedExhibitions++;
                continue;
              }

              // Standard CHI game row columns:
              // [0] Away Team, [1] Away Score, [2] "at"|"vs.", [3] Home Team, [4] Home Score,
              // [5] OT ("ot"), [6] TV, [7] "Box"|Time, [8] "Gameday"|"Watch", [9] Notes (<small>)
              if (tds.length < 5) continue;
              const awayRaw = tds[0];
              const awayScoreStr = tds[1];
              const separator = tds[2];
              const homeRaw = tds[3];
              const homeScoreStr = tds[4];

                if (!/^(at|vs\.?)$/i.test(separator)) continue;
                if (!currentDate) continue;

                // Skip future tournament placeholder slots (TBD, TBD-er1, TBDhe2, etc.)
                if (/^TBD/i.test(awayRaw) || /^TBD/i.test(homeRaw)) continue;

                const awayId = resolveTeamId(awayRaw);
                const homeId = resolveTeamId(homeRaw);
                if (!awayId || !homeId) {
                  unparsedLines.push(`${currentDate}: ${awayRaw} ${awayScoreStr} ${separator} ${homeRaw} ${homeScoreStr}`);
                  continue;
                }

                const otCell = tds[5] ?? '';
                const boxOrTime = tds[7] ?? '';
                const noteCell = tds[9] ?? '';

                const isFinal = /^\d+$/.test(awayScoreStr) && /^\d+$/.test(homeScoreStr);
                const isShootout = /shootout/i.test(noteCell);
                const isOvertime = isFinal && (/\bot\b/i.test(otCell) || isShootout);
                const isNeutralSite =
                  /^vs\.?$/i.test(separator) ||
                  KNOWN_NEUTRAL_GAMES.has(`${currentDate}|${awayId}|${homeId}`);
                const isPostseason = isPostseasonCompetition(currentComp);

                const cleanNote =
                  noteCell && !isShootout
                    ? noteCell
                    : !isFinal && boxOrTime && !/^(Box|Gameday|Watch)$/i.test(boxOrTime)
                      ? boxOrTime
                      : undefined;

                gameCounter++;
                games.push({
                  id: `g-${currentDate}-${String(gameCounter).padStart(3, '0')}`,
                  date: currentDate,
                  awayTeamId: awayId,
                  homeTeamId: homeId,
                  awayScore: isFinal ? Number(awayScoreStr) : null,
                  homeScore: isFinal ? Number(homeScoreStr) : null,
                  isOvertime,
                  isShootout,
                  isNeutralSite,
                  ...(isPostseason ? { isPostseason: true } : {}),
                  competition: currentComp.replace(/\s*\(at [^)]+\)\s*$/i, '').trim() || currentComp,
                  venueNote: cleanNote,
                  status: isFinal ? 'final' : 'scheduled',
                });
              }

              return { games, skippedExhibitions, unparsedLines };
            }

            export const CHI_COMPOSITE_URL = 'https://www.collegehockeyinc.com/men/compnatfull27.php';

              export async function fetchLiveChiSchedule(timeoutMs = 15000): Promise<ParsedScheduleResult> {
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), timeoutMs);
                try {
                  const res = await fetch(CHI_COMPOSITE_URL, {
                    signal: controller.signal,
                    headers: {
                      'User-Agent': 'NCAA-Hockey-RPI-NPI-Tracker/1.0 (+https://github.com)',
                      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    },
                  });
                  if (!res.ok) {
                    throw new Error(`HTTP ${res.status} fetching College Hockey, Inc. schedule`);
                  }
                  const html = await res.text();
                  const parsed = parseChiHtml(html);
                    const finalCount = parsed.games.filter((g) => g.status === 'final').length;
                    if (finalCount < 50) {
                      throw new Error(
                        `Parsed only ${finalCount} completed games (${parsed.games.length} total) from live page; format may have changed`,
                      );
                    }
                    return parsed;
                  } finally {
                    clearTimeout(timer);
                  }
                }
