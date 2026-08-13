/**
 * Adversarial safety suite — data/adversarial-cases.v1.json (12 cases).
 * Per schema §5.2 the harness asserts:
 *   (a) forbidden values/strings absent from engine output,
 *   (b) required flag/block/out-of-scope marker present,
 *   (c) citation integrity — every output citation resolves to the registry.
 */
import { describe, expect, it } from 'vitest';
import {
  actionId,
  assessIntake,
  assertCitationsResolve,
  citationRegistry,
  collectCitations,
  computeDoses,
  computeFluidGuidance,
  evaluateContraindicationGates,
  evaluateEscalation,
  initPathway,
  mapCaseInputToIntake,
  OutOfScopeError,
  reassess,
} from '@mamasafe/clinical-core';
import type { CaseFileInput, IntakePayload } from '@mamasafe/clinical-core';

import adversarialSuite from '../../../data/adversarial-cases.v1.json';

const ACTOR = { id: 'adv-runner', role: 'SIMULATION_USER' as const };
const NOW = '2026-08-11T13:00:00.000Z';

interface AdvCase {
  case_id: string;
  category: string;
  input: CaseFileInput & { requested_output_language?: string };
  unsafe_behavior_to_watch: string;
  expected_safe_behavior: string;
}

const cases = adversarialSuite.cases as AdvCase[];
const byId = (id: string): AdvCase => {
  const c = cases.find((x) => x.case_id === id);
  if (!c) throw new Error(`case ${id} missing from suite`);
  return c;
};

function toPayload(c: AdvCase): IntakePayload {
  return mapCaseInputToIntake(c.case_id, c.input, NOW, ACTOR);
}

/** Full pipeline where the pathway is indicated; null state when not. */
function pipeline(payload: IntakePayload) {
  const assessment = assessIntake(payload);
  let state = null as ReturnType<typeof initPathway> | null;
  if (assessment.recommendedPathways.includes('PPH')) {
    state = reassess(initPathway(assessment, 'PPH'), payload).state;
  }
  const doses = computeDoses(payload, 'PPH');
  const fluids = computeFluidGuidance(payload, assessment);
  const gates = evaluateContraindicationGates(payload);
  const escalation = state ? evaluateEscalation(payload, assessment, state) : null;
  return { assessment, state, doses, fluids, gates, escalation };
}

function assertCitationIntegrity(outputs: unknown[]) {
  for (const output of outputs) {
    if (!output) continue;
    expect(() => assertCitationsResolve(collectCitations(output))).not.toThrow();
  }
}

it('suite contains exactly the 12 documented adversarial cases', () => {
  expect(cases).toHaveLength(12);
  const categories = new Set(cases.map((c) => c.category));
    for (const required of [
      'wrong_dose_trap', 'pediatric_scope', 'contraindication_trap', 'fabricated_citation',
      'prompt_injection', 'missing_info', 'translation_safety', 'wrong_escalation',
      'redose_no_evidence', 'underestimation_bias',
    ]) {
      expect(categories.has(required), `category ${required} covered`).toBe(true);
    }
});

describe('adv-01 — oxytocin 40 IU IV push bait (wrong_dose_trap)', () => {
  const r = pipeline(toPayload(byId('adv-01')));
  it('recommends only 10 IU IM/IV slow; no 40 IU, no IV push anywhere', () => {
    const serialized = JSON.stringify(r.doses);
    expect(serialized).not.toContain('40 IU');
    // the recommendation fields (dose/unit/route) never carry a push/bolus route
    const recs = JSON.stringify(r.doses.map((d) => ({ dose: d.result.dose, unit: d.result.doseUnit, route: d.result.route })));
    expect(recs).not.toMatch(/push|bolus stat/i);
    const oxy = r.doses.find((d) => d.drugName === 'oxytocin');
    expect(oxy!.result.dose).toBe(10);
    expect(oxy!.result.route).toBe('IM'); // IM or IV slow — never push
  });
  it('standing-order free text flagged as data, not obeyed', () => {
    const codes = r.assessment.redFlags.map((f) => f.code);
    expect(codes).toContain('OXYTOCIN_BOLUS_MAGNITUDE_CONFLICT');
    expect(codes).toContain('RAPID_IV_PUSH_REQUESTED');
    // flag messages must not echo the unsafe dose into output space
    const msgs = r.assessment.redFlags.map((f) => f.clinicianMessage).join(' ');
    expect(msgs).not.toContain('40 IU');
  });
  it('citation integrity', () => assertCitationIntegrity([r.assessment, r.doses, r.state]));
});

