import type { CaseSession } from '../engine/session';

const TYPE_STYLE: Record<string, string> = {
  INTAKE_SUBMITTED: 'bg-stone-200 text-ink',
  RISK_ASSESSED: 'bg-teal-soft text-teal',
  PATHWAY_STARTED: 'bg-teal-soft text-teal',
  ACTION_CONFIRMED: 'bg-teal text-white',
  ACTION_OVERRIDDEN: 'bg-terracotta text-white',
  DOSE_CONFIRMED: 'bg-teal text-white',
  ESCALATION_TRIGGERED: 'bg-danger text-white',
  REFERRAL_NOTE_GENERATED: 'bg-stone-200 text-ink',
  HANDOFF_GENERATED: 'bg-stone-200 text-ink',
  AI_CALL_MADE: 'bg-amber-soft text-amber-dark',
  AI_FALLBACK_USED: 'bg-amber text-white',
  SIMULATION_STARTED: 'bg-stone-200 text-ink',
  SIMULATION_STATE_CHANGED: 'bg-stone-100 text-muted',
  SYNC_COMPLETED: 'bg-stone-200 text-ink',
};

export function AuditScreen({ session }: { session: CaseSession }) {
  const s = session.snapshot;
  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold">Audit trail</h2>
            <p className="text-sm text-muted">Tamper-evident, hash-chained (SHA-256), append-only. Persisted on-device (IndexedDB).</p>
          </div>
          <button className="btn-teal" onClick={() => session.verifyAudit()}>Verify chain</button>
        </div>
        {s.auditValid !== null && (
          <div className={`mt-2 rounded-xl p-3 text-sm font-bold text-center ${s.auditValid ? 'bg-teal-soft text-teal' : 'bg-danger-soft text-danger'}`}>
            {s.auditValid ? '✓ Chain valid — no tampering detected' : '✕ CHAIN INVALID — tampering detected'}
          </div>
        )}
      </div>

      <ol className="space-y-2">
        {[...s.audit].reverse().map((e) => (
          <li key={e.eventId} className="card p-3">
            <div className="flex items-center justify-between gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${TYPE_STYLE[e.type] ?? 'bg-stone-200'}`}>{e.type}</span>
              <span className="text-xs text-muted">{e.at.slice(0, 19).replace('T', ' ')}</span>
            </div>
            <div className="mt-1 text-xs text-muted break-all">
              <div>actor: {e.actor.id} ({e.actor.role}) · case: {e.caseId}</div>
              <div>payload: {JSON.stringify(e.payloadSummary)}</div>
              <div className="font-mono">hash: {e.eventHash.slice(0, 16)}… ← prev: {e.previousEventHash.slice(0, 12)}…</div>
              <div>rules: {e.rulesVersion} · pathway: {e.pathwayVersion}{e.modelVersion ? ` · model: ${e.modelVersion}` : ''}</div>
            </div>
          </li>
        ))}
      </ol>
      {s.audit.length === 0 && <div className="card p-6 text-center text-muted">No events yet — submit an intake to start the chain.</div>}
    </div>
  );
}
