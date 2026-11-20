import { RotateCcw } from 'lucide-react';
import type { NpiDials, RpiDials } from '../../shared/types';
import { DEFAULT_NPI_DIALS, DEFAULT_RPI_DIALS } from '../../shared/types';

interface DialLabProps {
  rpiDials: RpiDials;
  npiDials: NpiDials;
  isCustom: boolean;
  onChangeRpi: (next: RpiDials) => void;
  onChangeNpi: (next: NpiDials) => void;
  onResetDefaults: () => void;
}

export function DialLab({
  rpiDials,
  npiDials,
  isCustom,
  onChangeRpi,
  onChangeNpi,
  onResetDefaults,
}: DialLabProps) {
  const rpiSum = rpiDials.wpWeight + rpiDials.owpWeight + rpiDials.oowpWeight;
  const rpiWpPct = rpiSum > 0 ? Math.round((rpiDials.wpWeight / rpiSum) * 100) : 25;
  const rpiOwpPct = rpiSum > 0 ? Math.round((rpiDials.owpWeight / rpiSum) * 100) : 21;
  const rpiOowpPct = Math.max(0, 100 - rpiWpPct - rpiOwpPct);

  return (
    <div>
      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Interactive Formula &amp; Dial Lab</h2>
            <p className="panel-desc">
              Adjust any weighting dial below to recompute all 62 teams live across both Classic RPI and NCAA NPI.
            </p>
          </div>
          <button
            type="button"
            className="btn"
            disabled={!isCustom}
            onClick={onResetDefaults}
          >
            <RotateCcw size={13} /> Reset to Official NCAA Defaults
          </button>
        </div>
      </div>

      <div className="dial-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">Classic NCAA Hockey RPI Dials</h3>
              <p className="panel-desc">Official historical D-I Men&apos;s Hockey weights: 25% WP · 21% OWP · 54% OOWP</p>
            </div>
          </div>

          <div className="dial-body">
            <div className="formula-equation">
              RPI = ({rpiWpPct}% × WgtWP) + ({rpiOwpPct}% × OWP) + ({rpiOowpPct}% × OOWP)
              {rpiDials.includeQwb ? ' + QWB_top20' : ''}
            </div>

            <div className="dial-row">
              <div className="dial-label-line">
                <span>Team Winning % Weight (WP)</span>
                <span className="mono">{Math.round(rpiDials.wpWeight * 100)}% (norm {rpiWpPct}%)</span>
              </div>
              <input
                type="range"
                className="dial-slider"
                min={0.05}
                max={0.6}
                step={0.01}
                value={rpiDials.wpWeight}
                onChange={(e) => onChangeRpi({ ...rpiDials, wpWeight: Number(e.target.value) })}
              />
            </div>

            <div className="dial-row">
              <div className="dial-label-line">
                <span>Opponents&apos; Winning % Weight (OWP)</span>
                <span className="mono">{Math.round(rpiDials.owpWeight * 100)}% (norm {rpiOwpPct}%)</span>
              </div>
              <input
                type="range"
                className="dial-slider"
                min={0.05}
                max={0.6}
                step={0.01}
                value={rpiDials.owpWeight}
                onChange={(e) => onChangeRpi({ ...rpiDials, owpWeight: Number(e.target.value) })}
              />
            </div>

            <div className="dial-row">
              <div className="dial-label-line">
                <span>Opponents&apos; Opponents&apos; WP Weight (OOWP)</span>
                <span className="mono">{Math.round(rpiDials.oowpWeight * 100)}% (norm {rpiOowpPct}%)</span>
              </div>
              <input
                type="range"
                className="dial-slider"
                min={0.05}
                max={0.75}
                step={0.01}
                value={rpiDials.oowpWeight}
                onChange={(e) => onChangeRpi({ ...rpiDials, oowpWeight: Number(e.target.value) })}
              />
            </div>

            <div className="dial-row">
              <div className="dial-label-line">
                <span>Road Win / Home Loss Multiplier</span>
                <span className="mono">
                  {rpiDials.roadWinWeight.toFixed(2)} / {rpiDials.homeWinWeight.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                className="dial-slider"
                min={1.0}
                max={1.4}
                step={0.05}
                value={rpiDials.roadWinWeight}
                onChange={(e) => {
                  const rw = Number(e.target.value);
                  onChangeRpi({ ...rpiDials, roadWinWeight: rw, homeWinWeight: Number((2 - rw).toFixed(2)) });
                }}
              />
              <span className="dial-hint">Default: 1.20 road win &amp; home loss / 0.80 home win &amp; road loss (1.00 neutral)</span>
            </div>

            <div className="dial-row">
              <div className="dial-label-line">
                <span>3-on-3 Overtime Win Share</span>
                <span className="mono">
                  {Math.round(rpiDials.otWinShare * 100)} / {Math.round((1 - rpiDials.otWinShare) * 100)}
                </span>
              </div>
              <input
                type="range"
                className="dial-slider"
                min={0.5}
                max={1.0}
                step={0.05}
                value={rpiDials.otWinShare}
                onChange={(e) => onChangeRpi({ ...rpiDials, otWinShare: Number(e.target.value) })}
              />
              <span className="dial-hint">Classic D-I Hockey RPI used 55/45 for 3-on-3 OT (vs. 100/0 for full wins)</span>
            </div>

            <label className="toggle-row">
              <div>
                <strong style={{ fontSize: 13 }}>Remove Bad Wins (*)</strong>
                <div className="dial-hint">Exclude wins against weak opponents that mathematically lower RPI</div>
              </div>
              <input
                type="checkbox"
                checked={rpiDials.removeBadWins}
                onChange={(e) => onChangeRpi({ ...rpiDials, removeBadWins: e.target.checked })}
              />
            </label>

            <label className="toggle-row">
              <div>
                <strong style={{ fontSize: 13 }}>Top-20 Quality Wins Bonus (QWB)</strong>
                <div className="dial-hint">Sliding bonus from +0.0020 (#1) down to +0.0001 (#20)</div>
              </div>
              <input
                type="checkbox"
                checked={rpiDials.includeQwb}
                onChange={(e) => onChangeRpi({ ...rpiDials, includeQwb: e.target.checked })}
              />
            </label>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">NCAA Power Index (NPI) Dials</h3>
              <p className="panel-desc">Official 2025–27 NCAA D-I Men&apos;s Hockey tournament selection parameters</p>
            </div>
          </div>

          <div className="dial-body">
            <div className="formula-equation">
              NPI_game = {Math.round(npiDials.wpWeight * 100)}%·(100·w) + {Math.round(npiDials.sosWeight * 100)}%·OppNPI + w·max(0, OppNPI − {npiDials.qwbBase})·{npiDials.qwbMultiplier}
            </div>

            <div className="dial-row">
              <div className="dial-label-line">
                <span>Win % / Strength of Schedule Split</span>
                <span className="mono">
                  {Math.round(npiDials.wpWeight * 100)}% / {Math.round(npiDials.sosWeight * 100)}%
                </span>
              </div>
              <input
                type="range"
                className="dial-slider"
                min={0.1}
                max={0.5}
                step={0.05}
                value={npiDials.wpWeight}
                onChange={(e) => {
                  const wp = Number(e.target.value);
                  onChangeNpi({ ...npiDials, wpWeight: wp, sosWeight: Number((1 - wp).toFixed(2)) });
                }}
              />
              <span className="dial-hint">Official NCAA D-I Men&apos;s Hockey dial: 25% Win % / 75% SOS</span>
            </div>

            <div className="dial-row">
              <div className="dial-label-line">
                <span>Home / Away Win-Loss Weights</span>
                <span className="mono">
                  {npiDials.roadWinWeight.toFixed(2)} / {npiDials.homeWinWeight.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                className="dial-slider"
                min={1.0}
                max={1.4}
                step={0.05}
                value={npiDials.roadWinWeight}
                onChange={(e) => {
                  const rw = Number(e.target.value);
                  onChangeNpi({ ...npiDials, roadWinWeight: rw, homeWinWeight: Number((2 - rw).toFixed(2)) });
                }}
              />
              <span className="dial-hint">Official: 1.20 / 0.80 regular season (1.00 / 1.00 postseason &amp; neutral)</span>
            </div>

            <div className="dial-row">
              <div className="dial-label-line">
                <span>3-on-3 Overtime Split</span>
                <span className="mono">
                  {Math.round(npiDials.otWinShare * 100)} / {Math.round((1 - npiDials.otWinShare) * 100)}
                </span>
              </div>
              <input
                type="range"
                className="dial-slider"
                min={0.5}
                max={1.0}
                step={0.05}
                value={npiDials.otWinShare}
                onChange={(e) => onChangeNpi({ ...npiDials, otWinShare: Number(e.target.value) })}
              />
              <span className="dial-hint">Official: 60/40 regular season, 100/0 postseason</span>
            </div>

            <div className="dial-row">
              <div className="dial-label-line">
                <span>Quality Win Bonus Base &amp; Multiplier</span>
                <span className="mono">
                  Base {npiDials.qwbBase.toFixed(1)} · ×{npiDials.qwbMultiplier.toFixed(2)}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <input
                  type="range"
                  className="dial-slider"
                  min={45}
                  max={58}
                  step={0.5}
                  value={npiDials.qwbBase}
                  onChange={(e) => onChangeNpi({ ...npiDials, qwbBase: Number(e.target.value) })}
                />
                <input
                  type="range"
                  className="dial-slider"
                  min={0}
                  max={1.0}
                  step={0.05}
                  value={npiDials.qwbMultiplier}
                  onChange={(e) => onChangeNpi({ ...npiDials, qwbMultiplier: Number(e.target.value) })}
                />
              </div>
              <span className="dial-hint">Official: QWB Base = 51.0, Multiplier = 0.50 (matches USCHO live table)</span>
            </div>

            <div className="dial-row">
              <div className="dial-label-line">
                <span>Minimum Retained Wins Dial</span>
                <span className="mono">{npiDials.minWins} wins</span>
              </div>
              <input
                type="range"
                className="dial-slider"
                min={1}
                max={20}
                step={1}
                value={npiDials.minWins}
                onChange={(e) => onChangeNpi({ ...npiDials, minWins: Number(e.target.value) })}
              />
              <span className="dial-hint">Official: 12 wins. Lower this dial (e.g., to 4) to preview mid-season bad-win (*) exclusions.</span>
            </div>

            <label className="toggle-row">
              <div>
                <strong style={{ fontSize: 13 }}>Exclude Good Losses (#)</strong>
                <div className="dial-hint">Remove regulation losses to elite opponents that would raise a team&apos;s NPI</div>
              </div>
              <input
                type="checkbox"
                checked={npiDials.removeGoodLosses}
                onChange={(e) => onChangeNpi({ ...npiDials, removeGoodLosses: e.target.checked })}
              />
            </label>
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Why Classic RPI and NCAA NPI Diverge</h3>
            <p className="panel-desc">Key structural differences in how the two systems evaluate the exact same 334 games</p>
          </div>
        </div>
        <div className="dial-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
          <div>
            <strong style={{ display: 'block', marginBottom: 4 }}>1. Recursive Strength vs. Two-Hop Average</strong>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-secondary)' }}>
              Classic RPI stops after two hops (21% OWP + 54% OOWP) using unweighted opponent winning percentages. NPI solves an iterative fixed-point system where every opponent&apos;s rating recursively reflects the entire Division I network (75% SOS).
            </p>
          </div>
          <div>
            <strong style={{ display: 'block', marginBottom: 4 }}>2. Continuous QWB vs. Top-20 Step Cutoff</strong>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-secondary)' }}>
              Classic RPI adds a discrete top-20 bonus (up to +0.0020 for beating #1). NPI awards a continuous Quality Win Bonus proportional to <span className="mono">(OppNPI − {DEFAULT_NPI_DIALS.qwbBase}) × {DEFAULT_NPI_DIALS.qwbMultiplier}</span> on wins, ties, and OT losses — rewarding upset runs like Ohio State&apos;s wins over #2 Michigan and #3 Wisconsin.
            </p>
          </div>
          <div>
            <strong style={{ display: 'block', marginBottom: 4 }}>3. Good-Loss Exclusion (#) &amp; Retained Wins</strong>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-secondary)' }}>
              Both systems prevent beating a weak opponent from hurting your rating (though NPI requires retaining at least {DEFAULT_NPI_DIALS.minWins} wins first). NPI additionally strips &ldquo;good losses&rdquo; (<span className="mono">#</span>) so losing to a top-5 powerhouse can never artificially boost a team&apos;s rating — unlike Classic RPI ({DEFAULT_RPI_DIALS.oowpWeight * 100}% OOWP).
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
