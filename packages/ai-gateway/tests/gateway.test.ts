/**
 * AI gateway contract tests: offline fallback satisfies every method with
 * zero network; GeminiGateway post-validation (preservedFacts) auto-falls
 * back on corruption and emits AI_FALLBACK_USED; adapter selection audited.
 */
import { describe, expect, it } from 'vitest';
import {
  assessIntake,
  computeDoses,
  evaluateEscalation,
  generateReferralNote,
  initPathway,
  mapCaseInputToIntake,
  reassess,
} from '@mamasafe/clinical-core';
import {
  createAIGateway,
  extractPreservedFacts,
  GeminiGateway,
  OfflineFallbackGateway,
  verifyPreservedFacts,
} from '@mamasafe/ai-gateway';

import case01 from '../../../data/pph-case-01.json';

const ACTOR = { id: 'gw-tester', role: 'SIMULATION_USER' as const };
const NOW = '2026-08-11T14:00:00.000Z';

function buildEngineObjects() {
  const payload = mapCaseInputToIntake('pph-case-01', case01.input as never, NOW, ACTOR);
  const assessment = assessIntake(payload);
  const state = reassess(initPathway(assessment, 'PPH'), payload).state;
  const doses = computeDoses(payload, 'PPH');
  const escalation = evaluateEscalation(payload, assessment, state);
  const note = generateReferralNote(payload, state, escalation);
  return { payload, assessment, state, doses, escalation, note };
}

describe('OfflineFallbackGateway (mandatory zero-network adapter)', () => {
  const gw = new OfflineFallbackGateway();
  const engine = buildEngineObjects();

  it('structureIntake returns empty proposal with full unmapped narrative', async () => {
    const r = await gw.structureIntake({ narrative: 'Mama dey bleed steady, BP 88/52', locale: 'en' });
    expect(r.proposal.proposedPayload).toEqual({});
    expect(r.proposal.unmappedNarrative).toEqual(['Mama dey bleed steady, BP 88/52']);
    expect(r.provenance.generatedBy).toBe('OFFLINE_TEMPLATE');
  });

  it('explainStep renders template with every preserved fact verbatim', async () => {
    const dose = engine.doses.find((d) => d.drugName === 'tranexamic acid')!;
    const r = await gw.explainStep({
      subject: { kind: 'DOSE', id: dose.calculationId },
      ruleDerivedContent: dose,
      audience: 'CLINICIAN',
      locale: 'en',
    });
    expect(r.preservedFacts.length).toBeGreaterThan(0);
    expect(verifyPreservedFacts(r.explanation, r.preservedFacts)).toBe(true);
    expect(r.explanation).toContain('1 g');
    expect(r.explanation).toContain('tranexamic acid');
    expect(r.provenance.kind).toBe('HYBRID');
  });

  it('draftHandoff SBAR contains rule-derived facts', async () => {
    const r = await gw.draftHandoff({ referralNote: engine.note, format: 'SBAR', locale: 'en' });
    const draft = r.draft as { situation: string; background: string; assessment: string; recommendation: string };
    expect(draft.situation).toContain('1.41');
    expect(draft.situation).toContain('1100');
    expect(draft.recommendation).toContain('IMMEDIATE');
    expect(r.provenance.kind).toBe('HYBRID');
  });

  it('translatePatientFacing returns source text with tokens preserved + review required', async () => {
    const r = await gw.translatePatientFacing({
      text: 'The care team will give tranexamic acid 1 g IV over 10 minutes to help clotting.',
      protectedTokens: [{ placeholder: '{{DRUG_1}}', value: 'tranexamic acid 1 g IV over 10 minutes' }],
      targetLocale: 'ha',
      domain: 'PATIENT_FACING',
    });
    expect(r.tokensPreserved).toBe(true);
    expect(r.reviewRequired).toBe(true);
    expect(r.translatedText).toContain('tranexamic acid 1 g IV over 10 minutes');
  });

  it('narrateSimulationStep is deterministic and fact-bound', async () => {
    const req = {
      scenarioId: 'sim.pph.29yo.canonical',
      engineState: { assessment: engine.assessment, state: engine.state },
      actionsSinceLastStep: ['pph.uterine_massage'],
      audience: 'DEMO' as const,
      locale: 'en' as const,
    };
    const a = await gw.narrateSimulationStep(req);
    const b = await gw.narrateSimulationStep(req);
    expect(a.narration).toBe(b.narration);
    expect(a.narration).toContain('1.41');
    expect(a.patientStateChanges.some((c) => c.metric === 'shock_index')).toBe(true);
  });
});

