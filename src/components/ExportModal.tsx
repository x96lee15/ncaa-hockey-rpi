import { Check, Copy, Download, Terminal, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
}

export function ExportModal({ open, onClose }: ExportModalProps) {
  const [script, setScript] = useState<string>('');
  const [meta, setMeta] = useState<{ fileCount: number; zipBytes: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

  const runCommand =
    'Get-Clipboard | Set-Content setup-iceindex.ps1; powershell -ExecutionPolicy Bypass -File setup-iceindex.ps1';

  useEffect(() => {
    if (!open || script) return;
    setLoading(true);
    setError(null);
    fetch('/api/export/script')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ fileCount: number; zipBytes: number; powershell: string }>;
      })
      .then((data) => {
        setScript(data.powershell);
        setMeta({ fileCount: data.fileCount, zipBytes: data.zipBytes });
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load export script');
      })
      .finally(() => setLoading(false));
  }, [open, script]);

  if (!open) return null;

  const copyText = async (text: string, which: 'script' | 'cmd') => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      if (which === 'script' && textAreaRef.current) {
        textAreaRef.current.focus();
        textAreaRef.current.select();
        document.execCommand('copy');
      } else {
        const tmp = document.createElement('textarea');
        tmp.value = text;
        document.body.appendChild(tmp);
        tmp.select();
        document.execCommand('copy');
        document.body.removeChild(tmp);
      }
    }
    if (which === 'script') {
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2500);
    } else {
      setCopiedCmd(true);
      setTimeout(() => setCopiedCmd(false), 2500);
    }
  };

  return (
    <div className="drawer-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="drawer-sheet"
        style={{ width: 'min(640px, 96vw)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="drawer-header">
          <div>
            <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, letterSpacing: '-0.02em' }}>
              Export Project to Your Windows Laptop
            </h2>
            <p className="panel-desc" style={{ marginTop: 4 }}>
              Preview panes block direct file downloads — use the 2-step PowerShell copy below instead.
            </p>
          </div>
          <button type="button" className="btn" onClick={onClose}>
            <X size={15} /> Close
          </button>
        </div>

        <div className="drawer-body">
          {loading && <div style={{ color: 'var(--ink-muted)' }}>Preparing self-extracting bundle...</div>}
          {error && <div className="notice-banner warning">{error}</div>}

          {script && (
            <>
              <div className="formula-box">
                <div className="formula-box-head">
                  <span className="formula-box-title">Step 1 — Copy the self-extracting script</span>
                  {meta && (
                    <span className="mono" style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>
                      {meta.fileCount} files · {(meta.zipBytes / 1024).toFixed(1)} KB
                    </span>
                  )}
                </div>
                <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--ink-secondary)' }}>
                  Click the button below to copy the complete project bundle to your clipboard (or click inside the box and press <kbd>Ctrl+A</kbd>, <kbd>Ctrl+C</kbd>).
                </p>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => copyText(script, 'script')}
                  >
                    {copiedScript ? <Check size={14} /> : <Copy size={14} />}
                    {copiedScript ? 'Copied Setup Script!' : 'Copy PowerShell Setup Script'}
                  </button>
                  <a
                    href="/api/export/project.zip"
                    download="ncaa-hockey-rpi.zip"
                    className="btn"
                  >
                    <Download size={14} /> Direct .zip (outside preview)
                  </a>
                </div>
                <textarea
                  ref={textAreaRef}
                  readOnly
                  value={script}
                  onFocus={(e) => e.currentTarget.select()}
                  rows={6}
                  className="mono"
                  style={{
                    width: '100%',
                    padding: 10,
                    fontSize: 11,
                    borderRadius: 6,
                    border: '1px solid var(--border-hairline)',
                    background: '#ffffff',
                    color: 'var(--ink-secondary)',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div className="formula-box">
                <div className="formula-box-head">
                  <span className="formula-box-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Terminal size={13} /> Step 2 — Extract in Windows PowerShell
                  </span>
                </div>
                <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--ink-secondary)' }}>
                  Open PowerShell in the folder where you want the project (e.g. Desktop or Documents) and run this one-liner right after Step 1:
                </p>
                <div className="formula-equation" style={{ marginBottom: 8 }}>
                  {runCommand}
                </div>
                <button
                  type="button"
                  className="btn"
                  onClick={() => copyText(runCommand, 'cmd')}
                >
                  {copiedCmd ? <Check size={13} /> : <Copy size={13} />}
                  {copiedCmd ? 'Copied!' : 'Copy Extract Command'}
                </button>
              </div>

              <div className="formula-box">
                <div className="formula-box-head">
                  <span className="formula-box-title">Step 3 — Install &amp; Run</span>
                </div>
                <div className="formula-equation">
                  {'cd ncaa-hockey-rpi\nnpm install\nnpm run dev'}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
