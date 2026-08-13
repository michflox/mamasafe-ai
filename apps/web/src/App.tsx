import { useEffect, useMemo, useState } from 'react';
import { CaseSession, type Screen, type SessionSnapshot } from './engine/session';
import { SimulationBanner } from './components/ui';
import { IntakeScreen } from './screens/IntakeScreen';
import { RiskScreen } from './screens/RiskScreen';
import { ActionsScreen } from './screens/ActionsScreen';
import { EscalationScreen } from './screens/EscalationScreen';
import { SimulationScreen } from './screens/SimulationScreen';
import { AuditScreen } from './screens/AuditScreen';

const NAV: { id: Screen; label: string; icon: string }[] = [
  { id: 'intake', label: 'Intake', icon: '📋' },
  { id: 'risk', label: 'Risk', icon: '⚠️' },
  { id: 'actions', label: 'Actions', icon: '✅' },
  { id: 'escalation', label: 'Escalation', icon: '🚑' },
  { id: 'simulation', label: 'Simulation', icon: '⏱️' },
  { id: 'audit', label: 'Audit', icon: '🔗' },
];

export default function App() {
  const session = useMemo(() => new CaseSession(), []);
  const [snap, setSnap] = useState<SessionSnapshot>(session.snapshot);
  useEffect(() => session.subscribe(setSnap), [session]);

  return (
    <div className="min-h-dvh bg-canvas flex flex-col">
      <SimulationBanner />
      <header className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            MamaSafe <span className="text-terracotta">AI</span>
          </h1>
          <p className="text-xs text-muted">PPH Emergency Copilot · offline-first · {snap.gatewayKind === 'GEMINI' ? 'Gemini language layer' : 'offline template language layer'}</p>
        </div>
        <div className="text-right text-xs text-muted">
          <div>rules clinical-rules@1.0.0</div>
          <div>pph-pathway.v1@1.0.0 · draft pending clinical review</div>
        </div>
      </header>

      {snap.injectionFlags.length > 0 && (
        <div className="mx-4 mb-2 rounded-xl border border-amber/50 bg-amber-soft p-3 text-xs text-amber-dark">
          <strong>Injection-safety flag:</strong> {snap.injectionFlags.join(' ')}
        </div>
      )}

      <main className="flex-1 px-4 pb-28 max-w-3xl w-full mx-auto">
        {snap.screen === 'intake' && <IntakeScreen session={session} />}
        {snap.screen === 'risk' && <RiskScreen session={session} />}
        {snap.screen === 'actions' && <ActionsScreen session={session} />}
        {snap.screen === 'escalation' && <EscalationScreen session={session} />}
        {snap.screen === 'simulation' && <SimulationScreen session={session} />}
        {snap.screen === 'audit' && <AuditScreen session={session} />}
      </main>

      <nav className="fixed bottom-0 inset-x-0 bg-panel border-t border-stone-200">
        <div className="max-w-3xl mx-auto grid grid-cols-6">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => session.setScreen(n.id)}
              className={`flex flex-col items-center gap-0.5 py-2 touch-target text-xs ${
                snap.screen === n.id ? 'text-terracotta font-bold' : 'text-muted'
              }`}
            >
              <span className="text-lg">{n.icon}</span>
              {n.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
