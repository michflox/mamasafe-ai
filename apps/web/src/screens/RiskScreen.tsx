import type { CaseSession } from '../engine/session';
import { CitationChip, ProvenanceBadge, TierBadge } from '../components/ui';

export function RiskScreen({ session }: { session: CaseSession }) {
  const s = session.snapshot;
  const a = s.assessment;
  if (!a || !s.payload) {
    return <EmptyState text="Submit an intake first." />;
  }
  const si = a.derived.shockIndex;
  const bandStyle =
    si === undefined
      ? 'bg-stone-200 text-ink'
      : si >= 1.3
        ? 'bg-danger text-white'
        : si >= 0.9
          ? 'bg-amber text-white'
          : 'bg-teal text-white';

  return (
    <div className="space-y-4">
      <div className="card p-5 text-center space-y-2">
        <div className="text-sm text-muted">Shock index (HR ÷ SBP)</div>
        <div className={`mx-auto w-40 h-40 rounded-full flex flex-col items-center justify-center ${bandStyle}`}>
          <div className="text-5xl font-extrabold">{si === undefined ? '—' : si.toFixed(2)}</div>
          <div className="text-xs mt-1 px-3">
            {si === undefined ? 'not computable — missing inputs' : si >= 1.3 ? 'CRITICAL band (≥ 1.3)' : si >= 0.9 ? 'warning band (≥ 0.9)' : 'normal obstetric range'}
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 pt-1">
          <TierBadge tier={a.tier} />
          <ProvenanceBadge provenance={a.provenance} />
        </div>
        {a.derived.earlyWarningBand && (
          <div className="text-sm text-muted">
            Early-warning score {a.derived.earlyWarningScore} ({a.derived.earlyWarningBand}) — MEOWS-style bands pending source verification
          </div>
        )}
      </div>

      <div className="card p-4">
        <h3 className="font-semibold mb-2">Red flags ({a.redFlags.length})</h3>
        <ul className="space-y-2">
          {a.redFlags.map((f) => (
            <li
              key={f.code}
              className={`rounded-xl border p-3 ${f.severity === 'CRITICAL' ? 'border-danger/50 bg-danger-soft' : 'border-amber/40 bg-amber-soft'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className={`text-xs font-bold ${f.severity === 'CRITICAL' ? 'text-danger' : 'text-amber-dark'}`}>{f.code}</div>
                  <div className="text-sm mt-0.5">{f.clinicianMessage}</div>
                </div>
                <CitationChip citation={f.citation} />
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="card p-4">
        <h3 className="font-semibold mb-2">Missing critical information ({a.missingInfo.length})</h3>
        <p className="text-xs text-muted mb-2">The engine never imputes. Absence is surfaced, never silently assumed.</p>
        <ul className="space-y-2">
          {a.missingInfo.map((m) => (
            <li key={m.field} className="rounded-xl border border-stone-200 bg-white p-3">
              <div className="text-sm font-semibold">{m.field}</div>
              <div className="text-sm text-muted">{m.whyItMatters}</div>
              {m.blocksActions.length > 0 && <div className="text-xs text-terracotta-dark mt-1">Gates: {m.blocksActions.join(', ')}</div>}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex gap-2">
        <button className="btn-secondary flex-1" onClick={() => session.setScreen('intake')}>← Edit intake</button>
        <button className="btn-primary flex-1" onClick={() => session.setScreen('actions')}>PPH actions →</button>
      </div>
    </div>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="card p-8 text-center text-muted">
      <div className="text-4xl mb-2">🤱</div>
      {text}
    </div>
  );
}
