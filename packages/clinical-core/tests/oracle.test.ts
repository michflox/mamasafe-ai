/**
 * Golden-case oracle tests: the 3 synthetic cases in data/ run against their
 * expected_outputs (SI compared to 2 decimals, per data/schema.md §5.1).
 */
import { describe, expect, it } from 'vitest';
import {
  actionId,
  assessIntake,
  assertCitationsResolve,
  collectCitations,
  computeDoses,
  evaluateContraindicationGates,
  evaluateEscalation,
  initPathway,
  mapCaseInputToIntake,
  reassess,
} from '@mamasafe/clinical-core';
import type { CaseFileInput } from '@mamasafe/clinical-core';

import case01 from '../../../data/pph-case-01.json';
import case02 from '../../../data/pph-case-02.json';
import case03 from '../../../data/pph-case-03.json';

const ACTOR = { id: 'oracle-runner', role: 'SIMULATION_USER' as const };
const NOW = '2026-08-11T12:00:00.000Z';

interface CaseFile {
  case_id: string;
  input: CaseFileInput;
  expected_outputs: {
    shock_index: { value: number; band: string };
    red_flags: string[];
    missing_info: string[];
    first_5_prioritized_actions: { action_id: string }[];
    escalation_expected: { trigger_id: string | null };
  };
}

function runCase(caseFile: CaseFile) {
  const payload = mapCaseInputToIntake(caseFile.case_id, caseFile.input, NOW, ACTOR);
  const assessment = assessIntake(payload);
  const { state } = reassess(initPathway(assessment, 'PPH'), payload);
  const escalation = evaluateEscalation(payload, assessment, state);
  const doses = computeDoses(payload, 'PPH');
  const gates = evaluateContraindicationGates(payload);
  return { payload, assessment, state, escalation, doses, gates };
}

const cases: CaseFile[] = [case01 as CaseFile, case02 as CaseFile, case03 as CaseFile];

describe.each(cases)('synthetic oracle: $case_id', (caseFile) => {
  const r = runCase(caseFile);

  it('shock index matches oracle to 2 decimals, band matches', () => {
    expect(r.assessment.derived.shockIndex).toBeCloseTo(caseFile.expected_outputs.shock_index.value, 2);
    // engine band names mirror the oracle band names (normal/warning/critical)
    expect(r.assessment.redFlags.some((f) => f.code === 'SHOCK_INDEX_GTE_1_3')).toBe(
      caseFile.expected_outputs.shock_index.band === 'critical',
    );
    if (caseFile.expected_outputs.shock_index.band === 'normal') {
      expect(r.assessment.redFlags.some((f) => f.code.startsWith('SHOCK_INDEX'))).toBe(false);
    }
    if (caseFile.expected_outputs.shock_index.band === 'warning') {
      expect(r.assessment.redFlags.some((f) => f.code === 'SHOCK_INDEX_GTE_0_9')).toBe(true);
    }
  });

  it('expected red-flag themes are present', () => {
    const codes = r.assessment.redFlags.map((f) => f.code);
    const expected = caseFile.expected_outputs.red_flags.join(' ');
    const themeMap: [RegExp, string][] = [
      [/shock_index_critical/, 'SHOCK_INDEX_GTE_1_3'],
      [/systolic_bp_below/, 'SBP_LT_90'],
      [/heart_rate_above_120/, 'HR_GT_120'],
      [/ebl_\d+ml|pph_threshold_met|massive_ebl/, ''],
      [/uterine_atony/, 'UTERINE_ATONY_SUSPECTED'],
      [/no_blood_products/, 'NO_BLOOD_PRODUCTS_ON_SITE'],
      [/no_oxytocin_available/, 'OXYTOCIN_UNAVAILABLE'],
      [/no_tranexamic_acid_available/, 'TXA_UNAVAILABLE'],
      [/altered_mental_status/, 'ALTERED_MENTAL_STATUS'],
      [/suspected_retained_products/, 'RETAINED_PRODUCTS_SUSPECTED'],
    ];
    for (const [theme, code] of themeMap) {
      if (theme.test(expected) && code) {
        expect(codes, `expected red flag ${code} for theme ${theme}`).toContain(code);
      }
    }
    if (/severe_pph_ebl|massive_ebl/.test(expected)) {
      expect(codes.some((c) => c === 'EBL_GTE_1000' || c === 'MASSIVE_EBL_GTE_1500')).toBe(true);
    }
    if (/pph_threshold_met/.test(expected)) {
      expect(codes).toContain('PPH_THRESHOLD_MET');
    }
  });

  it('expected missing-info themes are present', () => {
    const fields = r.assessment.missingInfo.map((m) => m.field);
    const expected = caseFile.expected_outputs.missing_info.join(' ');
    if (/time_of_birth_exact/.test(expected)) expect(fields).toContain('timeOfBirthExact');
    if (/genital_tract_trauma/.test(expected)) expect(fields).toContain('genitalTraumaAssessment');
    if (/urine_output/.test(expected)) expect(fields).toContain('urineOutputMlPerHr');
    if (/second_iv/.test(expected)) expect(fields).toContain('secondIvAccess');
    if (/hemoglobin/.test(expected)) expect(fields).toContain('labValues.hemoglobinGL');
  });

  it('first five prioritized actions match the oracle, in order', () => {
    const actual = r.state.actions.slice(0, 5).map((a) => a.actionId);
    const expected = caseFile.expected_outputs.first_5_prioritized_actions.map((a) => actionId(a.action_id));
    expect(actual).toEqual(expected);
  });

  it('escalation matches oracle expectation', () => {
    if (caseFile.expected_outputs.escalation_expected.trigger_id === null) {
      expect(r.escalation.escalate).toBe(false);
    } else {
      expect(r.escalation.escalate).toBe(true);
      const trigger = caseFile.expected_outputs.escalation_expected.trigger_id;
      if (trigger === 'esc-critical-shock') {
        expect(r.escalation.urgency).toBe('IMMEDIATE');
        expect(r.escalation.reasonCodes).toContain('SHOCK_INDEX_GTE_1_3');
      }
      if (trigger === 'esc-resource-gap') {
        expect(r.escalation.reasonCodes).toContain('RESOURCE_GAP');
      }
    }
  });

  it('every citation in every output resolves to the registry', () => {
    for (const output of [r.assessment, r.state, r.escalation, r.doses]) {
      const found = collectCitations(output);
      expect(found.length).toBeGreaterThan(0);
      expect(() => assertCitationsResolve(found)).not.toThrow();
    }
  });
});

describe('oracle-specific expectations', () => {
  it('case-03: misoprostol re-dose flagged; TXA/oxytocin never fabricated', () => {
    const r = runCase(case03 as CaseFile);
    const drugNames = r.doses.map((d) => d.drugName);
    expect(drugNames).not.toContain('oxytocin');
    expect(drugNames).not.toContain('tranexamic acid');
    const miso = r.doses.find((d) => d.drugName === 'misoprostol');
    expect(miso).toBeDefined();
    expect(miso!.warnings.join(' ')).toContain('misoprostol_redose_no_evidence');
    expect(r.assessment.redFlags.map((f) => f.code)).toContain('TXA_UNAVAILABLE');
    expect(r.assessment.redFlags.map((f) => f.code)).toContain('OXYTOCIN_UNAVAILABLE');
  });

  it('case-02: ergometrine gate passes with documented normal BP (reserve second line)', () => {
    const r = runCase(case02 as CaseFile);
    expect(r.gates.find((g) => g.drug === 'ergometrine')!.status).toBe('PASSED');
    expect(r.escalation.escalate).toBe(false);
  });
});
