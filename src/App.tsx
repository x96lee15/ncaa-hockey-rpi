import {
  BarChart3,
  CheckCircle2,
  FlaskConical,
  RefreshCw,
  SlidersHorizontal,
  Table2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { NpiDials, RankingsPayload, RpiDials } from '../shared/types';
import { DEFAULT_NPI_DIALS, DEFAULT_RPI_DIALS } from '../shared/types';
import { getCustomRankings, getRankings, syncLiveGames } from './api';
import { ComparisonView } from './components/ComparisonView';
import { DialLab } from './components/DialLab';
import { RankingsTable } from './components/RankingsTable';
import { TeamDossierDrawer } from './components/TeamDossierDrawer';
import { WhatIfSimulator } from './components/WhatIfSimulator';

type TabKey = 'rankings' | 'compare' | 'simulator' | 'dials';

function dialsEqual<T extends object>(a: T, b: T): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export default function App() {
  const [tab, setTab] = useState<TabKey>('rankings');
  const [payload, setPayload] = useState<RankingsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [rpiDials, setRpiDials] = useState<RpiDials>(DEFAULT_RPI_DIALS);
  const [npiDials, setNpiDials] = useState<NpiDials>(DEFAULT_NPI_DIALS);

  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState<{ text: string; tone?: 'info' | 'warning' } | null>(null);

  const isCustomDials = useMemo(
    () => !dialsEqual(rpiDials, DEFAULT_RPI_DIALS) || !dialsEqual(npiDials, DEFAULT_NPI_DIALS),
    [rpiDials, npiDials],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const req = isCustomDials ? getCustomRankings(rpiDials, npiDials) : getRankings();
    req
      .then((data) => {
        if (!cancelled) {
          setPayload(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load rankings');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [rpiDials, npiDials, isCustomDials]);

  const handleSync = async () => {
    setSyncing(true);
    setNotice(null);
    try {
      const res = await syncLiveGames();
      setPayload(res.rankings);
      setNotice({
        text: res.message,
        tone: res.synced ? 'info' : 'warning',
      });
    } catch (err) {
      setNotice({
        text: err instanceof Error ? err.message : 'Sync failed',
        tone: 'warning',
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleResetDials = () => {
    setRpiDials(DEFAULT_RPI_DIALS);
    setNpiDials(DEFAULT_NPI_DIALS);
  };

  const summary = useMemo(() => {
    if (!payload) return null;
    const topRpi = payload.rankings.find((r) => r.rpiRank === 1);
    const topNpi = payload.rankings.find((r) => r.npiRank === 1);
    const biggestSwing = [...payload.rankings].sort(
      (a, b) => Math.abs(b.rankDelta) - Math.abs(a.rankDelta),
    )[0];

    let maxErr = 0;
    let verifiedCount = 0;
    for (const r of payload.rankings) {
      if (r.uschoReferenceNpi !== undefined) {
        verifiedCount++;
        maxErr = Math.max(maxErr, Math.abs(r.npi.npi - r.uschoReferenceNpi));
      }
    }

    return { topRpi, topNpi, biggestSwing, maxErr, verifiedCount };
  }, [payload]);

  const teams = useMemo(() => payload?.rankings.map((r) => r.team) ?? [], [payload]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <div className="brand-mark" aria-hidden="true">
              IX
            </div>
            <div className="brand-title">
              <span className="brand-name">IceIndex</span>
              <span className="brand-sub">NCAA D-I Men&apos;s Hockey · 2026–27</span>
            </div>
          </div>

          <nav className="nav-tabs" aria-label="Primary navigation">
            <button
              id="tab-rankings"
              type="button"
              className={`nav-tab ${tab === 'rankings' ? 'active' : ''}`}
              onClick={() => setTab('rankings')}
            >
              <Table2 size={14} /> Rankings
            </button>
            <button
              id="tab-compare"
              type="button"
              className={`nav-tab ${tab === 'compare' ? 'active' : ''}`}
              onClick={() => setTab('compare')}
            >
              <BarChart3 size={14} /> RPI vs. NPI
            </button>
            <button
              id="tab-simulator"
              type="button"
              className={`nav-tab ${tab === 'simulator' ? 'active' : ''}`}
              onClick={() => setTab('simulator')}
            >
              <FlaskConical size={14} /> What-If Simulator
            </button>
            <button
              id="tab-dials"
              type="button"
              className={`nav-tab ${tab === 'dials' ? 'active' : ''}`}
              onClick={() => setTab('dials')}
            >
              <SlidersHorizontal size={14} /> Dial Lab
            </button>
          </nav>

          <div className="topbar-actions">
            <button
              id="sync-live-btn"
              type="button"
              className="sync-btn"
              onClick={handleSync}
              disabled={syncing}
            >
              <RefreshCw size={13} className={syncing ? 'spin' : ''} />
              {syncing ? 'Syncing...' : 'Sync Live Games'}
            </button>
          </div>
        </div>
      </header>

      <main className="main-container">
        <div className="page-header">
          <div>
            <h1>2026–27 NCAA Division I Men&apos;s Hockey RPI &amp; NPI</h1>
            <p className="page-subtitle">
              Side-by-side Ratings Percentage Index (25% WP · 21% OWP · 54% OOWP) and current NCAA Power Index (25% Wgt W% · 75% SOS + QWB).
            </p>
          </div>

          {payload && (
            <div className="meta-inline">
              <span className="meta-chip">
                Through <strong className="mono">{payload.asOfDate}</strong> ·{' '}
                <span className="mono">{payload.completedGamesCount}</span> Finals
              </span>
                {!isCustomDials && payload.sourceInfo.mode === 'live' && (
              <span
                className="meta-chip verified"
                title={`Live composite schedule synced from College Hockey, Inc. at ${payload.sourceInfo.lastSyncedAt}`}
              >
                <CheckCircle2 size={13} /> Live · College Hockey, Inc.
              </span>
              )}
              {!isCustomDials && payload.sourceInfo.mode === 'snapshot' && summary && summary.verifiedCount === 62 && (
                <span
                  className="meta-chip verified"
                  title={`All 62 computed NPI scores match USCHO live rankings within ${summary.maxErr.toFixed(4)}`}
                >
                  <CheckCircle2 size={13} /> 62/62 NPI Verified (Δ ≤ {summary.maxErr.toFixed(4)})
                </span>
              )}
              {isCustomDials && (
                <button
                  type="button"
                  className="meta-chip custom-active"
                  style={{ cursor: 'pointer' }}
                  onClick={handleResetDials}
                >
                  Custom Dials Active · Reset
                </button>
              )}
            </div>
          )}
        </div>

        {notice && (
          <div className={`notice-banner ${notice.tone === 'warning' ? 'warning' : ''}`}>
            <span>{notice.text}</span>
            <button type="button" className="notice-close" onClick={() => setNotice(null)}>
              ✕
            </button>
          </div>
        )}

        {error && (
          <div className="notice-banner warning">
            <span>{error}</span>
          </div>
        )}

        {summary && payload && (
          <section className="summary-strip" aria-label="Season snapshot highlights">
            <div className="summary-cell">
              <div className="summary-label">#1 Classic RPI</div>
              <div className="summary-value">
                <span>{summary.topRpi?.team.name}</span>
                <span className="mono" style={{ fontSize: 15, color: 'var(--accent-ice)' }}>
                  {summary.topRpi?.rpi.rpi.toFixed(4)}
                </span>
              </div>
              <div className="summary-sub">
                {summary.topRpi?.team.conference} ·{' '}
                <span className="mono">
                  {summary.topRpi?.record.wins}-{summary.topRpi?.record.losses}-{summary.topRpi?.record.ties}
                </span>{' '}
                (NPI #{summary.topRpi?.npiRank})
              </div>
            </div>

            <div className="summary-cell">
              <div className="summary-label">#1 NCAA NPI</div>
              <div className="summary-value">
                <span>{summary.topNpi?.team.name}</span>
                <span className="mono" style={{ fontSize: 15, color: 'var(--accent-ice)' }}>
                  {summary.topNpi?.npi.npi.toFixed(3)}
                </span>
              </div>
              <div className="summary-sub">
                {summary.topNpi?.team.conference} · QWB{' '}
                <span className="mono">+{summary.topNpi?.npi.qwb.toFixed(3)}</span> · Converged in{' '}
                <span className="mono">{payload.npiIterations}</span> iter
              </div>
            </div>

            <div className="summary-cell">
              <div className="summary-label">Largest RPI ↔ NPI Swing</div>
              <div className="summary-value">
                <span>{summary.biggestSwing?.team.name}</span>
                <span
                  className={`delta-badge ${(summary.biggestSwing?.rankDelta ?? 0) > 0 ? 'up' : 'down'
                    }`}
                >
                  {(summary.biggestSwing?.rankDelta ?? 0) > 0
                    ? `+${summary.biggestSwing?.rankDelta}`
                    : summary.biggestSwing?.rankDelta}
                </span>
              </div>
              <div className="summary-sub">
                RPI #{summary.biggestSwing?.rpiRank} vs. NPI #{summary.biggestSwing?.npiRank} (
                {summary.biggestSwing?.team.conference})
              </div>
            </div>

            <div className="summary-cell">
              <div className="summary-label">Top-16 Field Agreement</div>
              <div className="summary-value">
                <span className="mono">
                  {payload.rankings.filter((r) => r.rpiRank <= 16 && r.npiRank <= 16).length} / 16
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-secondary)' }}>
                  shared teams
                </span>
              </div>
              <div className="summary-sub">
                {16 - payload.rankings.filter((r) => r.rpiRank <= 16 && r.npiRank <= 16).length} bubble
                spot(s) differ between classic RPI and NPI
              </div>
            </div>
          </section>
        )}

        {loading && !payload && (
          <div className="panel" style={{ padding: 40, textAlign: 'center', color: 'var(--ink-muted)' }}>
            Loading 2026–27 NCAA Division I Men&apos;s Hockey rankings...
          </div>
        )}

        {payload && (
          <>
            {tab === 'rankings' && (
              <RankingsTable rankings={payload.rankings} onSelectTeam={setSelectedTeamId} />
            )}

            {tab === 'compare' && (
              <ComparisonView
                rankings={payload.rankings}
                conferences={payload.conferences}
                onSelectTeam={setSelectedTeamId}
              />
            )}

            {tab === 'simulator' && (
              <WhatIfSimulator
                rankings={payload.rankings}
                teams={teams}
                rpiDials={rpiDials}
                npiDials={npiDials}
                onRankingsCommitted={setPayload}
                onSelectTeam={setSelectedTeamId}
              />
            )}

            {tab === 'dials' && (
              <DialLab
                rpiDials={rpiDials}
                npiDials={npiDials}
                isCustom={isCustomDials}
                onChangeRpi={setRpiDials}
                onChangeNpi={setNpiDials}
                onResetDefaults={handleResetDials}
              />
            )}
          </>
        )}
      </main>

      <footer className="app-footer">
        <div className="app-footer-inner">
          <div>
            Data source:{' '}
            <a
              href="https://www.collegehockeyinc.com/men/compnatfull27.php"
              target="_blank"
              rel="noreferrer"
            >
              College Hockey, Inc. 2026–27 National Composite Schedule
            </a>{' '}
            &amp;{' '}
            <a href="https://www.uscho.com/rankings/npi/d-i-men" target="_blank" rel="noreferrer">
              USCHO D-I Men&apos;s NPI
            </a>
            . Only official NCAA Division I regular-season games are counted; exhibitions are excluded.
          </div>
          <div className="mono">62 D-I Programs · 7 Conferences</div>
        </div>
      </footer>

      <TeamDossierDrawer
        teamId={selectedTeamId}
        onClose={() => setSelectedTeamId(null)}
        onSelectTeam={setSelectedTeamId}
      />
    </div>
  );
}
