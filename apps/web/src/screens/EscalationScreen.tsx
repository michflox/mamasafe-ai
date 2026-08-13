import { useState } from 'react';
import type { CaseSession } from '../engine/session';
import { ProvenanceBadge } from '../components/ui';
import { EmptyState } from './RiskScreen';
import { PROTECTED_TOKEN_NOTE } from '../i18n';

export function EscalationScreen({ session }: { session: CaseSession }) {
  const s = session.snapshot;
  const [speaking, setSpeaking] = useState(false);
  if (!s.escalation) return <EmptyState text="Submit an intake first." />;
  const e = s.escalation;

  const readBack = () => {
    if (!s.sbar || typeof speechSynthesis === 'undefined') return;
    if (speaking) {
      speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const text = `S B A R handoff. Situation: ${s.sbar.situation}. Background: ${s.sbar.background}. Assessment: ${s.sbar.assessment}. Recommendation: ${s.sbar.recommendation}`;
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.95;
    utter.onend = () => setSpeaking(false);
    speechSynthesis.speak(utter);
    setSpeaking(true);
  };

  return (
    <div className="space-y-4">
      <div className={`card p-4 ${e.escalate ? 'border-danger/50 bg-danger-soft' : 'border-teal/40 bg-teal-soft'}`}>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Escalation decision</h2>
          <ProvenanceBadge provenance={e.provenance} />
        </div>
        <div className={`mt-2 text-2xl font-extrabold ${e.escalate ? 'text-danger-dark' : 'text-teal'}`}>
          {e.escalate ? `${e.urgency} TRANSFER RECOMMENDED` : 'No transfer indicated now'}
        </div>
        {e.reasonCodes.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {e.reasonCodes.map((r) => (
              <span key={r} className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-semibold">{r}</span>
            ))}
          </div>
        )}
        {e.escalate && (
          <>
            <h4 className="font-semibold mt-3 text-sm">While awaiting transfer</h4>
            <ul className="list-disc pl-5 text-sm space-y-1">
              {e.actionsWhileAwaitingTransfer.map((x, i) => <li key={i}>{x}</li>)}
            </ul>
            <h4 className="font-semibold mt-3 text-sm">Receiving facility requirements</h4>
            <div className="flex flex-wrap gap-1">
              {e.receivingFacilityRequirements.map((r) => (
                <span key={r} className="rounded-full bg-white/70 px-2 py-0.5 text-xs">{r}</span>
              ))}
            </div>
          </>
        )}
        <p className="text-xs mt-3 text-muted">Recommendation for clinician confirmation — never a command. Fail-safe: ambiguity always escalates.</p>
      </div>

      <div className="card p-4">
        <button className="btn-primary w-full" onClick={() => session.generateDocuments()}>
          Generate referral note + SBAR handoff
        </button>
      </div>

      {s.referralNote && (
        <div className="card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Referral note</h3>
            <ProvenanceBadge provenance={s.referralNote.provenance} />
          </div>
          <div className="text-sm"><strong>Patient:</strong> {s.referralNote.patientSummary}</div>
          <div className="text-sm"><strong>Vitals:</strong> {s.referralNote.vitalsTrendSummary}</div>
          <div className="text-sm"><strong>Status:</strong> {s.referralNote.currentStatus}</div>
          {s.referralNote.needsAtReceivingFacility.length > 0 && (
            <div className="text-sm">
              <strong>Needs at receiving facility:</strong>
              <ul className="list-disc pl-5">
                {s.referralNote.needsAtReceivingFacility.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            </div>
          )}
          {s.referralNote.timeline.length > 0 && (
            <div className="text-sm">
              <strong>Timeline:</strong>
              <ul className="list-disc pl-5">
                {s.referralNote.timeline.map((t, i) => (
                  <li key={i}><span className="text-muted">{t.at.slice(11, 19)}</span> — {t.event}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {s.sbar && (
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">SBAR handoff</h3>
            <ProvenanceBadge provenance={s.sbar.provenance} />
          </div>
          {(['situation', 'background', 'assessment', 'recommendation'] as const).map((k) => (
            <div key={k}>
              <div className="text-xs font-bold uppercase text-terracotta-dark">{k}</div>
              <div className="text-sm">{s.sbar![k]}</div>
            </div>
          ))}
          <button className="btn-teal w-full" onClick={readBack}>
            {speaking ? '⏹ Stop read-back' : '🔊 Voice read-back (Web Speech API)'}
          </button>
        </div>
      )}

      <div className="card p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Patient / family explanation</h3>
          <button
            className="btn-secondary text-sm"
            onClick={() => {
              void session.buildPatientExplanation();
            }}
          >
            {s.patientExplanation ? 'Regenerate' : 'Generate'}
          </button>
        </div>
        {s.patientExplanation ? (
          <div className="rounded-xl border border-amber/40 bg-amber-soft p-3 text-sm">
            <span className="font-semibold text-amber-dark">AI-generated — verify ({s.patientExplanation.generatedBy}). Patient-facing domain.</span>
            <p className="mt-1">{s.patientExplanation.text}</p>
            <p className="mt-2 text-xs text-muted">{PROTECTED_TOKEN_NOTE}</p>
          </div>
        ) : (
          <p className="text-sm text-muted">Plain-language explanation for the patient and family. Clinician vs patient string domains are separated; drug names/doses are protected tokens, never translated.</p>
        )}
      </div>

      <div className="flex gap-2">
        <button className="btn-secondary flex-1" onClick={() => session.setScreen('actions')}>← Actions</button>
        <button className="btn-primary flex-1" onClick={() => session.setScreen('simulation')}>Simulation →</button>
      </div>
    </div>
  );
}
