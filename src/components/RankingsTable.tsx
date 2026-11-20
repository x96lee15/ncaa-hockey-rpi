import { ArrowDown, ArrowUp, Download, Search } from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';
import type { CombinedRankingRow, Conference } from '../../shared/types';

type ViewMode = 'compare' | 'rpi' | 'npi';

type SortKey =
  | 'rpiRank'
  | 'npiRank'
  | 'rankDelta'
  | 'team'
  | 'winPct'
  | 'rpi'
  | 'baseRpi'
  | 'rpiWp'
  | 'rpiOwp'
  | 'rpiOowp'
  | 'rpiQwb'
  | 'npi'
  | 'npiWp'
  | 'npiSos'
  | 'npiQwb';

const CONFERENCES: Array<'All' | Conference> = [
  'All',
  'Big Ten',
  'NCHC',
  'Hockey East',
  'ECAC',
  'CCHA',
  'AHA',
  'Independent',
];

interface RankingsTableProps {
  rankings: CombinedRankingRow[];
  onSelectTeam: (teamId: string) => void;
}

export function RankingsTable({ rankings, onSelectTeam }: RankingsTableProps) {
  const [search, setSearch] = useState('');
  const [conference, setConference] = useState<'All' | Conference>('All');
  const [viewMode, setViewMode] = useState<ViewMode>('compare');
  const [sortKey, setSortKey] = useState<SortKey>('rpiRank');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      // Ranks and team name default ascending; metric scores default descending
      const ascDefault = key === 'rpiRank' || key === 'npiRank' || key === 'team';
      setSortDir(ascDefault ? 'asc' : 'desc');
    }
  };

  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode);
    if (mode === 'npi') {
      setSortKey('npiRank');
      setSortDir('asc');
    } else if (mode === 'rpi') {
      setSortKey('rpiRank');
      setSortDir('asc');
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = rankings.filter((r) => {
      if (conference !== 'All' && r.team.conference !== conference) return false;
      if (!q) return true;
      return (
        r.team.name.toLowerCase().includes(q) ||
        r.team.abbr.toLowerCase().includes(q) ||
        r.team.conference.toLowerCase().includes(q)
      );
    });

    const dir = sortDir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
      const val = (row: CombinedRankingRow): number | string => {
        switch (sortKey) {
          case 'rpiRank':
            return row.rpiRank;
          case 'npiRank':
            return row.npiRank;
          case 'rankDelta':
            return row.rankDelta;
          case 'team':
            return row.team.name;
          case 'winPct': {
            const gp = row.record.gamesPlayed || 1;
            return (row.record.wins + 0.5 * row.record.ties) / gp;
          }
          case 'rpi':
            return row.rpi.rpi;
          case 'baseRpi':
            return row.rpi.baseRpi;
          case 'rpiWp':
            return row.rpi.wp;
          case 'rpiOwp':
            return row.rpi.owp;
          case 'rpiOowp':
            return row.rpi.oowp;
          case 'rpiQwb':
            return row.rpi.qwb;
          case 'npi':
            return row.npi.npi;
          case 'npiWp':
            return row.npi.weightedWp;
          case 'npiSos':
            return row.npi.sos;
          case 'npiQwb':
            return row.npi.qwb;
        }
      };
      const va = val(a);
      const vb = val(b);
      if (typeof va === 'string' && typeof vb === 'string') {
        return va.localeCompare(vb) * dir;
      }
      return ((va as number) - (vb as number)) * dir;
    });
  }, [rankings, search, conference, sortKey, sortDir]);

  const showCutline =
    conference === 'All' &&
    search.trim() === '' &&
    sortDir === 'asc' &&
    (sortKey === 'rpiRank' || sortKey === 'npiRank');

  const renderSortHeader = (label: string, key: SortKey, isNum = true, title?: string) => {
    const active = sortKey === key;
    return (
      <th
        className={`sortable ${isNum ? 'num' : ''} ${active ? 'sorted' : ''}`}
        onClick={() => handleSort(key)}
        title={title}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {label}
          {active && (sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
        </span>
      </th>
    );
  };

  const colCount = viewMode === 'compare' ? 11 : viewMode === 'rpi' ? 10 : 10;

  return (
    <section className="panel" aria-label="2026-27 NCAA D-I Men's Hockey RPI and NPI Rankings">
      <div className="toolbar">
        <div className="toolbar-group">
          <div className="search-wrap">
            <Search size={14} className="search-icon" />
            <input
              id="team-search-input"
              type="search"
              className="search-input"
              placeholder="Filter team or abbr..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="filter-pills" role="group" aria-label="Filter by conference">
            {CONFERENCES.map((conf) => (
              <button
                key={conf}
                type="button"
                className={`pill-btn ${conference === conf ? 'active' : ''}`}
                onClick={() => setConference(conf)}
              >
                {conf}
              </button>
            ))}
          </div>
        </div>

        <div className="toolbar-group">
          <div className="segmented" role="tablist" aria-label="Table column preset">
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'compare'}
              className={`segmented-btn ${viewMode === 'compare' ? 'active' : ''}`}
              onClick={() => handleViewChange('compare')}
            >
              Side-by-Side
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'rpi'}
              className={`segmented-btn ${viewMode === 'rpi' ? 'active' : ''}`}
              onClick={() => handleViewChange('rpi')}
            >
              Classic RPI
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'npi'}
              className={`segmented-btn ${viewMode === 'npi' ? 'active' : ''}`}
              onClick={() => handleViewChange('npi')}
            >
              NCAA NPI
            </button>
          </div>

          <a className="btn" href="/api/export/csv" download>
            <Download size={13} /> CSV
          </a>
          <a className="btn" href="/api/export/json" download>
            <Download size={13} /> JSON
          </a>
        </div>
      </div>

      <div className="table-scroll">
        <table className="data-table">
          <thead>
            {viewMode === 'compare' && (
              <tr>
                {renderSortHeader('RPI #', 'rpiRank', true, 'Classic NCAA Hockey RPI Rank')}
                {renderSortHeader('NPI #', 'npiRank', true, 'Current NCAA Power Index Rank')}
                {renderSortHeader('Δ Rank', 'rankDelta', true, 'RPI Rank minus NPI Rank (+ = higher in NPI)')}
                {renderSortHeader('Team', 'team', false)}
                <th>Conf</th>
                {renderSortHeader('W-L-T', 'winPct', true)}
                {renderSortHeader('RPI', 'rpi', true, '25% WP + 21% OWP + 54% OOWP + QWB')}
                {renderSortHeader('OWP', 'rpiOwp', true, 'Opponents Winning Percentage')}
                {renderSortHeader('NPI', 'npi', true, 'NCAA Power Index (0-100 scale)')}
                {renderSortHeader('SOS', 'npiSos', true, 'NPI Strength of Schedule')}
                {renderSortHeader('NPI QWB', 'npiQwb', true, 'NPI Quality Win Bonus')}
              </tr>
            )}
            {viewMode === 'rpi' && (
              <tr>
                {renderSortHeader('RPI #', 'rpiRank', true)}
                {renderSortHeader('Team', 'team', false)}
                <th>Conf</th>
                {renderSortHeader('W-L-T', 'winPct', true)}
                {renderSortHeader('Final RPI', 'rpi', true)}
                {renderSortHeader('Base RPI', 'baseRpi', true)}
                {renderSortHeader('QWB', 'rpiQwb', true, 'Top-20 Quality Wins Bonus')}
                {renderSortHeader('Wgt WP (25%)', 'rpiWp', true)}
                {renderSortHeader('OWP (21%)', 'rpiOwp', true)}
                {renderSortHeader('OOWP (54%)', 'rpiOowp', true)}
              </tr>
            )}
            {viewMode === 'npi' && (
              <tr>
                {renderSortHeader('NPI #', 'npiRank', true)}
                {renderSortHeader('RPI #', 'rpiRank', true)}
                {renderSortHeader('Team', 'team', false)}
                <th>Conf</th>
                {renderSortHeader('W-L-T', 'winPct', true)}
                {renderSortHeader('NPI', 'npi', true)}
                {renderSortHeader('Wgt W% (25%)', 'npiWp', true)}
                {renderSortHeader('SOS (75%)', 'npiSos', true)}
                {renderSortHeader('QWB', 'npiQwb', true)}
                <th className="num" title="Live USCHO Nov 20, 2026 verification reference">
                  USCHO Ref
                </th>
              </tr>
            )}
          </thead>
          <tbody>
            {filtered.map((row, index) => {
              const recordStr = `${row.record.wins}-${row.record.losses}-${row.record.ties}`;
              const rpiFlag = row.rpi.badWinsRemoved > 0 ? '*' : '';
              const npiFlag =
                (row.npi.badWinsRemoved > 0 ? '*' : '') +
                (row.npi.goodLossesRemoved > 0 ? '#' : '');

              const deltaClass =
                row.rankDelta > 0 ? 'up' : row.rankDelta < 0 ? 'down' : 'flat';
              const deltaText =
                row.rankDelta > 0 ? `+${row.rankDelta}` : row.rankDelta < 0 ? `${row.rankDelta}` : '0';

              const showCutlineAfter = showCutline && index === 15;

              return (
                <Fragment key={row.team.id}>
                  <tr className="clickable" onClick={() => onSelectTeam(row.team.id)}>
                    {viewMode === 'compare' && (
                      <>
                        <td className="num">
                          <span className={`rank-num ${row.rpiRank <= 16 ? 'top16' : ''}`}>
                            {row.rpiRank}
                          </span>
                        </td>
                        <td className="num">
                          <span className={`rank-num ${row.npiRank <= 16 ? 'top16' : ''}`}>
                            {row.npiRank}
                          </span>
                        </td>
                        <td className="num">
                          <span
                            className={`delta-badge ${deltaClass}`}
                            title={
                              row.rankDelta > 0
                                ? `Ranked ${row.rankDelta} spots higher in NPI than classic RPI`
                                : row.rankDelta < 0
                                  ? `Ranked ${Math.abs(row.rankDelta)} spots higher in classic RPI than NPI`
                                  : 'Identical rank in RPI and NPI'
                            }
                          >
                            {deltaText}
                          </span>
                        </td>
                        <td>
                          <span className="team-cell">
                            <span
                              className="team-swatch"
                              style={{ backgroundColor: row.team.primaryColor }}
                            />
                            <span className="team-name">{row.team.name}</span>
                            <span className="team-abbr">{row.team.abbr}</span>
                          </span>
                        </td>
                        <td>
                          <span className="conf-tag">{row.team.conference}</span>
                        </td>
                        <td className="num mono">{recordStr}</td>
                        <td className="num">
                          <span className="metric-primary">{row.rpi.rpi.toFixed(4)}</span>
                          {rpiFlag && (
                            <span
                              className="flag-mark"
                              title={`${row.rpi.badWinsRemoved} win(s) removed to prevent RPI dilution`}
                            >
                              {rpiFlag}
                            </span>
                          )}
                        </td>
                        <td className="num metric-secondary">{row.rpi.owp.toFixed(4)}</td>
                        <td className="num">
                          <span className="metric-primary">{row.npi.npi.toFixed(3)}</span>
                          {npiFlag && (
                            <span
                              className="flag-mark"
                              title={
                                npiFlag.includes('#')
                                  ? `${row.npi.goodLossesRemoved} loss(es) to top opponents excluded from NPI`
                                  : `${row.npi.badWinsRemoved} win(s) excluded from NPI`
                              }
                            >
                              {npiFlag}
                            </span>
                          )}
                        </td>
                        <td className="num metric-secondary">{row.npi.sos.toFixed(3)}</td>
                        <td className="num metric-secondary">{row.npi.qwb.toFixed(3)}</td>
                      </>
                    )}

                    {viewMode === 'rpi' && (
                      <>
                        <td className="num">
                          <span className={`rank-num ${row.rpiRank <= 16 ? 'top16' : ''}`}>
                            {row.rpiRank}
                          </span>
                        </td>
                        <td>
                          <span className="team-cell">
                            <span
                              className="team-swatch"
                              style={{ backgroundColor: row.team.primaryColor }}
                            />
                            <span className="team-name">{row.team.name}</span>
                            <span className="team-abbr">{row.team.abbr}</span>
                          </span>
                        </td>
                        <td>
                          <span className="conf-tag">{row.team.conference}</span>
                        </td>
                        <td className="num mono">{recordStr}</td>
                        <td className="num">
                          <span className="metric-primary">{row.rpi.rpi.toFixed(4)}</span>
                          {rpiFlag && (
                            <span
                              className="flag-mark"
                              title={`${row.rpi.badWinsRemoved} bad win(s) removed`}
                            >
                              *
                            </span>
                          )}
                        </td>
                        <td className="num metric-secondary">{row.rpi.baseRpi.toFixed(4)}</td>
                        <td className="num metric-secondary">
                          {row.rpi.qwb > 0 ? `+${row.rpi.qwb.toFixed(4)}` : '0.0000'}
                        </td>
                        <td className="num metric-secondary">
                          {row.rpi.wp.toFixed(4)}{' '}
                          <span className="team-abbr">(#{row.rpi.wpRank})</span>
                        </td>
                        <td className="num metric-secondary">
                          {row.rpi.owp.toFixed(4)}{' '}
                          <span className="team-abbr">(#{row.rpi.owpRank})</span>
                        </td>
                        <td className="num metric-secondary">
                          {row.rpi.oowp.toFixed(4)}{' '}
                          <span className="team-abbr">(#{row.rpi.oowpRank})</span>
                        </td>
                      </>
                    )}

                    {viewMode === 'npi' && (
                      <>
                        <td className="num">
                          <span className={`rank-num ${row.npiRank <= 16 ? 'top16' : ''}`}>
                            {row.npiRank}
                          </span>
                        </td>
                        <td className="num metric-secondary">#{row.rpiRank}</td>
                        <td>
                          <span className="team-cell">
                            <span
                              className="team-swatch"
                              style={{ backgroundColor: row.team.primaryColor }}
                            />
                            <span className="team-name">{row.team.name}</span>
                            <span className="team-abbr">{row.team.abbr}</span>
                          </span>
                        </td>
                        <td>
                          <span className="conf-tag">{row.team.conference}</span>
                        </td>
                        <td className="num mono">{recordStr}</td>
                        <td className="num">
                          <span className="metric-primary">{row.npi.npi.toFixed(3)}</span>
                          {npiFlag && <span className="flag-mark">{npiFlag}</span>}
                        </td>
                        <td className="num metric-secondary">
                          {row.npi.weightedWp.toFixed(3)}{' '}
                          <span className="team-abbr">(#{row.npi.weightedWpRank})</span>
                        </td>
                        <td className="num metric-secondary">
                          {row.npi.sos.toFixed(3)}{' '}
                          <span className="team-abbr">(#{row.npi.sosRank})</span>
                        </td>
                        <td className="num metric-secondary">{row.npi.qwb.toFixed(3)}</td>
                        <td className="num metric-secondary">
                          {row.uschoReferenceNpi !== undefined
                            ? `${row.uschoReferenceNpi.toFixed(3)} (#${row.uschoReferenceRank})`
                            : '—'}
                        </td>
                      </>
                    )}
                  </tr>

                  {showCutlineAfter && (
                    <tr className="cutline-row">
                      <td colSpan={colCount}>
                        NCAA Tournament 16-Team Field Cutline ({sortKey === 'rpiRank' ? 'Classic RPI' : 'NCAA NPI'} Top 16 above)
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="table-footer">
        <div>
          Showing <strong>{filtered.length}</strong> of {rankings.length} Division I Men&apos;s programs.
          Click any team row to inspect its game-by-game RPI &amp; NPI audit.
        </div>
        <div>
          <span className="mono">*</span> Bad win removed &nbsp;·&nbsp;{' '}
          <span className="mono">#</span> Good loss removed &nbsp;·&nbsp;{' '}
          <span className="mono">Δ Rank = RPI# − NPI#</span> (+ favors NPI)
        </div>
      </div>
    </section>
  );
}
