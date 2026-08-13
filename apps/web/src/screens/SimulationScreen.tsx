import type { CaseSession } from '../engine/session';
import { EmptyState } from './RiskScreen';
import { TierBadge } from '../components/ui';

export function SimulationScreen({ session }: { session: CaseSession }) {
  const s = session.snapshot;
  if (!s.payload) return <EmptyState text="Load the synthetic case first, then run it as a timed scenario." />;

  const v = s.payload.vitals;
  const si = s.assessment?.derived.shockIndex;
  const msb = s.payload.clinicalContext?.minutesSinceBirth;
  const txaRemaining = typeof msb === 'number' ? Math.max(0, 180 - msb) : null;

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h2 className="text-xl font-bold">Simulation mode — 29-year-old PPH scenario</h2>
        <p className="text-sm text-muted mt-1">
          Patient state evolves with your confirmed actions: uterine massage + oxytocin improve tone and slow bleeding; delay worsens the shock index. Confirm actions on the Actions screen and watch physiology respond.
        </p>
        <div className="flex gap-2 mt-3">
          {!s.simRunning ? (
            <button className="btn-primary flex-1" onClick={() => session.startSimulation()}>▶ Start timed scenario</button>
          ) : (
            <button className="btn-danger-outline flex-1" onClick={() => session.stopSimulation()}>⏸ Pause scenario</button>
          )}
          <button className="btn-secondary flex-1" onClick={() => session.setScreen('actions')}>Go to actions</button>
        </div>
      </div>

      {txaRemaining !== null && (
        <div className={`card p-4 text-center ${txaRemaining <= 30 ? 'border-danger/50 bg-danger-soft' : 'border-amber/40 bg-amber-soft'}`}>
          <div className="text-xs font-bold text-muted">TXA 3-HOUR WINDOW (from time of birth — gate G2)</div>
          <div className={`text-4xl font-extrabold mt-1 ${txaRemaining <= 30 ? 'text-danger' : 'text-amber-dark'}`}>
            {s.txaWindowClosed ? 'CLOSED' : `${Math.floor(txaRemaining / 60)}:${String(txaRemaining % 60).padStart(2, '0')} h left`}
          </div>
          <div className="text-xs text-muted mt-1">~{msb} min since birth · benefit declines with delay</div>
        </div>
      )}

      <div className="card p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Live patient state (synthetic)</h3>
          <span className="text-xs text-muted">sim time +{s.simMinute} min</span>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-2 text-center">
          <Vital label="HR" value={v.heartRateBpm} unit="bpm" warn={(v.heartRateBpm ?? 0) > 120} />
          <Vital label="SBP" value={v.systolicBpMmHg} unit="mmHg" warn={(v.systolicBpMmHg ?? 999) < 90} />
          <Vital label="DBP" value={v.diastolicBpMmHg} unit="mmHg" warn={false} />
          <Vital label="SpO₂" value={v.spo2Percent} unit="%" warn={(v.spo2Percent ?? 100) < 92} />
          <Vital label="EBL" value={s.payload.estimatedBloodLossMl} unit="mL" warn={(s.payload.estimatedBloodLossMl ?? 0) >= 1000} />
          <Vital label="Tone" value={s.payload.uterineTone ?? '?'} unit="" warn={s.payload.uterineTone === 'BOGGY'} />
        </div>
        <div className="mt-3 flex items-center justify-center gap-2">
          {si !== undefined && (
            <span className={`rounded-full px-3 py-1 text-sm font-bold ${si >= 1.3 ? 'bg-danger text-white' : si >= 0.9 ? 'bg-amber text-white' : 'bg-teal text-white'}`}>
              SI {si.toFixed(2)}
            </span>
          )}
          {s.assessment && <TierBadge tier={s.assessment.tier} />}
        </div>
        {s.escalation?.escalate && (
          <div className="mt-3 rounded-xl bg-danger-soft border border-danger/40 p-3 text-sm text-danger-dark text-center font-semibold">
            {s.escalation.urgency} transfer recommended — {s.escalation.reasonCodes.join(', ')}
          </div>
        )}
      </div>

      <div className="card p-4 text-sm text-muted">
        <strong className="text-ink">How the scenario responds:</strong> each tick = 5 simulated minutes.
        Untreated bleeding adds ~60 mL EBL and worsens HR/BP. Uterine massage roughly halves the bleeding rate;
        oxytocin and TXA slow it further; fluids support BP/HR. Completing the full bundle (massage + oxytocin + TXA + fluids)
        firms the uterus and stabilizes vitals. All physiology is scripted and synthetic.
      </div>
    </div>
  );
}

function Vital({ label, value, unit, warn }: { label: string; value: number | string | undefined; unit: string; warn: boolean }) {
  return (
    <div className={`rounded-xl p-3 ${warn ? 'bg-danger-soft' : 'bg-stone-100'}`}>
      <div className="text-xs text-muted">{label}</div>
      <div className={`text-xl font-bold ${warn ? 'text-danger' : ''}`}>
        {value ?? '—'} <span className="text-xs font-normal">{unit}</span>
      </div>
    </div>
  );
}
