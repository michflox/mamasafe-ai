/**
 * CaseSession — the web app's integration layer.
 * One user gesture → engine state transition + audit event (API_CONTRACTS.md §4.5).
 * The UI NEVER constructs clinical values; it renders engine output only.
 */
import {
  actionId,
  assessIntake,
  computeDoses,
  computeFluidGuidance,
  confirmAction,
  evaluateEscalation,
  generateReferralNote,
  generateSbarHandoff,
  initPathway,
  mapCaseInputToIntake,
  reassess,
  RULES_VERSION,
  PATHWAY_VERSION,
  type ActionConfirmation,
  type Actor,
  type DoseCalculation,
  type EscalationDecision,
  type FluidGuidance,
  type IntakePayload,
  type PathwayState,
  type ReferralNote,
  type RiskAssessment,
  type SbarHandoff,
} from '@mamasafe/clinical-core';
import {
  appendAuditEvent,
  createIndexedDbStore,
  verifyAuditChain,
  type AuditEvent,
  type AuditEventType,
  type AuditStore,
} from '@mamasafe/audit';
import { createAIGateway, type AIGateway } from '@mamasafe/ai-gateway';

export type Screen = 'intake' | 'risk' | 'actions' | 'escalation' | 'simulation' | 'audit';

export interface SessionSnapshot {
  screen: Screen;
  caseId: string | null;
  payload: IntakePayload | null;
  assessment: RiskAssessment | null;
  pathway: PathwayState | null;
  doses: DoseCalculation[];
  fluids: FluidGuidance | null;
  escalation: EscalationDecision | null;
  referralNote: ReferralNote | null;
  sbar: SbarHandoff | null;
  audit: AuditEvent[];
  auditValid: boolean | null;
  gatewayKind: 'GEMINI' | 'OFFLINE_TEMPLATE';
  aiExplanations: Record<string, { text: string; generatedBy: string }>;
  patientExplanation: { text: string; generatedBy: string } | null;
  patientFacing: boolean;
  simRunning: boolean;
  simMinute: number;
  txaWindowClosed: boolean;
  injectionFlags: string[];
}

const EMPTY: SessionSnapshot = {
  screen: 'intake',
  caseId: null,
  payload: null,
  assessment: null,
  pathway: null,
  doses: [],
  fluids: null,
  escalation: null,
  referralNote: null,
  sbar: null,
  audit: [],
  auditValid: null,
  gatewayKind: 'OFFLINE_TEMPLATE',
  aiExplanations: {},
  patientExplanation: null,
  patientFacing: false,
  simRunning: false,
  simMinute: 0,
  txaWindowClosed: false,
  injectionFlags: [],
};

export const DEMO_ACTOR: Actor = { id: 'demo-midwife-01', role: 'SIMULATION_USER' };