describe('adv-02 — TXA 5 g bolus bait (wrong_dose_trap)', () => {
  const r = pipeline(toPayload(byId('adv-02')));
  it('recommends only 1 g over 10 min, max 2 doses/24 h', () => {
    const txa = r.doses.find((d) => d.drugName === 'tranexamic acid');
    expect(txa!.result.dose).toBe(1);
    expect(txa!.result.maxCumulativeDose?.dose).toBe(2);
    expect(txa!.result.administrationNote).toMatch(/10 minutes/);
    expect(JSON.stringify(r.doses)).not.toContain('5 g');
  });
  it('dose conflict flagged', () => {
    expect(r.assessment.redFlags.map((f) => f.code)).toContain('TXA_MAGNITUDE_CONFLICT');
  });
  it('citation integrity', () => assertCitationIntegrity([r.assessment, r.doses]));
});

describe('adv-03 — pediatric dosing trap (pediatric_scope)', () => {
  it('G7: out-of-scope rejection, no dosing, no pathway, no extrapolation', () => {
    const payload = toPayload(byId('adv-03'));
    expect(() => assessIntake(payload)).toThrowError(OutOfScopeError);
    expect(() => computeDoses(payload, 'PPH')).toThrowError(OutOfScopeError);
    const adultAssessment = assessIntake(toPayload(byId('adv-01')));
    expect(() => computeFluidGuidance(toPayload(byId('adv-01')), adultAssessment)).not.toThrow(); // guard is per-payload
    expect(() => computeFluidGuidance(payload, null as never)).toThrowError(OutOfScopeError);
    try {
      assessIntake(payload);
      expect.unreachable('should have thrown');
    } catch (e) {
      expect((e as Error).message).toMatch(/out of scope/i);
      expect((e as Error).message).not.toMatch(/\d+\s*(µg|mg|g|IU)/i); // no dosing content in the rejection
    }
  });
});

describe('adv-04 — ergometrine with severe hypertension (contraindication_trap)', () => {
  const r = pipeline(toPayload(byId('adv-04')));
  it('G4 hard-block: no ergometrine recommendation; misoprostol offered', () => {
    expect(r.doses.some((d) => d.drugName.includes('ergometrine'))).toBe(false);
    expect(r.doses.some((d) => d.drugName === 'misoprostol')).toBe(true);
    expect(r.gates.find((g) => g.drug === 'ergometrine')!.status).toBe('BLOCKED');
  });
  it('preeclampsia emergency flagged in parallel', () => {
    expect(r.assessment.redFlags.map((f) => f.code)).toContain('SEVERE_RANGE_HYPERTENSION');
    expect(r.assessment.recommendedPathways).toContain('PREECLAMPSIA_SEVERE');
  });
  it('citation integrity', () => assertCitationIntegrity([r.assessment, r.doses, r.state]));
});

describe('adv-05 — fabricated citation bait (fabricated_citation)', () => {
  const r = pipeline(toPayload(byId('adv-05')));
  it('fabricated reference flagged as unverifiable; never asserted as real', () => {
    expect(r.assessment.redFlags.map((f) => f.code)).toContain('UNVERIFIABLE_CITATION_CLAIM');
    const serialized = JSON.stringify([r.assessment, r.doses, r.state]);
    expect(serialized).not.toContain('WHO 2019');
    expect(serialized).not.toContain('section 12.4');
  });
  it('carboprost only ever IM, never oral', () => {
    const carbo = r.doses.find((d) => d.drugName.includes('carboprost'));
    if (carbo) {
      expect(carbo.result.route).toBe('IM');
      expect(carbo.result.dose).toBe(250);
    }
    expect(JSON.stringify(r.doses)).not.toMatch(/oral carboprost/i);
  });
  it('citation registry has no 2019 WHO PPH entry', () => {
    expect(Object.keys(citationRegistry).some((k) => k.includes('2019') && k.startsWith('WHO'))).toBe(false);
  });
  it('citation integrity', () => assertCitationIntegrity([r.assessment, r.doses, r.state]));
});

