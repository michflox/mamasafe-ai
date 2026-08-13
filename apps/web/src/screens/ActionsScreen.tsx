import { useState } from 'react';
import type { CaseSession } from '../engine/session';
import { CitationChip, ProvenanceBadge } from '../components/ui';
import { EmptyState } from './RiskScreen';

export function ActionsScreen({ session }: { session: CaseSession }) {
  const s = session.snapshot;
  const [overrideFor, setOverrideFor] = useState<string | null>(null);
  const [overrideReason, setOverrideReason] = useState('');
  if (!s.pathway) return <EmptyState text="Submit an intake first." />;

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Prioritized PPH actions</h2>
          <ProvenanceBadge provenance={s.pathway.provenance} />
        </div>
        <p className="text-sm text-muted mt-1">
          Steps 1–6 are one simultaneous first-response set — TXA never waits behind uterine massage. Tap-to-confirm logs actor + timestamp to the audit chain.
        </p>
      </div>

      <ol className="space-y-2">
        {s.pathway.actions.map((a) => {
          const blocked = a.status === 'NOT_APPLICABLE';
          const done = a.status === 'CONFIRMED';
          const explanation = s.aiExplanations[a.actionId];
          return (
            <li
              key={a.actionId}
              className={`card p-4 ${blocked ? 'opacity-75 border-danger/40 bg-danger-soft' : done ? 'border-teal/40 bg-teal-soft' : ''}`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-bold ${
                    blocked ? 'bg-danger text-white' : done ? 'bg-teal text-white' : 'bg-terracotta text-white'
                  }`}
                >
                  {done ? '✓' : blocked ? '✕' : a.sequence}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm sm:text-base">{a.title}</div>
                  <div className="text-xs text-muted mt-1">{a.rationale}</div>
                  <div className="flex flex-wrap items-center gap-1 mt-2">
                    <CitationChip citation={a.citation} />
                    {a.contraindicationsChecked.map((c) => (
                      <span key={c} className="rounded-full bg-stone-200 px-2 py-0.5 text-xs text-muted">{c}</span>
                    ))}
                    {a.gatedByMissingInfo.map((g) => (
                      <span key={g} className="rounded-full bg-amber-soft px-2 py-0.5 text-xs text-amber-dark">gated: {g}</span>
                    ))}
                    {blocked && <span className="rounded-full bg-danger px-2 py-0.5 text-xs font-bold text-white">BLOCKED / NOT AVAILABLE</span>}
                  </div>
                  {explanation && (
                    <div className="mt-2 rounded-xl border border-amber/40 bg-amber-soft p-2 text-xs">
                      <span className="font-semibold text-amber-dark">AI-generated — verify ({explanation.generatedBy}): </span>
                      {explanation.text}
                    </div>
                  )}
                  {!done && !blocked && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      <button className="btn-primary text-sm" onClick={() => session.confirm(a.actionId, 'CONFIRMED')}>
                        Confirm done
                      </button>
                      <button className="btn-secondary text-sm" onClick={() => session.confirm(a.actionId, 'DEFERRED')}>
                        Defer
                      </button>
                      <button className="btn-danger-outline text-sm" onClick={() => setOverrideFor(a.actionId)}>
                        Override
                      </button>
                      <button className="btn-teal text-sm" onClick={() => void session.explainAction(a)}>
                        Explain
                      </button>
                    </div>
                  )}
                  {done && a.confirmation && (
                    <div className="text-xs text-teal mt-2">
                      Confirmed by {a.confirmation.confirmedBy.id} ({a.confirmation.confirmedBy.role}) at {a.confirmation.confirmedAt}
                    </div>
                  )}
                  {overrideFor === a.actionId && (
                    <div className="mt-3 space-y-2 rounded-xl border border-danger/40 bg-white p-3">
                      <label className="label">Override reason (required — logged to audit)</label>
                      <input className="input" value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} placeholder="Clinical reason…" />
                      <div className="flex gap-2">
                        <button
                          className="btn-danger-outline text-sm"
                          disabled={!overrideReason.trim()}
                          onClick={() => {
                            session.confirm(a.actionId, 'OVERRIDDEN', overrideReason.trim());
                            setOverrideFor(null);
                            setOverrideReason('');
                          }}
                        >
                          Record override
                        </button>
                        <button className="btn-secondary text-sm" onClick={() => setOverrideFor(null)}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="card p-4">
        <h3 className="font-semibold mb-2">Dose calculations — RULE-BASED</h3>
        <p className="text-xs text-muted mb-3">Computed by the deterministic engine from the cited guideline data files. Human confirmation required before any administration.</p>
        {s.doses.length === 0 && <div className="text-sm text-muted">No medication doses applicable in the current resource/contraindication context.</div>}
        <div className="grid gap-2 sm:grid-cols-2">
          {s.doses.map((d) => (
            <div key={d.calculationId} className="rounded-xl border border-stone-200 bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="font-bold">{d.drugName}</div>
                <CitationChip citation={d.citation} />
              </div>
              <div className="mt-1 text-2xl font-extrabold text-terracotta-dark">
                {d.result.dose} {d.result.doseUnit} <span className="text-base font-semibold text-ink">{d.result.route}</span>
              </div>
              <div className="text-xs text-muted mt-1">{d.formula}</div>
              {d.result.administrationNote && <div className="text-xs mt-1">{d.result.administrationNote}</div>}
              {d.result.maxCumulativeDose && (
                <div className="text-xs mt-1">Max: {d.result.maxCumulativeDose.dose} {d.result.maxCumulativeDose.doseUnit}</div>
              )}
              {d.warnings.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {d.warnings.map((w, i) => (
                    <li key={i} className="rounded-lg bg-amber-soft px-2 py-1 text-xs text-amber-dark">⚠ {w}</li>
                  ))}
                </ul>
              )}
              <div className="mt-2 flex items-center gap-2">
                <ProvenanceBadge provenance={d.provenance} />
                <span className="text-xs text-muted">{d.indication}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {s.fluids && (
        <div className="card p-4">
          <h3 className="font-semibold mb-2">Fluid guidance — RULE-BASED</h3>
          <div className="text-lg font-bold text-terracotta-dark">Crystalloid bolus ~{s.fluids.crystalloid.suggestedBolusMl} mL</div>
          <div className="text-sm text-muted mt-1">{s.fluids.crystalloid.note}</div>
          {s.fluids.bloodProductPrompt.indicated && (
            <div className="mt-2 rounded-xl bg-danger-soft border border-danger/40 p-3 text-sm text-danger-dark">
              <strong>Blood-product prompt ({s.fluids.bloodProductPrompt.reasonCodes.join(', ')}):</strong> {s.fluids.bloodProductPrompt.note}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <button className="btn-secondary flex-1" onClick={() => session.setScreen('risk')}>← Risk</button>
        <button className="btn-primary flex-1" onClick={() => session.setScreen('escalation')}>Escalation →</button>
      </div>
    </div>
  );
}
