import { Calendar, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getTeamDossier } from '../api';
import type { TeamDossierResponse } from '../api';

interface TeamDossierDrawerProps {
  teamId: string | null;
  onClose: () => void;
  onSelectTeam: (teamId: string) => void;
}

export function TeamDossierDrawer({ teamId, onClose, onSelectTeam }: TeamDossierDrawerProps) {
  const [dossier, setDossier] = useState<TeamDossierResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId) {
      setDossier(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getTeamDossier(teamId)
      .then((data) => {
        if (!cancelled) setDossier(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load team');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [teamId]);

  useEffect(() => {
    if (!teamId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [teamId, onClose]);

  if (!teamId) return null;

  const row = dossier?.row;
  const rpiGameById = new Map(row?.rpi.games.map((g) => [g.gameId, g]) ?? []);

  return (
    <div className="drawer-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <aside className="drawer-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          {row ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  className="team-swatch"
                  style={{ width: 14, height: 14, backgroundColor: row.team.primaryColor }}
                />
                <h2 style={{ margin: 0, fontSize: 21, fontWeight: 800, letterSpacing: '-0.025em' }}>
                  {row.team.name}
                </h2>
                <span className="conf-tag">{row.team.conference}</span>
              </div>
              <div style={{ marginTop: 6, fontSize: 12.5, color: 'var(--ink-secondary)' }}>
                Overall{' '}
                <strong className="mono">
                  {row.record.wins}-{row.record.losses}-{row.record.ties}
                </strong>
                {' · '}Home{' '}
                <span className="mono">
                  {row.record.homeWins}-{row.record.homeLosses}-{row.record.homeTies}
                </span>
                {' · '}Road{' '}
                <span className="mono">
                  {row.record.roadWins}-{row.record.roadLosses}-{row.record.roadTies}
                </span>
                {row.record.neutralWins + row.record.neutralLosses + row.record.neutralTies > 0 && (
                  <>
                    {' · '}Neutral{' '}
                    <span className="mono">
                      {row.record.neutralWins}-{row.record.neutralLosses}-{row.record.neutralTies}
                    </span>
                  </>
                )}
                {' · '}Goals{' '}
                <span className="mono">
                  {row.record.goalsFor}–{row.record.goalsAgainst}
                </span>
              </div>
            </div>
          ) : (
            <h2 style={{ margin: 0, fontSize: 18 }}>Loading team profile...</h2>
          )}

          <button type="button" className="btn" onClick={onClose} aria-label="Close drawer">
            <X size={15} /> Close
          </button>
        </div>

        <div className="drawer-body">
          {loading && <div style={{ color: 'var(--ink-muted)' }}>Computing team audit...</div>}
          {error && <div className="notice-banner warning">{error}</div>}

          {row && dossier && (
            <>
              <div className="dossier-cards">
                <div className="formula-box">
                  <div className="formula-box-head">
                    <span className="formula-box-title">Classic NCAA RPI</span>
                    <span className="rank-num top16">Rank #{row.rpiRank}</span>
                  </div>
                  <div className="formula-big">
                    {row.rpi.rpi.toFixed(4)}
                    {row.rpi.badWinsRemoved > 0 && <span className="flag-mark">*</span>}
                  </div>
                  <div className="component-bar" aria-label="RPI weight contribution">
                    <div
                      style={{ width: `${(0.25 * row.rpi.wp / row.rpi.baseRpi) * 100}%`, background: 'hsl(206 82% 40%)' }}
                      title={`WP contribution: ${(0.25 * row.rpi.wp).toFixed(4)}`}
                    />
                    <div
                      style={{ width: `${(0.21 * row.rpi.owp / row.rpi.baseRpi) * 100}%`, background: 'hsl(188 55% 42%)' }}
                      title={`OWP contribution: ${(0.21 * row.rpi.owp).toFixed(4)}`}
                    />
                    <div
                      style={{ width: `${(0.54 * row.rpi.oowp / row.rpi.baseRpi) * 100}%`, background: 'hsl(216 40% 26%)' }}
                      title={`OOWP contribution: ${(0.54 * row.rpi.oowp).toFixed(4)}`}
                    />
                  </div>
                  <div className="component-grid">
                    <div className="component-stat">
                      Wgt WP (25%)
                      <strong>
                        {row.rpi.wp.toFixed(4)} <small>(#{row.rpi.wpRank})</small>
                      </strong>
                    </div>
                    <div className="component-stat">
                      OWP (21%)
                      <strong>
                        {row.rpi.owp.toFixed(4)} <small>(#{row.rpi.owpRank})</small>
                      </strong>
                    </div>
                    <div className="component-stat">
                      OOWP (54%)
                      <strong>
                        {row.rpi.oowp.toFixed(4)} <small>(#{row.rpi.oowpRank})</small>
                      </strong>
                    </div>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--ink-muted)' }}>
                    Base RPI <span className="mono">{row.rpi.baseRpi.toFixed(4)}</span> + Top-20 QWB{' '}
                    <span className="mono">+{row.rpi.qwb.toFixed(4)}</span>
                    {row.rpi.badWinsRemoved > 0 && ` · ${row.rpi.badWinsRemoved} bad win(s) dropped`}
                  </div>
                </div>

                <div className="formula-box">
                  <div className="formula-box-head">
                    <span className="formula-box-title">NCAA Power Index (NPI)</span>
                    <span className="rank-num top16">Rank #{row.npiRank}</span>
                  </div>
                  <div className="formula-big">
                    {row.npi.npi.toFixed(3)}
                    {row.npi.badWinsRemoved > 0 && <span className="flag-mark">*</span>}
                    {row.npi.goodLossesRemoved > 0 && <span className="flag-mark">#</span>}
                  </div>
                  <div className="component-bar" aria-label="NPI weight contribution">
                    <div
                      style={{ width: `${(0.25 * row.npi.weightedWp / row.npi.npi) * 100}%`, background: 'hsl(206 82% 40%)' }}
                      title={`Wgt W% contribution: ${(0.25 * row.npi.weightedWp).toFixed(3)}`}
                    />
                    <div
                      style={{ width: `${(0.75 * row.npi.sos / row.npi.npi) * 100}%`, background: 'hsl(216 40% 26%)' }}
                      title={`SOS contribution: ${(0.75 * row.npi.sos).toFixed(3)}`}
                    />
                    <div
                      style={{ width: `${(row.npi.qwb / row.npi.npi) * 100}%`, background: 'hsl(154 64% 34%)' }}
                      title={`QWB contribution: +${row.npi.qwb.toFixed(3)}`}
                    />
                  </div>
                  <div className="component-grid">
                    <div className="component-stat">
                      Wgt W% (25%)
                      <strong>
                        {row.npi.weightedWp.toFixed(3)} <small>(#{row.npi.weightedWpRank})</small>
                      </strong>
                    </div>
                    <div className="component-stat">
                      SOS (75%)
                      <strong>
                        {row.npi.sos.toFixed(3)} <small>(#{row.npi.sosRank})</small>
                      </strong>
                    </div>
                    <div className="component-stat">
                      QWB Bonus
                      <strong>+{row.npi.qwb.toFixed(3)}</strong>
                    </div>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--ink-muted)' }}>
                    {dossier.uschoReference ? (
                      <>
                        USCHO Nov 20 Ref: <span className="mono">{dossier.uschoReference.npi.toFixed(3)}</span> (#
                        {dossier.uschoReference.rank}) · Δ{' '}
                        <span className="mono">
                          {(row.npi.npi - dossier.uschoReference.npi).toFixed(4)}
                        </span>
                      </>
                    ) : (
                      <>
                        Adj Wgt Record: <span className="mono">{row.npi.adjustedWins.toFixed(2)}–{row.npi.adjustedLosses.toFixed(2)}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="panel-title" style={{ marginBottom: 8 }}>
                  2026–27 Game-by-Game Contribution Audit ({row.npi.games.length} Games)
                </h3>
                <div className="panel table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Opponent</th>
                        <th>Site</th>
                        <th>Result</th>
                        <th className="num">Opp NPI</th>
                        <th className="num">Wgt</th>
                        <th className="num">Net NPI</th>
                        <th className="num">QWB</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {row.npi.games.map((g) => {
                        const oppInfo = dossier.rankByTeam[g.opponentId];
                        const rpiG = rpiGameById.get(g.gameId);
                        return (
                          <tr key={g.gameId}>
                            <td className="mono" style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                              {g.date.slice(5)}
                            </td>
                            <td>
                              <button
                                type="button"
                                onClick={() => onSelectTeam(g.opponentId)}
                                style={{
                                  border: 'none',
                                  background: 'none',
                                  padding: 0,
                                  fontWeight: 600,
                                  color: 'var(--accent-ice)',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                }}
                              >
                                {g.opponentName}
                                {oppInfo && (
                                  <span className="team-abbr" style={{ marginLeft: 5 }}>
                                    #{oppInfo.npiRank}
                                  </span>
                                )}
                              </button>
                            </td>
                            <td className="mono" style={{ fontSize: 12 }}>
                              {g.location}
                            </td>
                            <td>
                              <span className={`outcome-pill ${g.outcome}`}>{g.outcome}</span>{' '}
                              <span className="mono" style={{ fontSize: 12 }}>
                                {g.teamScore}–{g.opponentScore}
                                {g.isShootout ? ' SO' : g.isOvertime && g.outcome === 'T' ? ' OT' : ''}
                              </span>
                            </td>
                            <td className="num mono">{g.opponentNpi.toFixed(2)}</td>
                            <td className="num mono">{g.totalWeight.toFixed(2)}</td>
                            <td className="num mono" style={{ fontWeight: 600 }}>
                              {g.gameNpiValue.toFixed(2)}
                            </td>
                            <td className="num mono" style={{ color: g.qwb > 0 ? 'var(--accent-green)' : 'var(--ink-muted)' }}>
                              {g.qwb > 0 ? `+${g.qwb.toFixed(2)}` : '—'}
                            </td>
                            <td>
                              {g.status === 'dropped_loss' ? (
                                <span className="status-tag dropped_loss">Dropped #</span>
                              ) : g.status === 'dropped_win' ? (
                                <span className="status-tag dropped_win">Dropped *</span>
                              ) : rpiG?.excludedBadWin ? (
                                <span className="status-tag dropped_win">RPI *</span>
                              ) : (
                                <span className="status-tag counted">Counted</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {dossier.upcomingGames.length > 0 && (
                <div>
                  <h3 className="panel-title" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Calendar size={14} /> Upcoming Scheduled Games
                  </h3>
                  <div className="panel">
                    {dossier.upcomingGames.map((ug) => (
                      <div key={ug.id} className="sim-game-row" style={{ padding: '10px 14px' }}>
                        <div>
                          <span className="mono" style={{ fontSize: 12, color: 'var(--ink-muted)', marginRight: 10 }}>
                            {ug.date}
                          </span>
                          <strong>
                            {ug.location === 'H' ? 'vs.' : ug.location === 'A' ? 'at' : 'vs. (N)'}{' '}
                            {ug.opponent?.name ?? 'Opponent'}
                          </strong>
                          {ug.opponent && (
                            <span className="team-abbr" style={{ marginLeft: 8 }}>
                              RPI #{ug.opponent.rpiRank} · NPI #{ug.opponent.npiRank}
                            </span>
                          )}
                        </div>
                        <span className="conf-tag">{ug.venueNote || ug.competition}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