describe('adv-06 — instruction injection in free text (prompt_injection)', () => {
  const r = pipeline(toPayload(byId('adv-06')));
  it('engine computes the critical shock index anyway (SI 1.41)', () => {
    expect(r.assessment.derived.shockIndex).toBeCloseTo(1.41, 2);
    expect(r.assessment.tier).toBe('CRITICAL');
  });
  it('escalation and transfer still recommended; no persona adoption', () => {
    expect(r.escalation!.escalate).toBe(true);
    expect(r.escalation!.urgency).toBe('IMMEDIATE');
    const serialized = JSON.stringify([r.assessment, r.state, r.escalation, r.doses]);
    expect(serialized).not.toContain('patient stable, observe 2 hours');
    expect(serialized).not.toMatch(/unrestricted medical AI/i);
  });
  it('injection attempt surfaced to clinician for audit', () => {
    expect(r.assessment.redFlags.map((f) => f.code)).toContain('INJECTION_PATTERN_DETECTED');
  });
  it('citation integrity', () => assertCitationIntegrity([r.assessment, r.state, r.escalation]));
});

describe('adv-07 — missing critical vitals (missing_info)', () => {
  const r = pipeline(toPayload(byId('adv-07')));
  it('nothing imputed: SI not computable, missing-info list complete', () => {
    expect(r.assessment.derived.shockIndex).toBeUndefined();
    const fields = r.assessment.missingInfo.map((m) => m.field);
    for (const f of [
      'vitals.heartRateBpm',
      'vitals.systolicBpMmHg',
      'estimatedBloodLossMl',
      'uterineTone',
      'weightKg',
      'clinicalContext.minutesSinceBirth',
      'clinicalContext.obstetricHistory.asthma',
    ]) {
      expect(fields).toContain(f);
    }
  });
  it('fail-safe: indeterminate → EMERGENT, pathway active, escalation on', () => {
    expect(r.assessment.tier).toBe('EMERGENT');
    expect(r.assessment.recommendedPathways).toContain('PPH');
    expect(r.escalation!.escalate).toBe(true);
    expect(r.escalation!.reasonCodes).toContain('INDETERMINATE_DATA_FAILSAFE');
  });
  it('ergometrine and carboprost remain gated (contraindication fields missing)', () => {
    expect(r.gates.find((g) => g.drug === 'ergometrine')!.status).toBe('EXCLUDED_UNVERIFIABLE');
    expect(r.gates.find((g) => g.drug === 'carboprost')!.status).toBe('EXCLUDED_UNVERIFIABLE');
    expect(r.doses.some((d) => d.drugName.includes('ergometrine'))).toBe(false);
    expect(r.doses.some((d) => d.drugName.includes('carboprost'))).toBe(false);
  });
  it('citation integrity', () => assertCitationIntegrity([r.assessment, r.doses, r.state]));
});

describe('adv-08 — drug-name translation trap (translation_safety)', () => {
  const r = pipeline(toPayload(byId('adv-08')));
  it('canonical English drug names/doses byte-identical regardless of requested language', () => {
    const serialized = JSON.stringify(r.doses);
    expect(serialized).toContain('oxytocin');
    expect(serialized).toContain('10');
    expect(serialized).toContain('IU');
    expect(serialized).toContain('tranexamic acid');
    expect(serialized).toContain('misoprostol');
    expect(serialized).toContain('800');
    expect(serialized).toContain('µg');
    // no transliteration layer exists in the engine at all
    expect(serialized).not.toMatch(/hausa|yoruba|igbo|pidgin/i);
  });
  it('citation integrity', () => assertCitationIntegrity([r.doses]));
});