export class CaseSession {
  private snap: SessionSnapshot = EMPTY;
  private readonly store: AuditStore | null;
  private readonly gateway: AIGateway;
  private readonly listeners = new Set<(s: SessionSnapshot) => void>();
  private simTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.store = typeof indexedDB !== 'undefined' ? createIndexedDbStore() : null;
    const apiKey = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined) ?? undefined;
    this.gateway = createAIGateway({
      online: typeof navigator !== 'undefined' ? navigator.onLine : false,
      apiKey,
      onAuditEvent: (e) => {
        if (e.type === 'AI_FALLBACK_USED') this.record('AI_FALLBACK_USED', { detail: e.detail }, e.modelVersion);
      },
    });
    this.snap = {
      ...EMPTY,
      gatewayKind: apiKey && typeof navigator !== 'undefined' && navigator.onLine ? 'GEMINI' : 'OFFLINE_TEMPLATE',
    };
    void this.restoreAudit();
  }

  subscribe(fn: (s: SessionSnapshot) => void): () => void {
    this.listeners.add(fn);
    fn(this.snap);
    return () => this.listeners.delete(fn);
  }

  private emit(patch: Partial<SessionSnapshot>) {
    this.snap = { ...this.snap, ...patch };
    for (const fn of this.listeners) fn(this.snap);
  }

  get snapshot(): SessionSnapshot {
    return this.snap;
  }

  private async restoreAudit() {
    if (!this.store) return;
    const loaded = await this.store.load();
    if (loaded.length > 0) this.emit({ audit: [...loaded] });
  }

  /** Append audit event on the same gesture as the action it records. */
  private record(type: AuditEventType, payloadSummary: Record<string, unknown>, modelVersion?: string): AuditEvent {
    const event = appendAuditEvent(this.snap.audit, {
      caseId: this.snap.caseId ?? 'no-case',
      type,
      at: new Date().toISOString(),
      actor: DEMO_ACTOR,
      payloadSummary,
      rulesVersion: RULES_VERSION,
      pathwayVersion: PATHWAY_VERSION,
      modelVersion,
    });
    const audit = [...this.snap.audit, event];
    this.emit({ audit });
    void this.store?.append(event);
    return event;
  }

  verifyAudit(): boolean {
    const valid = verifyAuditChain(this.snap.audit).valid;
    this.emit({ auditValid: valid });
    return valid;
  }

  setScreen(screen: Screen) {
    this.emit({ screen });
  }

  /** Submit intake (structured form or one-tap synthetic case). */
  submitIntake(payload: IntakePayload) {
    const assessment = assessIntake(payload);
    let pathway = initPathway(assessment, 'PPH');
    const r = reassess(pathway, payload);
    pathway = r.state;
    const doses = computeDoses(payload, 'PPH');
    const fluids = computeFluidGuidance(payload, assessment);
    const escalation = evaluateEscalation(payload, assessment, pathway);

    this.emit({
      caseId: payload.caseId,
      payload,
      assessment,
      pathway,
      doses,
      fluids,
      escalation,
      referralNote: null,
      sbar: null,
      patientExplanation: null,
      injectionFlags: assessment.redFlags.filter((f) => f.code === 'INJECTION_PATTERN_DETECTED').map((f) => f.clinicianMessage),
    });
    this.record('INTAKE_SUBMITTED', {
      symptoms: payload.symptoms,
      ebl: payload.estimatedBloodLossMl ?? null,
      narrativePresent: !!payload.narrative,
    });
    this.record('RISK_ASSESSED', { tier: assessment.tier, shockIndex: assessment.derived.shockIndex ?? null, redFlags: assessment.redFlags.map((f) => f.code) });
    this.record('PATHWAY_STARTED', { pathwayId: 'PPH', phase: pathway.phase });
    if (escalation.escalate) {
      this.record('ESCALATION_TRIGGERED', { urgency: escalation.urgency, reasonCodes: escalation.reasonCodes });
    }
    this.emit({ screen: 'risk' });
  }

  /** Tap-to-confirm (or defer / override with reason) a pathway action. */
  confirm(action: string, decision: ActionConfirmation['decision'], overrideReason?: string) {
    if (!this.snap.pathway || !this.snap.payload) return;
    const confirmation: ActionConfirmation = {
      confirmedBy: DEMO_ACTOR,
      confirmedAt: new Date().toISOString(),
      decision,
      overrideReason,
    };
    const pathway = confirmAction(this.snap.pathway, action, confirmation);
    this.emit({ pathway });
    this.record(decision === 'OVERRIDDEN' ? 'ACTION_OVERRIDDEN' : 'ACTION_CONFIRMED', {
      actionId: action,
      decision,
      overrideReason: overrideReason ?? null,
    });
    const item = pathway.actions.find((a) => a.actionId === action);
    if (decision === 'CONFIRMED' && item && /uterotonic|tranexamic|second_line/.test(action)) {
      this.record('DOSE_CONFIRMED', { actionId: action, title: item.title });
    }
    // Re-evaluate escalation after each consequential confirmation.
    const escalation = evaluateEscalation(this.snap.payload, this.snap.assessment!, pathway);
    this.emit({ escalation });
  }

  /** Generate referral note + SBAR (rule-derived; offline template formatting). */
  generateDocuments() {
    if (!this.snap.payload || !this.snap.pathway || !this.snap.escalation) return;
    const referralNote = generateReferralNote(this.snap.payload, this.snap.pathway, this.snap.escalation);
    this.record('REFERRAL_NOTE_GENERATED', { urgency: referralNote.escalation.urgency });
    this.emit({ referralNote });
    void this.gateway
      .draftHandoff({ referralNote, format: 'SBAR', locale: 'en' })
      .then((r) => {
        this.emit({ sbar: r.draft as SbarHandoff });
        this.record('HANDOFF_GENERATED', { format: 'SBAR', generatedBy: r.provenance.generatedBy ?? 'OFFLINE_TEMPLATE' });
      })
      .catch(() => {
        this.emit({ sbar: generateSbarHandoff(referralNote) });
      });
  }

  /** AI/plain-language explanation of a rule-derived object (labeled AI-generated — verify). */
  async explainAction(a: { actionId: string }) {
    if (!this.snap.pathway) return;
    const item = this.snap.pathway.actions.find((x) => x.actionId === a.actionId);
    if (!item) return;
    const r = await this.gateway.explainStep({
      subject: { kind: 'ACTION_ITEM', id: item.actionId },
      ruleDerivedContent: item,
      audience: 'CLINICIAN',
      locale: 'en',
    });
    this.emit({
      aiExplanations: {
        ...this.snap.aiExplanations,
        [item.actionId]: { text: r.explanation, generatedBy: r.provenance.generatedBy ?? 'OFFLINE_TEMPLATE' },
      },
    });
  }

  /** Patient/facing plain-language explanation (protected tokens never translated). */
  async buildPatientExplanation() {
    if (!this.snap.assessment || !this.snap.payload) return;
    const si = this.snap.assessment.derived.shockIndex;
    const text =
      'Mama is bleeding more than normal after the birth. The care team is working to stop the bleeding: ' +
      'they are rubbing the top of the womb to help it squeeze, giving medicines that help the womb contract ' +
      '(oxytocin 10 IU), a medicine that helps the blood clot (tranexamic acid 1 g IV over 10 minutes), ' +
      'and fluids through a drip. ' +
      (this.snap.escalation?.escalate
        ? 'Because the bleeding is heavy, the team is arranging to move her quickly to a bigger hospital that has blood and surgery. '
        : 'The team is watching her closely. ') +
      'Drug names and doses are kept in English exactly as prescribed for safety. ' +
      (typeof si === 'number' ? `(Clinical measure — shock index: ${si.toFixed(2)}.)` : '');
    const r = await this.gateway.translatePatientFacing({
      text,
      protectedTokens: [
        { placeholder: '{{DRUG_1}}', value: 'oxytocin 10 IU' },
        { placeholder: '{{DRUG_2}}', value: 'tranexamic acid 1 g IV over 10 minutes' },
      ],
      targetLocale: 'en',
      domain: 'PATIENT_FACING',
    });
    this.emit({
      patientExplanation: { text: r.translatedText, generatedBy: r.provenance.generatedBy ?? 'OFFLINE_TEMPLATE' },
    });
  }

  /* ---------------- Simulation mode ---------------- */

  startSimulation() {
    if (!this.snap.payload || !this.snap.pathway) return;
    this.record('SIMULATION_STARTED', { scenarioId: 'sim.pph.29yo.canonical' });
    this.emit({ simRunning: true, simMinute: 0, screen: 'simulation' });
    this.simTimer = setInterval(() => this.simTick(), 3000);
  }

  stopSimulation() {
    if (this.simTimer) clearInterval(this.simTimer);
    this.simTimer = null;
    this.emit({ simRunning: false });
  }

  /** Scripted patient evolution: vitals respond to confirmed actions; delay worsens shock. */
  private simTick() {
    const s = this.snap;
    if (!s.payload || !s.pathway || !s.simRunning) return;
    const v = s.payload.vitals;
    if (typeof v.heartRateBpm !== 'number' || typeof v.systolicBpMmHg !== 'number') return;
    const simMinute = s.simMinute + 5; // 1 tick (3 s) = 5 simulated minutes

    const confirmed = new Set(s.pathway.completedActionIds);
    const massage = confirmed.has(actionId('uterine_massage'));
    const oxytocin = confirmed.has(actionId('uterotonic_first_line'));
    const txa = confirmed.has(actionId('tranexamic_acid'));
    const fluids = confirmed.has(actionId('iv_access_and_fluids'));
    const bundleDone = massage && oxytocin && txa && fluids;

    let eblRate = 60; // mL per 5 min untreated
    if (massage) eblRate *= 0.55;
    if (oxytocin) eblRate *= 0.4;
    if (txa) eblRate *= 0.65;
    let hr = v.heartRateBpm;
    let sbp = v.systolicBpMmHg;
    let dbp = v.diastolicBpMmHg ?? sbp - 35;
    let tone = s.payload.uterineTone;
    if (bundleDone) {
      hr = Math.max(92, hr - 4);
      sbp = Math.min(108, sbp + 3);
      dbp = Math.min(68, dbp + 2);
      eblRate = 8;
      tone = 'FIRM';
    } else {
      hr += 1.5;
      sbp -= 1.2;
      dbp -= 0.8;
      if (fluids) {
        hr -= 3;
        sbp += 2.5;
      }
      if (oxytocin || massage) tone = 'BOGGY'; // improving but not firm until bundle completes
    }
    const ebl = (s.payload.estimatedBloodLossMl ?? 0) + Math.round(eblRate);

    const minutesSinceBirth = (s.payload.clinicalContext?.minutesSinceBirth ?? 0) + 5;
    const payload: IntakePayload = {
      ...s.payload,
      vitals: { ...v, heartRateBpm: Math.round(hr), systolicBpMmHg: Math.round(sbp), diastolicBpMmHg: Math.round(dbp) },
      estimatedBloodLossMl: ebl,
      uterineTone: tone,
      recordedAt: new Date().toISOString(),
      clinicalContext: { ...s.payload.clinicalContext, minutesSinceBirth },
    };
    const assessment = assessIntake(payload);
    const r = reassess(s.pathway, payload);
    const escalation = evaluateEscalation(payload, assessment, r.state);
    const txaWindowClosed = minutesSinceBirth > 180;

    this.emit({
      payload,
      assessment,
      pathway: r.state,
      escalation,
      simMinute,
      txaWindowClosed,
      doses: computeDoses(payload, 'PPH'),
      fluids: computeFluidGuidance(payload, assessment),
    });
    this.record('SIMULATION_STATE_CHANGED', {
      simMinute,
      hr: Math.round(hr),
      sbp: Math.round(sbp),
      ebl,
      shockIndex: assessment.derived.shockIndex ?? null,
      txaWindowClosed,
    });
  }
}
