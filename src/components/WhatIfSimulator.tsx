import { Plus, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type {
  CombinedRankingRow,
  NpiDials,
  RankingsPayload,
  RpiDials,
  SimulationResponse,
  Team,
  WhatIfOutcome,
} from '../../shared/types';
import { getGames, resetCustomGames, runSimulation, submitGameResult } from '../api';
import type { EnrichedGame } from '../api';

type PickType = 'away_reg' | 'away_ot' | 'tie' | 'home_ot' | 'home_reg';

interface WhatIfSimulatorProps {
  rankings: CombinedRankingRow[];
  teams: Team[];
  rpiDials: RpiDials;
  npiDials: NpiDials;
  onRankingsCommitted: (payload: RankingsPayload) => void;
  onSelectTeam: (teamId: string) => void;
}

function outcomeFromPick(game: EnrichedGame, pick: PickType): WhatIfOutcome {
  switch (pick) {
    case 'away_reg':
      return {
        gameId: game.id,
        awayTeamId: game.awayTeamId,
        homeTeamId: game.homeTeamId,
        awayScore: 4,
        homeScore: 2,
        isOvertime: false,
        isNeutralSite: game.isNeutralSite,
      };
    case 'away_ot':
      return {
        gameId: game.id,
        awayTeamId: game.awayTeamId,
        homeTeamId: game.homeTeamId,
        awayScore: 3,
        homeScore: 2,
        isOvertime: true,
        isNeutralSite: game.isNeutralSite,
      };
    case 'tie':
      return {
        gameId: game.id,
        awayTeamId: game.awayTeamId,
        homeTeamId: game.homeTeamId,
        awayScore: 2,
        homeScore: 2,
        isOvertime: true,
        isNeutralSite: game.isNeutralSite,
      };
    case 'home_ot':
      return {
        gameId: game.id,
        awayTeamId: game.awayTeamId,
        homeTeamId: game.homeTeamId,
        awayScore: 2,
        homeScore: 3,
        isOvertime: true,
        isNeutralSite: game.isNeutralSite,
      };
    case 'home_reg':
      return {
        gameId: game.id,
        awayTeamId: game.awayTeamId,
        homeTeamId: game.homeTeamId,
        awayScore: 2,
        homeScore: 4,
        isOvertime: false,
        isNeutralSite: game.isNeutralSite,
      };
  }
}

function formatShortDate(isoDate: string): string {
  const parts = isoDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return isoDate;
  const dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 12));
  return dt.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function WhatIfSimulator({
  rankings,
  teams,
  rpiDials,
  npiDials,
  onRankingsCommitted,
  onSelectTeam,
}: WhatIfSimulatorProps) {
  const [scheduledGames, setScheduledGames] = useState<EnrichedGame[]>([]);
  const [customEdits, setCustomEdits] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string>('2026-11-20');
  const [picks, setPicks] = useState<Record<string, PickType>>({});
  const [simResult, setSimResult] = useState<SimulationResponse | null>(null);
  const [simLoading, setSimLoading] = useState(false);

  // Manual score entry state
  const [showLogForm, setShowLogForm] = useState(false);
  const [logAway, setLogAway] = useState('michigan-state');
  const [logHome, setLogHome] = useState('michigan');
  const [logAwayScore, setLogAwayScore] = useState(3);
  const [logHomeScore, setLogHomeScore] = useState(4);
  const [logDate, setLogDate] = useState('2026-11-20');
  const [logOt, setLogOt] = useState(false);
  const [logNeutral, setLogNeutral] = useState(false);
  const [logMessage, setLogMessage] = useState<string | null>(null);

  const rankByTeam = useMemo(
    () =>
      Object.fromEntries(
        rankings.map((r) => [r.team.id, { rpiRank: r.rpiRank, npiRank: r.npiRank }]),
      ),
    [rankings],
  );

  const loadScheduled = () => {
    getGames({ status: 'scheduled' }).then((data) => {
      setScheduledGames(data.games);
      setCustomEdits(data.customEdits);
      const nextDates = Array.from(new Set(data.games.map((g) => g.date))).sort();
      if (nextDates.length > 0) {
        setSelectedDate((prev) => (nextDates.includes(prev) ? prev : nextDates[0]));
        setLogDate((prev) => (nextDates.includes(prev) ? prev : nextDates[0]));
      }
    });
  };

  useEffect(() => {
    loadScheduled();
}, [rankings]);

const dates = useMemo(() => {
  const unique = Array.from(new Set(scheduledGames.map((g) => g.date))).sort();
  return unique;
}, [scheduledGames]);

const activeDate = dates.includes(selectedDate) ? selectedDate : (dates[0] ?? selectedDate);

const gamesForDate = useMemo(
  () => scheduledGames.filter((g) => g.date === activeDate),
  [scheduledGames, activeDate],
);

useEffect(() => {
  const entries = Object.entries(picks);
  if (entries.length === 0) {
    setSimResult(null);
    return;
  }
  const gameById = new Map(scheduledGames.map((g) => [g.id, g]));
  const outcomes: WhatIfOutcome[] = [];
  for (const [gameId, pick] of entries) {
    const g = gameById.get(gameId);
    if (g) outcomes.push(outcomeFromPick(g, pick));
  }
  if (outcomes.length === 0) return;

  let cancelled = false;
  setSimLoading(true);
  runSimulation(outcomes, { rpiDials, npiDials })
    .then((res) => {
      if (!cancelled) setSimResult(res);
    })
    .finally(() => {
      if (!cancelled) setSimLoading(false);
    });
  return () => {
    cancelled = true;
  };
}, [picks, scheduledGames, rpiDials, npiDials]);

const togglePick = (gameId: string, pick: PickType) => {
  setPicks((prev) => {
    const next = { ...prev };
    if (next[gameId] === pick) {
      delete next[gameId];
    } else {
      next[gameId] = pick;
    }
    return next;
  });
};

const handleLogScore = async (e: React.FormEvent) => {
  e.preventDefault();
  setLogMessage(null);
  try {
    const res = await submitGameResult({
      date: logDate,
      awayTeamId: logAway,
      homeTeamId: logHome,
      awayScore: logAwayScore,
      homeScore: logHomeScore,
      isOvertime: logOt,
      isNeutralSite: logNeutral,
    });
    onRankingsCommitted(res.rankings);
    loadScheduled();
    setLogMessage('Game score recorded and all 62 RPI & NPI rankings recomputed.');
  } catch (err) {
    setLogMessage(err instanceof Error ? err.message : 'Failed to log score');
  }
};

const handleResetBaseline = async () => {
  const res = await resetCustomGames();
  onRankingsCommitted(res.rankings);
  loadScheduled();
  setPicks({});
  setLogMessage('Reset dataset back to verified November 20, 2026 baseline.');
};

const sortedTeams = useMemo(
  () => [...teams].sort((a, b) => a.name.localeCompare(b.name)),
  [teams],
);

const pickCount = Object.keys(picks).length;
const activeMovers = useMemo(
  () => (simResult ? simResult.movers.filter((m) => m.rpiRankChange !== 0 || m.npiRankChange !== 0 || Math.abs(m.afterNpi - m.beforeNpi) >= 0.05).slice(0, 18) : []),
  [simResult],
);

return (
  <div>
    {logMessage && (
      <div className="notice-banner">
        <span>{logMessage}</span>
        <button type="button" className="notice-close" onClick={() => setLogMessage(null)}>
          ✕
        </button>
      </div>
    )}

    <div className="sim-layout">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Weekend Slate &amp; What-If Game Picker</h2>
            <p className="panel-desc">
              Select hypothetical outcomes for upcoming 2026–27 games to preview instant RPI &amp; NPI rank shifts.
            </p>
          </div>
          <div className="toolbar-group">
            <button
              type="button"
              className="btn"
              onClick={() => setShowLogForm((v) => !v)}
            >
              <Plus size={13} /> Log Official Score
            </button>
            {customEdits > 0 && (
              <button type="button" className="btn" onClick={handleResetBaseline}>
                <RotateCcw size={13} /> Reset ({customEdits})
              </button>
            )}
            {pickCount > 0 && (
              <button type="button" className="btn" onClick={() => setPicks({})}>
                Clear Picks ({pickCount})
              </button>
            )}
          </div>
        </div>

        {showLogForm && (
          <form className="inline-form" onSubmit={handleLogScore}>
            <div className="field">
              <label htmlFor="log-date">Date</label>
              <input
                id="log-date"
                type="date"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="log-away">Away Team</label>
              <select id="log-away" value={logAway} onChange={(e) => setLogAway(e.target.value)}>
                {sortedTeams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="log-away-score">Score</label>
              <input
                id="log-away-score"
                type="number"
                min={0}
                max={25}
                style={{ width: 62 }}
                value={logAwayScore}
                onChange={(e) => setLogAwayScore(Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label htmlFor="log-home">Home Team</label>
              <select id="log-home" value={logHome} onChange={(e) => setLogHome(e.target.value)}>
                {sortedTeams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="log-home-score">Score</label>
              <input
                id="log-home-score"
                type="number"
                min={0}
                max={25}
                style={{ width: 62 }}
                value={logHomeScore}
                onChange={(e) => setLogHomeScore(Number(e.target.value))}
              />
            </div>
            <label className="checkbox-inline">
              <input type="checkbox" checked={logOt} onChange={(e) => setLogOt(e.target.checked)} />
              OT
            </label>
            <label className="checkbox-inline">
              <input
                type="checkbox"
                checked={logNeutral}
                onChange={(e) => setLogNeutral(e.target.checked)}
              />
              Neutral
            </label>
            <button type="submit" className="btn btn-primary">
              Save &amp; Recompute
            </button>
          </form>
        )}

        <div className="toolbar" style={{ padding: '10px 18px' }}>
          <div className="filter-pills">
              {
                dates.slice(0, 4).map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`pill-btn ${activeDate === d ? 'active' : ''}`}
                    onClick={() => setSelectedDate(d)}
                  >
                    {formatShortDate(d)}
                  </button>
                ))
              }
              {
                dates.length > 4 && (
                  <select
                    aria-label="Choose schedule date"
                    className="select-input"
                    value={activeDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  >
                    {dates.map((d) => (
                      <option key={d} value={d}>
                        {formatShortDate(d)} ({d})
                      </option>
                    ))}
                  </select>
                )
              }
            </div>
          <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
            {gamesForDate.length} scheduled matchups · {pickCount} simulated
          </span>
        </div>

        <div className="sim-game-list">
          {gamesForDate.map((g) => {
            const pick = picks[g.id];
            const awayR = rankByTeam[g.awayTeamId];
            const homeR = rankByTeam[g.homeTeamId];
            return (
              <div key={g.id} className={`sim-game-row ${pick ? 'selected' : ''}`}>
                <div className="sim-matchup">
                  <div className="sim-teams">
                    <span className="team-abbr">#{awayR?.npiRank}</span>
                    <span>{g.awayTeam.name}</span>
                    <span style={{ color: 'var(--ink-muted)', fontWeight: 500 }}>
                      {g.isNeutralSite ? 'vs.' : 'at'}
                    </span>
                    <span className="team-abbr">#{homeR?.npiRank}</span>
                    <span>{g.homeTeam.name}</span>
                  </div>
                  <div className="sim-meta">
                    {g.competition}
                    {g.venueNote ? ` · ${g.venueNote}` : ''}
                  </div>
                </div>

                <div className="sim-outcome-group" role="group" aria-label={`Pick outcome for ${g.awayTeam.abbr} at ${g.homeTeam.abbr}`}>
                  <button
                    type="button"
                    className={`sim-btn ${pick === 'away_reg' ? 'active' : ''}`}
                    onClick={() => togglePick(g.id, 'away_reg')}
                  >
                    {g.awayTeam.abbr} W
                  </button>
                  <button
                    type="button"
                    className={`sim-btn ${pick === 'away_ot' ? 'active' : ''}`}
                    onClick={() => togglePick(g.id, 'away_ot')}
                  >
                    {g.awayTeam.abbr} OT
                  </button>
                  <button
                    type="button"
                    className={`sim-btn ${pick === 'tie' ? 'active' : ''}`}
                    onClick={() => togglePick(g.id, 'tie')}
                  >
                    Tie
                  </button>
                  <button
                    type="button"
                    className={`sim-btn ${pick === 'home_ot' ? 'active' : ''}`}
                    onClick={() => togglePick(g.id, 'home_ot')}
                  >
                    {g.homeTeam.abbr} OT
                  </button>
                  <button
                    type="button"
                    className={`sim-btn ${pick === 'home_reg' ? 'active' : ''}`}
                    onClick={() => togglePick(g.id, 'home_reg')}
                  >
                    {g.homeTeam.abbr} W
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel sticky-col">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Simulated Impact Preview</h2>
            <p className="panel-desc">
              {pickCount === 0
                ? 'Pick one or more games on the left (e.g., MSU at Michigan) to calculate live shifts.'
                : simLoading
                  ? 'Recalculating RPI & iterative NPI...'
                  : `Showing biggest movers after ${pickCount} simulated game${pickCount > 1 ? 's' : ''}.`}
            </p>
          </div>
        </div>

        {pickCount === 0 ? (
          <div style={{ padding: '28px 18px', textAlign: 'center', color: 'var(--ink-muted)' }}>
            <p style={{ margin: '0 0 10px', fontWeight: 600, color: 'var(--ink-secondary)' }}>
              No hypothetical games selected yet
            </p>
            <p style={{ margin: 0, fontSize: 12.5 }}>
              Click any matchup outcome (Reg Win, OT Win, or Tie) to see how both classic RPI and the NCAA Power Index respond — including ripple effects on opponents&apos; SOS and QWB.
            </p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Team</th>
                  <th className="num">RPI Rank</th>
                  <th className="num">Δ RPI</th>
                  <th className="num">NPI Rank</th>
                  <th className="num">Δ NPI</th>
                </tr>
              </thead>
              <tbody>
                {activeMovers.map((m) => (
                  <tr key={m.teamId} className="clickable" onClick={() => onSelectTeam(m.teamId)}>
                    <td>
                      <span className="team-name">{m.teamName}</span>
                    </td>
                    <td className="num mono">
                      #{m.beforeRpiRank} → <strong>#{m.afterRpiRank}</strong>
                    </td>
                    <td className="num">
                      <span
                        className={`delta-badge ${m.rpiRankChange > 0 ? 'up' : m.rpiRankChange < 0 ? 'down' : 'flat'
                          }`}
                      >
                        {m.rpiRankChange > 0 ? `+${m.rpiRankChange}` : m.rpiRankChange}
                      </span>
                    </td>
                    <td className="num mono">
                      #{m.beforeNpiRank} → <strong>#{m.afterNpiRank}</strong>
                    </td>
                    <td className="num">
                      <span
                        className={`delta-badge ${m.npiRankChange > 0 ? 'up' : m.npiRankChange < 0 ? 'down' : 'flat'
                          }`}
                      >
                        {m.npiRankChange > 0 ? `+${m.npiRankChange}` : m.npiRankChange}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  </div>
);
}