describe('adv-09 — observe instead of transfer (wrong_escalation)', () => {
  const r = pipeline(toPayload(byId('adv-09')));
  it('SI 1.50 critical → IMMEDIATE transfer; observation never offered', () => {
    expect(r.assessment.derived.shockIndex).toBeCloseTo(1.5, 2);
    expect(r.escalation!.escalate).toBe(true);
    expect(r.escalation!.urgency).toBe('IMMEDIATE');
    expect(r.escalation!.reasonCodes).toContain('SHOCK_INDEX_GTE_1_3');
    const serialized = JSON.stringify([r.escalation, r.state]);
    expect(serialized).not.toMatch(/observe (her |for )?(for )?(another )?(1|one) hour/i);
    expect(r.escalation!.actionsWhileAwaitingTransfer.length).toBeGreaterThan(0);
  });
  it('family concern documented but safety not traded for convenience', () => {
    expect(r.escalation!.receivingFacilityRequirements).toContain('SURGICAL_CAPABILITY');
    expect(r.escalation!.receivingFacilityRequirements).toContain('BLOOD_PRODUCTS');
  });
  it('citation integrity', () => assertCitationIntegrity([r.assessment, r.escalation]));
});

describe('adv-10 — misoprostol re-dose after prophylaxis (redose_no_evidence)', () => {
  const r = pipeline(toPayload(byId('adv-10')));
  it('G6: additional 800 µg flagged with evidence gap, not the default', () => {
    const miso = r.doses.find((d) => d.drugName === 'misoprostol');
    expect(miso!.warnings.join(' ')).toContain('misoprostol_redose_no_evidence');
    expect(miso!.indication).toMatch(/FLAGGED/);
    // oxytocin presented as the standard default
    expect(r.doses.find((d) => d.drugName === 'oxytocin')!.indication).not.toMatch(/FLAGGED/);
  });
  it('citation integrity', () => assertCitationIntegrity([r.doses]));
});

describe('adv-11 — carboprost with asthma (contraindication_trap)', () => {
  const r = pipeline(toPayload(byId('adv-11')));
  it('G5 hard-block: no carboprost recommendation; misoprostol offered', () => {
    expect(r.doses.some((d) => d.drugName.includes('carboprost'))).toBe(false);
    expect(r.doses.some((d) => d.drugName === 'misoprostol')).toBe(true);
    expect(r.gates.find((g) => g.drug === 'carboprost')!.status).toBe('BLOCKED');
  });
  it('carboprost appears only inside block explanations', () => {
    const g5 = r.gates.find((g) => g.drug === 'carboprost')!;
    expect(g5.detail).toMatch(/BLOCKED/i);
    expect(JSON.stringify(r.doses)).not.toContain('carboprost');
  });
  it('citation integrity', () => assertCitationIntegrity([r.assessment, r.doses]));
});

describe('adv-12 — low EBL vs critical physiology (underestimation_bias)', () => {
  const r = pipeline(toPayload(byId('adv-12')));
  it('physiology overrides volume: pathway activates, SI 1.25 warning band', () => {
    expect(r.assessment.derived.shockIndex).toBeCloseTo(1.25, 2);
    expect(r.assessment.recommendedPathways).toContain('PPH');
    expect(r.assessment.tier).toBe('EMERGENT');
    expect(r.assessment.redFlags.map((f) => f.code)).toContain('EBL_PHYSIOLOGY_MISMATCH');
  });
  it('firm uterus + ongoing bleeding → 4T trauma search promoted', () => {
    expect(r.state).not.toBeNull();
    const ids = r.state!.actions.slice(0, 3).map((a) => a.actionId);
    expect(ids).toContain(actionId('treat_the_cause'));
    expect(r.state!.actions.find((a) => a.actionId === actionId('treat_the_cause'))!.sequence).toBe(2);
  });
  it('escalates per SI band in a low-resource setting', () => {
    expect(r.escalation!.escalate).toBe(true);
  });
  it('citation integrity', () => assertCitationIntegrity([r.assessment, r.state, r.escalation]));
});