describe('createAIGateway adapter selection', () => {
  it('returns OfflineFallbackGateway without connectivity or key', () => {
    expect(createAIGateway({ online: false, apiKey: 'x' })).toBeInstanceOf(OfflineFallbackGateway);
    expect(createAIGateway({ online: true })).toBeInstanceOf(OfflineFallbackGateway);
    expect(createAIGateway({ online: false })).toBeInstanceOf(OfflineFallbackGateway);
  });
  it('returns GeminiGateway only with online + key, and audits the selection', () => {
    const events: string[] = [];
    const gw = createAIGateway({
      online: true,
      apiKey: 'test-key',
      transport: async () => 'ok',
      onAuditEvent: (e) => events.push(e.type),
    });
    expect(gw).toBeInstanceOf(GeminiGateway);
    expect(events).toContain('AI_CALL_MADE');
  });
});

describe('GeminiGateway post-validation (injected transport, no network)', () => {
  const engine = buildEngineObjects();
  const dose = engine.doses.find((d) => d.drugName === 'oxytocin')!;
  const explainReq = {
    subject: { kind: 'DOSE' as const, id: dose.calculationId },
    ruleDerivedContent: dose,
    audience: 'CLINICIAN' as const,
    locale: 'en' as const,
  };

  it('accepts output that preserves every fact verbatim', async () => {
    const facts = extractPreservedFacts(dose);
    const events: string[] = [];
    const gw = new GeminiGateway({
      apiKey: 'test-key',
      transport: async () => `Explanation: give ${facts[0]} as ${facts[1]} per guideline.`,
      onAuditEvent: (e) => events.push(e.type),
    });
    const r = await gw.explainStep(explainReq);
    expect(r.provenance.generatedBy).toBe('GEMINI');
    expect(verifyPreservedFacts(r.explanation, r.preservedFacts)).toBe(true);
    expect(events).toContain('AI_CALL_MADE');
    expect(events).not.toContain('AI_FALLBACK_USED');
  });

  it('corrupted/missing fact → auto-fallback to template + AI_FALLBACK_USED', async () => {
    const events: { type: string; detail: string }[] = [];
    const gw = new GeminiGateway({
      apiKey: 'test-key',
      // model corrupts the dose: "40 IU" instead of "10 IU"
      transport: async () => 'Give oxytocin 40 IU as a rapid IV push immediately.',
      onAuditEvent: (e) => events.push({ type: e.type, detail: e.detail }),
    });
    const r = await gw.explainStep(explainReq);
    expect(events.some((e) => e.type === 'AI_FALLBACK_USED')).toBe(true);
    expect(r.provenance.generatedBy).toBe('OFFLINE_TEMPLATE');
    expect(verifyPreservedFacts(r.explanation, r.preservedFacts)).toBe(true);
    expect(r.explanation).not.toContain('40 IU');
    expect(r.explanation).toContain('10 IU');
  });

  it('transport error → fail-safe offline template, never a throw', async () => {
    const events: string[] = [];
    const gw = new GeminiGateway({
      apiKey: 'test-key',
      transport: async () => {
        throw new Error('network unreachable');
      },
      onAuditEvent: (e) => events.push(e.type),
    });
    const r = await gw.explainStep(explainReq);
    expect(events).toContain('AI_FALLBACK_USED');
    expect(verifyPreservedFacts(r.explanation, r.preservedFacts)).toBe(true);
  });

  it('translation with corrupted protected token → source text + tokensPreserved=false', async () => {
    const events: string[] = [];
    const gw = new GeminiGateway({
      apiKey: 'test-key',
      transport: async () => 'Za a bayar da magani nan take.', // token dropped
      onAuditEvent: (e) => events.push(e.type),
    });
    const r = await gw.translatePatientFacing({
      text: 'You will receive tranexamic acid 1 g IV over 10 minutes.',
      protectedTokens: [{ placeholder: '{{DRUG_1}}', value: 'tranexamic acid 1 g IV over 10 minutes' }],
      targetLocale: 'ha',
      domain: 'PATIENT_FACING',
    });
    expect(r.tokensPreserved).toBe(false);
    expect(r.translatedText).toContain('tranexamic acid 1 g IV over 10 minutes'); // source shown instead
    expect(events).toContain('AI_FALLBACK_USED');
  });
});
