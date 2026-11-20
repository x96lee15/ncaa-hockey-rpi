import { useMemo, useState } from 'react';
import type { CombinedRankingRow, Conference, ConferenceSummary } from '../../shared/types';

const CONF_COLORS: Record<Conference, string> = {
  'Big Ten': '#0B5FA5',
  'NCHC': '#C81E32',
  'Hockey East': '#1B7A56',
  'ECAC': '#C27803',
  'CCHA': '#2F6F8F',
  'AHA': '#7A5438',
  'Independent': '#64748B',
};

interface ComparisonViewProps {
  rankings: CombinedRankingRow[];
  conferences: ConferenceSummary[];
  onSelectTeam: (teamId: string) => void;
}

export function ComparisonView({ rankings, conferences, onSelectTeam }: ComparisonViewProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const hoveredRow = useMemo(
    () => rankings.find((r) => r.team.id === hoveredId) ?? null,
    [rankings, hoveredId],
  );

  const biggestNpiGainers = useMemo(
    () => [...rankings].sort((a, b) => b.rankDelta - a.rankDelta).slice(0, 7),
    [rankings],
  );

  const biggestRpiGainers = useMemo(
    () => [...rankings].sort((a, b) => a.rankDelta - b.rankDelta).slice(0, 7),
    [rankings],
  );

  // SVG scatter dimensions
  const W = 560;
  const H = 420;
  const padL = 48;
  const padR = 20;
  const padT = 22;
  const padB = 42;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const xPos = (rpiRank: number) => padL + ((rpiRank - 1) / 61) * plotW;
  const yPos = (npiRank: number) => padT + ((npiRank - 1) / 61) * plotH;
  const cutX = xPos(16.5);
  const cutY = yPos(16.5);

  const ticks = [1, 16, 32, 48, 62];

  return (
    <div>
      <div className="two-col">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Classic RPI Rank vs. NCAA NPI Rank</h2>
              <p className="panel-desc">
                Points below the diagonal rank higher in classic RPI; points above rank higher in NPI. Click any dot to open its team audit.
              </p>
            </div>
            {hoveredRow && (
              <div style={{ textAlign: 'right', fontSize: 12 }}>
                <strong>{hoveredRow.team.name}</strong> ({hoveredRow.team.conference})
                <div className="mono" style={{ color: 'var(--ink-secondary)' }}>
                  RPI #{hoveredRow.rpiRank} ({hoveredRow.rpi.rpi.toFixed(4)}) · NPI #{hoveredRow.npiRank} ({hoveredRow.npi.npi.toFixed(2)})
                </div>
              </div>
            )}
          </div>

          <div className="scatter-wrap">
            <svg viewBox={`0 0 ${W} ${H}`} className="scatter-svg" role="img" aria-label="Scatter plot comparing RPI Rank and NPI Rank">
              {/* Top-16 agreement quadrant */}
              <rect
                x={padL}
                y={padT}
                width={cutX - padL}
                height={cutY - padT}
                fill="hsl(206 75% 94%)"
                opacity={0.65}
              />

              {/* Grid lines */}
              {ticks.map((t) => (
                <g key={t}>
                  <line
                    x1={xPos(t)}
                    y1={padT}
                    x2={xPos(t)}
                    y2={H - padB}
                    stroke="hsl(214 20% 90%)"
                    strokeWidth={1}
                  />
                  <line
                    x1={padL}
                    y1={yPos(t)}
                    x2={W - padR}
                    y2={yPos(t)}
                    stroke="hsl(214 20% 90%)"
                    strokeWidth={1}
                  />
                  <text
                    x={xPos(t)}
                    y={H - padB + 16}
                    textAnchor="middle"
                    fontSize={10.5}
                    fontFamily="IBM Plex Mono, monospace"
                    fill="hsl(216 14% 48%)"
                  >
                    #{t}
                  </text>
                  <text
                    x={padL - 8}
                    y={yPos(t) + 3.5}
                    textAnchor="end"
                    fontSize={10.5}
                    fontFamily="IBM Plex Mono, monospace"
                    fill="hsl(216 14% 48%)"
                  >
                    #{t}
                  </text>
                </g>
              ))}

              {/* Top-16 Cutlines */}
              <line
                x1={cutX}
                y1={padT}
                x2={cutX}
                y2={H - padB}
                stroke="hsl(354 74% 46%)"
                strokeDasharray="4 3"
                strokeWidth={1.1}
                opacity={0.7}
              />
              <line
                x1={padL}
                y1={cutY}
                x2={W - padR}
                y2={cutY}
                stroke="hsl(354 74% 46%)"
                strokeDasharray="4 3"
                strokeWidth={1.1}
                opacity={0.7}
              />

              {/* Diagonal equality line */}
              <line
                x1={xPos(1)}
                y1={yPos(1)}
                x2={xPos(62)}
                y2={yPos(62)}
                stroke="hsl(216 20% 62%)"
                strokeDasharray="5 4"
                strokeWidth={1.2}
              />

              {/* Axis labels */}
              <text
                x={padL + plotW / 2}
                y={H - 6}
                textAnchor="middle"
                fontSize={11.5}
                fontWeight={700}
                fill="hsl(216 25% 32%)"
              >
                Classic RPI Rank (1 = Best)
              </text>
              <text
                x={13}
                y={padT + plotH / 2}
                textAnchor="middle"
                fontSize={11.5}
                fontWeight={700}
                fill="hsl(216 25% 32%)"
                transform={`rotate(-90 13 ${padT + plotH / 2})`}
              >
                NCAA NPI Rank (1 = Best)
              </text>

              {/* Zone annotations */}
              <text x={padL + 6} y={padT + 14} fontSize={10} fontWeight={700} fill="hsl(206 72% 32%)">
                BOTH TOP 16
              </text>
              <text x={W - padR - 6} y={padT + 14} textAnchor="end" fontSize={10} fontWeight={600} fill="hsl(154 60% 30%)">
                Favored by NPI ↑
              </text>
              <text x={padL + 6} y={H - padB - 8} fontSize={10} fontWeight={600} fill="hsl(354 68% 42%)">
                Favored by RPI ↓
              </text>

              {/* Team dots */}
              {rankings.map((r) => {
                const cx = xPos(r.rpiRank);
                const cy = yPos(r.npiRank);
                const isHover = hoveredId === r.team.id;
                const isOutlier = Math.abs(r.rankDelta) >= 5 || r.rpiRank <= 4;
                return (
                  <g
                    key={r.team.id}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredId(r.team.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={() => onSelectTeam(r.team.id)}
                  >
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isHover ? 7 : 4.8}
                      fill={CONF_COLORS[r.team.conference]}
                      stroke="#ffffff"
                      strokeWidth={isHover ? 2 : 1.2}
                      opacity={hoveredId && !isHover ? 0.45 : 0.92}
                    />
                    {(isHover || isOutlier) && (
                      <text
                        x={cx + 7}
                        y={cy + 3.5}
                        fontSize={10}
                        fontWeight={700}
                        fontFamily="IBM Plex Mono, monospace"
                        fill="hsl(216 42% 16%)"
                      >
                        {r.team.abbr}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="scatter-legend">
            {(Object.keys(CONF_COLORS) as Conference[]).map((c) => (
              <span key={c} className="legend-item">
                <span className="legend-dot" style={{ backgroundColor: CONF_COLORS[c] }} />
                {c}
              </span>
            ))}
          </div>
        </section>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Biggest Boost Under NCAA NPI</h2>
                <p className="panel-desc">Teams rewarded for strong SOS &amp; Quality Win Bonuses</p>
              </div>
            </div>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Team</th>
                    <th className="num">RPI #</th>
                    <th className="num">NPI #</th>
                    <th className="num">Swing</th>
                    <th className="num">NPI QWB</th>
                  </tr>
                </thead>
                <tbody>
                  {biggestNpiGainers.map((r) => (
                    <tr key={r.team.id} className="clickable" onClick={() => onSelectTeam(r.team.id)}>
                      <td>
                        <span className="team-cell">
                          <span className="team-swatch" style={{ backgroundColor: r.team.primaryColor }} />
                          <span className="team-name">{r.team.name}</span>
                        </span>
                      </td>
                      <td className="num mono">#{r.rpiRank}</td>
                      <td className="num mono" style={{ fontWeight: 700 }}>#{r.npiRank}</td>
                      <td className="num">
                        <span className="delta-badge up">+{r.rankDelta}</span>
                      </td>
                      <td className="num mono">{r.npi.qwb.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Biggest Boost Under Classic RPI</h2>
                <p className="panel-desc">Teams buoyed by OOWP (54%) &amp; high raw win totals</p>
              </div>
            </div>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Team</th>
                    <th className="num">RPI #</th>
                    <th className="num">NPI #</th>
                    <th className="num">Swing</th>
                    <th className="num">OOWP</th>
                  </tr>
                </thead>
                <tbody>
                  {biggestRpiGainers.map((r) => (
                    <tr key={r.team.id} className="clickable" onClick={() => onSelectTeam(r.team.id)}>
                      <td>
                        <span className="team-cell">
                          <span className="team-swatch" style={{ backgroundColor: r.team.primaryColor }} />
                          <span className="team-name">{r.team.name}</span>
                        </span>
                      </td>
                      <td className="num mono" style={{ fontWeight: 700 }}>#{r.rpiRank}</td>
                      <td className="num mono">#{r.npiRank}</td>
                      <td className="num">
                        <span className="delta-badge down">{r.rankDelta}</span>
                      </td>
                      <td className="num mono">{r.rpi.oowp.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Conference Strength Comparison (2026–27)</h2>
            <p className="panel-desc">
              Average RPI, average NPI, NCAA Top-16 representation, and non-conference records across all 7 conferences.
            </p>
          </div>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Conference</th>
                <th className="num">Teams</th>
                <th className="num">Avg RPI</th>
                <th className="num">Avg NPI</th>
                <th className="num">Top-16 (RPI)</th>
                <th className="num">Top-16 (NPI)</th>
                <th className="num">Non-Conf W-L-T</th>
                <th>RPI Leader</th>
                <th>NPI Leader</th>
              </tr>
            </thead>
            <tbody>
              {conferences.map((c) => (
                <tr key={c.conference}>
                  <td>
                    <span className="team-cell">
                      <span className="legend-dot" style={{ backgroundColor: CONF_COLORS[c.conference] }} />
                      <span className="team-name">{c.conference}</span>
                    </span>
                  </td>
                  <td className="num mono">{c.teamCount}</td>
                  <td className="num metric-primary">{c.avgRpi.toFixed(4)}</td>
                  <td className="num metric-primary">{c.avgNpi.toFixed(3)}</td>
                  <td className="num mono">{c.top16RpiCount}</td>
                  <td className="num mono">{c.top16NpiCount}</td>
                  <td className="num mono">
                    {c.nonConfWins}-{c.nonConfLosses}-{c.nonConfTies}
                  </td>
                  <td style={{ fontWeight: 600 }}>{c.topTeamByRpi}</td>
                  <td style={{ fontWeight: 600 }}>{c.topTeamByNpi}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
