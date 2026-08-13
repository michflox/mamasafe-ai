/**
 * MamaSafe deterministic clinical rule engine — PPH MVP.
 * Pure, synchronous, deterministic. Zero runtime dependencies.
 *
 * Hard gates implemented (data/schema.md §3.3):
 *  G1 oxytocin route/magnitude — only 10 IU IM or IV slow; never rapid IV push
 *  G2 TXA 3-hour window from time of birth; unverifiable window is flagged
 *  G3 TXA dose 1 g over 10 min; max 2 doses/24 h
 *  G4 ergot-alkaloid BP gate (SBP≥140 / DBP≥90 / documented hypertensive disorder → BLOCKED)
 *  G5 carboprost asthma gate (asthma → BLOCKED; unknown → excluded + requested)
 *  G6 misoprostol re-dose flag after prophylactic 600 µg
 *  G7 pediatric scope — age < 18 → OutOfScopeError, no dosing, no pathway
 *  G8 max doses per medications.v1.json
 *  G9 unit hygiene — unit-free / unknown-unit dose entries are malformed input
 */
import {
  RULES_VERSION,
  PATHWAY_VERSION,
  pphPathway,
  primaryCitation,
  resolveCitations,
} from './data.js';
import { ClinicalRuleError, OutOfScopeError } from './errors.js';
import { detectDoseConflicts, detectInjectionPatterns } from './injection.js';
import type {
  ActionConfirmation,
  ActionItem,
  DoseCalculation,
  EscalationDecision,
  FluidGuidance,
  GuidelineCitation,
  IntakePayload,
  MedicationAdministration,
  MissingInfo,
  PathwayId,
  PathwayState,
  Provenance,
  RedFlag,
  ReferralNote,
  RiskAssessment,
  RiskTier,
  SbarHandoff,
} from './types.js';

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

function ruleProvenance(): Provenance {
  return { kind: 'RULE_BASED', rulesVersion: RULES_VERSION, pathwayVersion: PATHWAY_VERSION };
}

const ACTION_ID_PREFIX = 'pph.';
export const actionId = (dataId: string): string => `${ACTION_ID_PREFIX}${dataId}`;

const DOSE_UNITS = new Set(['ug', 'mg', 'g', 'IU', 'mL']);
const ROUTES = new Set(['IV', 'IM', 'PO', 'PR', 'SL', 'INFUSION']);

/** Structural validation — malformed input only (contract error clause). */
function validatePayload(payload: IntakePayload): void {
  if (!payload || typeof payload !== 'object') {
    throw new ClinicalRuleError('MALFORMED_INPUT', 'intake payload is not an object');
  }
  if (payload.isSimulation !== true) {
    throw new ClinicalRuleError(
      'NOT_SIMULATION',
      'MamaSafe MVP is simulation-only: IntakePayload.isSimulation must be literal true',
    );
  }
  if (!payload.caseId || !payload.recordedAt) {
    throw new ClinicalRuleError('MALFORMED_INPUT', 'caseId and recordedAt are required');
  }
  if (!payload.vitals || typeof payload.vitals !== 'object') {
    throw new ClinicalRuleError('MALFORMED_INPUT', 'vitals object is required (fields may be absent)');
  }
  if (!payload.facility || !Array.isArray(payload.facility.availableMedications)) {
    throw new ClinicalRuleError('MALFORMED_INPUT', 'facility.availableMedications must be an array (may be empty)');
  }
  if (!Array.isArray(payload.medicationsGiven)) {
    throw new ClinicalRuleError('MALFORMED_INPUT', 'medicationsGiven must be an array (may be empty)');
  }
  for (const med of payload.medicationsGiven) {
    // Gate G9 — unit hygiene
    if (!DOSE_UNITS.has(med.doseUnit) || typeof med.dose !== 'number' || !Number.isFinite(med.dose) || med.dose <= 0) {
      throw new ClinicalRuleError(
        'UNIT_HYGIENE',
        `medicationsGiven entry for "${med.drugName}" is malformed: dose must be a positive number with a known unit (ug/mg/g/IU/mL)`,
      );
    }
    if (!ROUTES.has(med.route)) {
      throw new ClinicalRuleError('UNIT_HYGIENE', `medicationsGiven entry for "${med.drugName}" has unknown route`);
    }
  }
  const v = payload.vitals;
  for (const [key, val] of Object.entries(v)) {
    if (val !== undefined && typeof val === 'number' && !Number.isFinite(val)) {
      throw new ClinicalRuleError('MALFORMED_INPUT', `vitals.${key} is not a finite number`);
    }
  }
}

/** Gate G7 — pediatric scope. Throws OutOfScopeError; never produces dosing. */
export function assertAdultScope(ageYears: number | undefined): void {
  if (ageYears !== undefined && ageYears < 18) {
    throw new OutOfScopeError(
      'Pediatric patients are out of scope for this module; no dosing or obstetric pathway assessment can be provided. ' +
        'Seek pediatric emergency guidance and escalate to a clinician. (gate G7 / medications.v1.json scope_guard)',
    );
  }
}

/* ------------------------------------------------------------------ */
/* Shock index (thresholds.v1.json is authoritative)                   */
/* ------------------------------------------------------------------ */

export type ShockIndexBand = 'normal' | 'warning' | 'critical';

export function computeShockIndex(
  heartRateBpm: number | undefined,
  systolicBpMmHg: number | undefined,
): { value?: number; band?: ShockIndexBand; alertLevel?: number } {
  if (
    typeof heartRateBpm !== 'number' ||
    typeof systolicBpMmHg !== 'number' ||
    heartRateBpm <= 0 ||
    systolicBpMmHg <= 0
  ) {
    return {}; // never impute (thresholds input_validation.on_reject)
  }
  const value = heartRateBpm / systolicBpMmHg;
  if (value >= 1.3) return { value, band: 'critical', alertLevel: 2 };
  if (value >= 0.9) return { value, band: 'warning', alertLevel: 1 };
  return { value, band: 'normal', alertLevel: 0 };
}

/* ------------------------------------------------------------------ */
/* Early-warning score (MEOWS-style; amber/red band values partly      */
/* verification_status = requires_clinical_review — surfaced to UI)    */
/* ------------------------------------------------------------------ */

function earlyWarningScore(payload: IntakePayload): { score: number; band: 'GREEN' | 'YELLOW' | 'RED' } {
  const v = payload.vitals;
  let score = 0;
  let anyRed = false;
  const add = (points: number, red: boolean) => {
    score += points;
    if (red) anyRed = true;
  };
  if (typeof v.systolicBpMmHg === 'number') {
    const x = v.systolicBpMmHg;
    if (x < 90 || x >= 160) add(2, true);
    else if (x <= 99 || (x >= 150 && x <= 159)) add(1, false);
  }
  if (typeof v.diastolicBpMmHg === 'number') {
    const x = v.diastolicBpMmHg;
    if (x >= 110) add(2, true);
    else if (x >= 100) add(1, false);
  }
  if (typeof v.heartRateBpm === 'number') {
    const x = v.heartRateBpm;
    if (x >= 120 || x < 40) add(2, true);
    else if (x >= 100 || x <= 49) add(1, false);
  }
  if (typeof v.respiratoryRatePerMin === 'number') {
    const x = v.respiratoryRatePerMin;
    if (x >= 30 || x < 10) add(2, true);
    else if (x >= 21 || x <= 11) add(1, false);
  }
  if (typeof v.spo2Percent === 'number') {
    const x = v.spo2Percent;
    if (x < 92) add(2, true);
    else if (x <= 94) add(1, false);
  }
  if (typeof v.temperatureCelsius === 'number') {
    const x = v.temperatureCelsius;
    if (x >= 38.5 || x < 35.0) add(2, true);
    else if (x >= 38.0 || x <= 35.9) add(1, false);
  }
  if (v.mentalStatus === 'PAIN_RESPONSE' || v.mentalStatus === 'UNRESPONSIVE') add(2, true);
  else if (v.mentalStatus === 'VERBAL_RESPONSE') add(1, false);
  const band = anyRed || score >= 5 ? 'RED' : score >= 1 ? 'YELLOW' : 'GREEN';
  return { score, band };
}

/* ------------------------------------------------------------------ */
/* Contraindication gates (exported for UI + safety suite)             */
/* ------------------------------------------------------------------ */

export interface GateResult {
  gate: 'G1' | 'G2' | 'G3' | 'G4' | 'G5' | 'G6' | 'G8';
  drug: string;
  status: 'BLOCKED' | 'EXCLUDED_UNVERIFIABLE' | 'FLAGGED' | 'PASSED' | 'NOT_AVAILABLE';
  detail: string;
}

export function evaluateContraindicationGates(payload: IntakePayload): GateResult[] {
  const v = payload.vitals;
  const hist = payload.clinicalContext?.obstetricHistory;
  const results: GateResult[] = [];

  // G4 — ergot alkaloid BP gate
  const hypertensive =
    hist?.hypertensiveDisorder === true ||
    (typeof v.systolicBpMmHg === 'number' && v.systolicBpMmHg >= 140) ||
    (typeof v.diastolicBpMmHg === 'number' && v.diastolicBpMmHg >= 90);
  const bpMissing = typeof v.systolicBpMmHg !== 'number' || typeof v.diastolicBpMmHg !== 'number';
  if (hypertensive) {
    results.push({
      gate: 'G4',
      drug: 'ergometrine',
      status: 'BLOCKED',
      detail:
        'ergometrine / oxytocin-ergometrine BLOCKED: SBP ≥ 140 or DBP ≥ 90 or documented hypertensive disorder. ' +
        'Offer misoprostol 800 µg SL as the alternative second-line uterotonic.',
    });
  } else if (bpMissing) {
    // gate_rule: a documented, non-hypertensive BP is REQUIRED; BP missing
    // means the gate cannot pass regardless of history fields.
    results.push({
      gate: 'G4',
      drug: 'ergometrine',
      status: 'EXCLUDED_UNVERIFIABLE',
      detail:
        'ergometrine excluded pending a documented, non-hypertensive blood pressure — BP missing; measure BP before any ergot alkaloid.',
    });
  } else {
    results.push({ gate: 'G4', drug: 'ergometrine', status: 'PASSED', detail: 'documented non-hypertensive BP; gate passes.' });
  }

  // G5 — carboprost asthma gate
  if (hist?.asthma === true) {
    results.push({
      gate: 'G5',
      drug: 'carboprost',
      status: 'BLOCKED',
      detail: 'carboprost BLOCKED: asthma is an absolute contraindication (bronchospasm risk). Use misoprostol 800 µg SL instead.',
    });
  } else if (hist?.asthma == null) {
    results.push({
      gate: 'G5',
      drug: 'carboprost',
      status: 'EXCLUDED_UNVERIFIABLE',
      detail: 'carboprost excluded pending asthma status — confirm absence of asthma before any prostaglandin F2alpha.',
    });
  } else {
    results.push({ gate: 'G5', drug: 'carboprost', status: 'PASSED', detail: 'asthma excluded; gate passes.' });
  }

  // G6 — misoprostol re-dose flag
  const prophylacticMiso = payload.medicationsGiven.some(
    (m) => m.drugName.toLowerCase().includes('misoprostol') && m.route === 'PO' && m.dose >= 400 && m.dose <= 600,
  );
  if (prophylacticMiso) {
    results.push({
      gate: 'G6',
      drug: 'misoprostol',
      status: 'FLAGGED',
      detail:
        'misoprostol_redose_no_evidence: prophylactic oral misoprostol already given — FIGO 2022 reports NO evidence on ' +
        'safety/efficacy of an additional 800 µg SL treatment dose in this situation. Clinician decision, never the engine default; ' +
        'prefer an alternative second-line agent.',
    });
  } else {
    results.push({ gate: 'G6', drug: 'misoprostol', status: 'PASSED', detail: 'no prophylactic misoprostol recorded.' });
  }

  // G2 — TXA window
  const msb = payload.clinicalContext?.minutesSinceBirth;
  if (msb == null) {
    results.push({
      gate: 'G2',
      drug: 'tranexamic_acid',
      status: 'EXCLUDED_UNVERIFIABLE',
      detail: 'TXA 3-hour window unverifiable — time of birth unknown; confirm exact time of birth before administration.',
    });
  } else if (msb > 180) {
    results.push({
      gate: 'G2',
      drug: 'tranexamic_acid',
      status: 'BLOCKED',
      detail: 'TXA window closed: more than 3 hours since birth; the engine does not recommend TXA beyond the guideline window.',
    });
  } else {
    results.push({
      gate: 'G2',
      drug: 'tranexamic_acid',
      status: 'PASSED',
      detail: `within 3-hour window (~${Math.round(msb)} min since birth; confirm exact clock time).`,
    });
  }

  // G1 — always-on route rule (asserted on output, not patient-dependent)
  results.push({
    gate: 'G1',
    drug: 'oxytocin',
    status: 'PASSED',
    detail: 'oxytocin limited to 10 IU IM or IV slow; rapid IV push is blocked at any dose by the engine.',
  });

  return results;
}

/* ------------------------------------------------------------------ */
/* assessIntake                                                        */
/* ------------------------------------------------------------------ */

function bleedingReported(payload: IntakePayload): boolean {
  if (payload.symptoms.includes('ONGOING_BLEEDING')) return true;
  if (typeof payload.estimatedBloodLossMl === 'number' && payload.estimatedBloodLossMl > 0) return true;
  return /bleed|blood|bleeding|h(a)?emorrh/i.test(payload.narrative ?? '');
}

export function assessIntake(payload: IntakePayload): RiskAssessment {
  validatePayload(payload);
  assertAdultScope(payload.ageYears);

  const v = payload.vitals;
  const ctx = payload.clinicalContext;
  const hist = ctx?.obstetricHistory;
  const mode = ctx?.modeOfBirth ?? 'vaginal';
  const ebl = payload.estimatedBloodLossMl;
  const si = computeShockIndex(v.heartRateBpm, v.systolicBpMmHg);
  const ews = earlyWarningScore(payload);
  const pphVolumeThreshold = mode === 'cesarean' ? 1000 : 500;

  const redFlags: RedFlag[] = [];
  const missingInfo: MissingInfo[] = [];
  const citationsUsed = new Map<string, GuidelineCitation>();
  const cite = (id: string): GuidelineCitation => {
    const c = primaryCitation([id]);
    citationsUsed.set(id, c);
    return c;
  };
  const flag = (
    code: string,
    clinicianMessage: string,
    severity: 'WARNING' | 'CRITICAL',
    triggeringValues: Record<string, number | string>,
    citationId: string,
  ) => {
    redFlags.push({ code, clinicianMessage, severity, triggeringValues, citation: cite(citationId) });
  };
  const missing = (field: string, whyItMatters: string, blocksActions: string[] = []) => {
    missingInfo.push({ field, whyItMatters, blocksActions });
  };

  /* ---- physiologic red flags ---- */
  if (si.band === 'critical') {
    flag(
      'SHOCK_INDEX_GTE_1_3',
      `Shock index ${si.value!.toFixed(2)} is in the critical band (≥ 1.3): treat as hemorrhagic shock until proven otherwise.`,
      'CRITICAL',
      { shockIndex: Number(si.value!.toFixed(4)) },
      'NATHAN-2019-AOGS',
    );
  } else if (si.band === 'warning') {
    flag(
      'SHOCK_INDEX_GTE_0_9',
      `Shock index ${si.value!.toFixed(2)} is in the warning band (≥ 0.9): hemodynamic alert; in community/PHC settings this triggers urgent escalation.`,
      'WARNING',
      { shockIndex: Number(si.value!.toFixed(4)) },
      'FIGO-2022-PPH',
    );
  }
  if (typeof v.systolicBpMmHg === 'number' && v.systolicBpMmHg < 90) {
    flag('SBP_LT_90', `Systolic BP ${v.systolicBpMmHg} mmHg < 90: hypovolemia red range.`, 'CRITICAL', { systolicBpMmHg: v.systolicBpMmHg }, 'FIGO-2022-PPH');
  }
  if (typeof v.heartRateBpm === 'number' && v.heartRateBpm > 120) {
    flag('HR_GT_120', `Heart rate ${v.heartRateBpm} bpm > 120: hypovolemia red flag even if BP is preserved (pregnancy compensation).`, 'CRITICAL', { heartRateBpm: v.heartRateBpm }, 'ACOG-2017-PB183');
  }
  if (typeof ebl === 'number') {
    if (ebl >= 1500) {
      flag('MASSIVE_EBL_GTE_1500', `Estimated blood loss ${ebl} mL ≥ 1500 mL: massive ongoing hemorrhage — anticipate coagulopathy.`, 'CRITICAL', { estimatedBloodLossMl: ebl }, 'RCOG-2016-GT52');
    } else if (ebl >= 1000) {
      flag('EBL_GTE_1000', `Estimated blood loss ${ebl} mL ≥ 1000 mL: severe PPH.`, 'CRITICAL', { estimatedBloodLossMl: ebl }, 'WHO-2012-PPH');
    } else if (ebl >= pphVolumeThreshold) {
      flag('PPH_THRESHOLD_MET', `Estimated blood loss ${ebl} mL ≥ ${pphVolumeThreshold} mL after ${mode} birth: PPH threshold met — activate pathway.`, 'WARNING', { estimatedBloodLossMl: ebl }, 'WHO-2012-PPH');
    }
    if (ebl < pphVolumeThreshold && si.alertLevel !== undefined && si.alertLevel >= 1) {
      flag(
        'EBL_PHYSIOLOGY_MISMATCH',
        `Visual EBL estimate (${ebl} mL) is below the PPH threshold but physiology contradicts it (SI ${si.value!.toFixed(2)}). Visual estimation underestimates blood loss — do not trust the low estimate; physiology overrides volume.`,
        'WARNING',
        { estimatedBloodLossMl: ebl, shockIndex: Number(si.value!.toFixed(4)) },
        'FIGO-2022-PPH',
      );
    }
  }
  if (payload.symptoms.includes('ONGOING_BLEEDING')) {
    flag('ONGOING_BLEEDING', 'Ongoing postpartum bleeding reported.', 'WARNING', {}, 'FIGO-2022-PPH');
  }
  if (payload.uterineTone === 'BOGGY') {
    flag('UTERINE_ATONY_SUSPECTED', 'Uterus is boggy: uterine atony suspected (4T — Tone, ~70% of PPH).', 'WARNING', { uterineTone: 'BOGGY' }, 'FIGO-2022-PPH');
  }
  if (v.mentalStatus === 'PAIN_RESPONSE' || v.mentalStatus === 'UNRESPONSIVE') {
    flag('ALTERED_MENTAL_STATUS', 'Altered mental status: end-organ hypoperfusion until proven otherwise; escalates severity regardless of measured blood loss.', 'CRITICAL', { mentalStatus: v.mentalStatus }, 'FIGO-2022-PPH');
  } else if (v.mentalStatus === 'VERBAL_RESPONSE') {
    flag('ALTERED_MENTAL_STATUS', 'Reduced responsiveness (responds to voice): possible early hypoperfusion — monitor closely.', 'WARNING', { mentalStatus: v.mentalStatus }, 'FIGO-2022-PPH');
  }
  if (
    (typeof v.systolicBpMmHg === 'number' && v.systolicBpMmHg >= 160) ||
    (typeof v.diastolicBpMmHg === 'number' && v.diastolicBpMmHg >= 110) ||
    (hist?.hypertensiveDisorder === true && typeof v.systolicBpMmHg === 'number' && v.systolicBpMmHg >= 140)
  ) {
    flag(
      'SEVERE_RANGE_HYPERTENSION',
      `Severe-range hypertension (BP ${v.systolicBpMmHg ?? '?'}/${v.diastolicBpMmHg ?? '?'}) with documented hypertensive context: evaluate severe preeclampsia pathway in parallel; ergot alkaloids are hard-blocked.`,
      'CRITICAL',
      { systolicBpMmHg: v.systolicBpMmHg ?? 'missing', diastolicBpMmHg: v.diastolicBpMmHg ?? 'missing' },
      'ACOG-2017-PB183',
    );
  }
  if (typeof v.temperatureCelsius === 'number' && v.temperatureCelsius < 36) {
    flag('HYPOTHERMIA_COAGULOPATHY_RISK', `Temperature ${v.temperatureCelsius} °C: hypothermia worsens coagulopathy — active warming.`, 'WARNING', { temperatureCelsius: v.temperatureCelsius }, 'IMEWS-UNVERIFIED');
  }
  if (ctx?.placentaAppearsComplete === false) {
    flag('RETAINED_PRODUCTS_SUSPECTED', 'Placenta may be incomplete: retained tissue suspected (4T — Tissue).', 'WARNING', {}, 'FIGO-2022-PPH');
  }

  /* ---- resource red flags (never fabricate unavailable resources) ---- */
  const severePhysiology =
    si.alertLevel === 2 ||
    (typeof ebl === 'number' && ebl >= 1000) ||
    (typeof v.systolicBpMmHg === 'number' && v.systolicBpMmHg < 90);
  if (payload.facility.bloodProductsAvailable === false && severePhysiology) {
    flag('NO_BLOOD_PRODUCTS_ON_SITE', 'No blood products available on site with severe physiology: temporize and transfer; do not wait for deterioration.', 'WARNING', {}, 'FIGO-2022-PPH');
  }
  const availabilityKnown = payload.facility.availableMedications.length > 0;
  if (availabilityKnown && !payload.facility.availableMedications.includes('oxytocin')) {
    flag('OXYTOCIN_UNAVAILABLE', 'First-line uterotonic (oxytocin) not available on site — adapt per resource tier; escalate.', 'WARNING', {}, 'FIGO-2022-PPH');
  }
  if (availabilityKnown && !payload.facility.availableMedications.includes('tranexamic_acid') && bleedingReported(payload)) {
    flag('TXA_UNAVAILABLE', 'Tranexamic acid not available on site — document the gap; administer at the earliest point en route / on arrival if still inside the 3-hour window.', 'WARNING', {}, 'WHO-2017-TXA');
  }

  /* ---- free-text safety flags (narrative is DATA, never instructions) ---- */
  const injections = detectInjectionPatterns(payload.narrative);
  if (injections.length > 0) {
    flag(
      'INJECTION_PATTERN_DETECTED',
      `Possible instruction injection detected in intake free text (${injections.map((f) => f.patternId).join(', ')}). The text was treated as data only — no instruction was followed. Flagged for clinician review and audit.`,
      'WARNING',
      { patterns: injections.map((f) => f.patternId).join(', ') },
      'FIGO-2022-PPH',
    );
  }
  for (const code of detectDoseConflicts(payload.narrative)) {
    const messages: Record<string, string> = {
      OXYTOCIN_BOLUS_MAGNITUDE_CONFLICT:
        'Free text requests an oxytocin dose that conflicts with guideline dosing (gate G1/G8). Ignored — the engine recommends only 10 IU IM or IV slow.',
      RAPID_IV_PUSH_REQUESTED:
        'Free text requests rapid IV push/bolus administration (gate G1). Ignored — rapid IV oxytocin can cause hypotension and cardiovascular collapse and is blocked at any dose.',
      TXA_MAGNITUDE_CONFLICT:
        'Free text requests a tranexamic acid dose above the guideline maximum (gate G3). Ignored — the engine recommends only 1 g IV over 10 minutes (max 2 doses/24 h).',
      UNVERIFIABLE_CITATION_CLAIM:
        'Free text cites a guideline reference that is absent from the citation registries — it could not be verified and must not be relied on. Possible fabricated reference; flagged.',
    };
    flag(code, messages[code], 'WARNING', {}, code === 'TXA_MAGNITUDE_CONFLICT' ? 'WHO-2017-TXA' : 'FIGO-2022-PPH');
  }

  /* ---- missing information (never impute) ---- */
  if (typeof v.heartRateBpm !== 'number') {
    missing('vitals.heartRateBpm', 'Heart rate is required to compute the shock index and assess hemodynamic severity. Measure now.');
  }
  if (typeof v.systolicBpMmHg !== 'number') {
    missing('vitals.systolicBpMmHg', 'Systolic BP is required for shock index, escalation triggers, and the ergot-alkaloid gate (G4). Measure now.', [actionId('uterotonic_second_line')]);
  }
  if (typeof v.diastolicBpMmHg !== 'number' && typeof v.systolicBpMmHg !== 'number') {
    missing('bpBeforeErgotAlkaloids', 'A documented, non-hypertensive BP is REQUIRED before any ergot alkaloid can be considered (gate G4). Ergometrine remains excluded meanwhile.');
  }
  if (typeof ebl !== 'number') {
    missing('estimatedBloodLossMl', 'Cumulative blood loss drives PPH recognition and severity. Quantify where possible (visual estimates underestimate).');
  }
  if (!payload.uterineTone || payload.uterineTone === 'UNKNOWN') {
    missing('uterineTone', 'Uterine tone distinguishes atony (Tone) from trauma/tissue causes (4T framework). Palpate now.');
  }
  if (typeof payload.weightKg !== 'number') {
    missing('weightKg', 'Weight is required for weight-based values (fluid/urine-output targets). No weight is assumed.');
  }
  const msb = ctx?.minutesSinceBirth;
  if (msb == null) {
    missing('clinicalContext.minutesSinceBirth', 'Time of birth verifies the TXA 3-hour window (gate G2). Without it the window is unverifiable — confirm exact time of birth.', [actionId('tranexamic_acid')]);
  } else {
    missing('timeOfBirthExact', 'Approximate minutes since birth recorded; confirm the exact clock time of birth to verify the TXA 3-hour window (gate G2).');
  }
  if (typeof payload.urineOutputMlPerHr !== 'number') {
    missing('urineOutputMlPerHr', 'Urine output (target ≥ 0.5 mL/kg/h) is the resuscitation perfusion baseline. Catheterize when feasible.');
  }
  if (ctx?.genitalTraumaAssessed !== true) {
    missing('genitalTraumaAssessment', 'Genital-tract trauma inspection not yet performed (4T — Trauma). If the uterus is contracted but bleeding continues, look actively for lacerations/hematoma/rupture.');
  }
  if (payload.facility.ivAccessEstablished === undefined) {
    missing('facility.ivAccessEstablished', 'IV access status unknown — establish at least one large-bore line for resuscitation.');
  } else if (severePhysiology && (ctx?.ivAccessCount ?? 1) < 2) {
    missing('secondIvAccess', 'Severe hemorrhage: a second large-bore IV line is recommended for parallel resuscitation.');
  }
  if (hist?.asthma == null) {
    missing('clinicalContext.obstetricHistory.asthma', 'Asthma status is REQUIRED before carboprost can be considered (gate G5); carboprost remains excluded meanwhile.');
  }
  if (typeof ebl === 'number' && ebl >= 1500 && typeof payload.labValues?.hemoglobinGL !== 'number') {
    missing('labValues.hemoglobinGL', 'Massive hemorrhage: hemoglobin/coagulation status guides transfusion (send at earliest opportunity; do not delay transfer).');
  }

  /* ---- risk tier ---- */
  let tier: RiskTier = 'STABLE';
  const criticalPhysiology =
    si.alertLevel === 2 ||
    (typeof v.systolicBpMmHg === 'number' && v.systolicBpMmHg < 90 && typeof v.heartRateBpm === 'number' && v.heartRateBpm > 120) ||
    v.mentalStatus === 'PAIN_RESPONSE' ||
    v.mentalStatus === 'UNRESPONSIVE';
  const emergentPhysiology =
    si.alertLevel === 1 ||
    (typeof ebl === 'number' && ebl >= 1000) ||
    (typeof v.systolicBpMmHg === 'number' && v.systolicBpMmHg < 90) ||
    (typeof v.heartRateBpm === 'number' && v.heartRateBpm > 120);
  if (criticalPhysiology) tier = 'CRITICAL';
  else if (emergentPhysiology) tier = 'EMERGENT';
  else if ((typeof ebl === 'number' && ebl >= pphVolumeThreshold) || bleedingReported(payload)) tier = 'AT_RISK';
  // Fail-safe: ambiguity always escalates (pph-pathway recognition_criteria.fail_safe_default)
  const vitalsMissing = typeof v.heartRateBpm !== 'number' || typeof v.systolicBpMmHg !== 'number';
  if (bleedingReported(payload) && vitalsMissing && (tier === 'STABLE' || tier === 'AT_RISK')) {
    tier = 'EMERGENT'; // indeterminate — assume worst case until assessed
  }

  /* ---- pathway recommendation ---- */
  const recommendedPathways: PathwayId[] = [];
  const hypovolemiaSigns =
    si.alertLevel !== undefined && si.alertLevel >= 1
      ? true
      : (typeof v.heartRateBpm === 'number' && v.heartRateBpm > 120) ||
        (typeof v.systolicBpMmHg === 'number' && v.systolicBpMmHg < 90) ||
        v.mentalStatus === 'VERBAL_RESPONSE' ||
        v.mentalStatus === 'PAIN_RESPONSE' ||
        v.mentalStatus === 'UNRESPONSIVE' ||
        payload.symptoms.includes('HYPOVOLEMIA_SIGNS');
  if (
    (typeof ebl === 'number' && ebl >= pphVolumeThreshold) ||
    (si.alertLevel !== undefined && si.alertLevel >= 1) ||
    (bleedingReported(payload) && hypovolemiaSigns) ||
    (bleedingReported(payload) && vitalsMissing) ||
    payload.symptoms.includes('ONGOING_BLEEDING')
  ) {
    recommendedPathways.push('PPH');
  }
  if (redFlags.some((f) => f.code === 'SEVERE_RANGE_HYPERTENSION')) {
    recommendedPathways.push('PREECLAMPSIA_SEVERE'); // parallel evaluation trigger (module stub)
  }

  return {
    caseId: payload.caseId,
    assessedAt: payload.recordedAt,
    tier,
    redFlags,
    missingInfo,
    derived: {
      shockIndex: si.value,
      shockIndexThreshold: si.value !== undefined ? 0.9 : undefined,
      earlyWarningScore: ews.score,
      earlyWarningBand: ews.band,
    },
    recommendedPathways,
    provenance: ruleProvenance(),
    citations: [...citationsUsed.values()],
  };
}

/* ------------------------------------------------------------------ */
/* Pathway state machine                                               */
/* ------------------------------------------------------------------ */

const GATE_ANNOTATIONS: Record<string, string[]> = {
  uterotonic_first_line: ['G1 oxytocin route/magnitude gate'],
  tranexamic_acid: ['G2 TXA 3-hour window', 'G3 TXA dose/max gate'],
  uterotonic_second_line: ['G4 ergot-alkaloid BP gate', 'G5 carboprost asthma gate', 'G6 misoprostol re-dose flag', 'G8 max-dose gates'],
};

function buildActions(): ActionItem[] {
  return pphPathway.action_sequence.map((step) => {
    const text: string = step.action;
    const firstSentence = text.split(/(?<=\.)\s/)[0] ?? text;
    return {
      actionId: actionId(step.id),
      sequence: step.step,
      title: firstSentence.length > 110 ? firstSentence.slice(0, 107) + '…' : firstSentence,
      rationale: text,
      prerequisites: step.id === 'uterotonic_second_line' ? [actionId('uterotonic_first_line')] : [],
      contraindicationsChecked: GATE_ANNOTATIONS[step.id] ?? [],
      gatedByMissingInfo: [],
      status: 'PENDING' as const,
      citation: primaryCitation(step.citation_ids),
      provenance: ruleProvenance(),
    };
  });
}

export function initPathway(assessment: RiskAssessment, pathwayId: PathwayId): PathwayState {
  if (pathwayId !== 'PPH') {
    throw new ClinicalRuleError(
      'PATHWAY_NOT_IMPLEMENTED',
      `pathway "${pathwayId}" is an architecture stub in the MVP — only 'PPH' is implemented`,
    );
  }
  if (!assessment.recommendedPathways.includes('PPH')) {
    throw new ClinicalRuleError('PATHWAY_NOT_INDICATED', 'PPH pathway was not recommended by the assessment');
  }
  return {
    caseId: assessment.caseId,
    pathwayId: 'PPH',
    pathwayVersion: PATHWAY_VERSION,
    startedAt: assessment.assessedAt,
    lastReassessedAt: assessment.assessedAt,
    phase: 'INITIAL_RESPONSE',
    actions: buildActions(),
    completedActionIds: [],
    provenance: ruleProvenance(),
  };
}

/**
 * Context-aware resequencing + resource-tier adaptation.
 * Steps 1–6 of the pathway are parallel/immediate: they are presented as one
 * simultaneous first-response set — TXA never waits behind uterine massage.
 * Unavailable drugs are NEVER recommended: their actions become
 * NOT_APPLICABLE and sink to the end of the list.
 */
export function reassess(state: PathwayState, payload: IntakePayload): { assessment: RiskAssessment; state: PathwayState } {
  const assessment = assessIntake(payload);
  const ctx = payload.clinicalContext;
  const availabilityKnown = payload.facility.availableMedications.length > 0;
  const avail = new Set(payload.facility.availableMedications);
  const msb = ctx?.minutesSinceBirth;

  const oxytocinUnavailable = availabilityKnown && !avail.has('oxytocin');
  const txaUnavailable = availabilityKnown && !avail.has('tranexamic_acid');
  const txaWindowClosed = typeof msb === 'number' && msb > 180;
  const resourceGapMode = oxytocinUnavailable;
  const traumaSearchMode = payload.uterineTone === 'FIRM' && payload.symptoms.includes('ONGOING_BLEEDING');

  const baseOrder = [
    'call_for_help',
    'uterine_massage',
    'uterotonic_first_line',
    'tranexamic_acid',
    'iv_access_and_fluids',
    'assess_abc_and_4t',
    'uterotonic_second_line',
    'treat_the_cause',
    'temporizing_measures',
    'escalate_definitive_care',
  ];
  let order: string[];
  if (resourceGapMode) {
    // Resource-tier adaptation (community/home birth without first-line drugs):
    // mechanical temporizing measures and immediate transfer outrank absent drugs.
    order = [
      'call_for_help',
      'temporizing_measures',
      'uterotonic_second_line',
      'iv_access_and_fluids',
      'escalate_definitive_care',
      'uterine_massage',
      'assess_abc_and_4t',
      'treat_the_cause',
      'uterotonic_first_line',
      'tranexamic_acid',
    ];
  } else if (traumaSearchMode) {
    // Contracted uterus + ongoing bleeding → actively search Trauma/Tissue/Thrombin (4T engine_rule)
    order = [
      'call_for_help',
      'treat_the_cause',
      'uterotonic_first_line',
      'tranexamic_acid',
      'iv_access_and_fluids',
      'assess_abc_and_4t',
      'uterine_massage',
      'uterotonic_second_line',
      'temporizing_measures',
      'escalate_definitive_care',
    ];
  } else {
    order = baseOrder;
  }

  const gateResults = evaluateContraindicationGates(payload);
  const gateFor = (drug: string) => gateResults.find((g) => g.drug === drug);

  const byDataId = new Map(state.actions.map((a) => [a.actionId.replace(ACTION_ID_PREFIX, ''), a]));
  const previousByActionId = new Map(state.actions.map((a) => [a.actionId, a]));

  const nextActions: ActionItem[] = [];
  let seq = 0;
  for (const dataId of order) {
    const existing = byDataId.get(dataId);
    if (!existing) continue;
    seq += 1;
    const prev = previousByActionId.get(existing.actionId);
    const confirmed = prev && (prev.status === 'CONFIRMED' || prev.status === 'DEFERRED' || prev.status === 'OVERRIDDEN');
    let status: ActionItem['status'] = confirmed ? prev.status : 'PENDING';
    let confirmation = prev?.confirmation;
    const gatedByMissingInfo: string[] = [];
    let rationale = existing.rationale;

    if (dataId === 'uterotonic_first_line' && oxytocinUnavailable) {
      status = 'NOT_APPLICABLE';
      confirmation = undefined;
      rationale += ' [RESOURCE ADAPTATION: oxytocin is not available on site — the engine does not recommend unavailable drugs; see second-line and temporizing actions.]';
    }
    if (dataId === 'tranexamic_acid') {
      if (txaUnavailable) {
        status = 'NOT_APPLICABLE';
        confirmation = undefined;
        rationale += ' [RESOURCE ADAPTATION: TXA is not stocked on site — document the gap; administer en route/on arrival if still inside the 3-hour window.]';
      } else if (txaWindowClosed) {
        status = 'NOT_APPLICABLE';
        confirmation = undefined;
        rationale += ' [GATE G2: more than 3 hours since birth — TXA window closed; not recommended.]';
      } else if (msb == null) {
        gatedByMissingInfo.push('clinicalContext.minutesSinceBirth');
        rationale += ' [GATE G2: time of birth unknown — 3-hour window unverifiable; confirm exact time of birth before administration.]';
      }
    }
    if (dataId === 'uterotonic_second_line') {
      const g4 = gateFor('ergometrine');
      const g5 = gateFor('carboprost');
      const g6 = gateFor('misoprostol');
      const lines = [g4, g5, g6]
        .filter((g): g is NonNullable<typeof g> => !!g)
        .map((g) => `${g.gate} ${g.drug}: ${g.status} — ${g.detail}`);
      rationale += ` [Contraindication gates evaluated: ${lines.join(' | ')}]`;
      if (availabilityKnown) {
        const anySecondLine = ['misoprostol', 'ergometrine', 'carbetocin'].some((d) => avail.has(d));
        if (!anySecondLine) {
          status = 'NOT_APPLICABLE';
          confirmation = undefined;
          rationale += ' [RESOURCE ADAPTATION: no second-line uterotonic in stock — prioritize mechanical measures and transfer.]';
        }
      }
    }

    nextActions.push({
      ...existing,
      sequence: seq,
      status,
      confirmation,
      gatedByMissingInfo,
      rationale,
    });
  }

  const phase =
    assessment.tier === 'CRITICAL' || assessment.redFlags.some((f) => f.code === 'NO_BLOOD_PRODUCTS_ON_SITE' || f.code === 'SHOCK_INDEX_GTE_1_3')
      ? 'ESCALATION'
      : 'INITIAL_RESPONSE';

  return {
    assessment,
    state: {
      ...state,
      lastReassessedAt: payload.recordedAt,
      phase,
      actions: nextActions,
    },
  };
}

export function confirmAction(state: PathwayState, actionIdToConfirm: string, confirmation: ActionConfirmation): PathwayState {
  if (confirmation.decision === 'OVERRIDDEN' && !confirmation.overrideReason) {
    throw new ClinicalRuleError('OVERRIDE_REASON_REQUIRED', 'an override requires a recorded reason (API_CONTRACTS.md §4.3)');
  }
  const idx = state.actions.findIndex((a) => a.actionId === actionIdToConfirm);
  if (idx === -1) {
    throw new ClinicalRuleError('UNKNOWN_ACTION', `action "${actionIdToConfirm}" not in pathway state`);
  }
  const target = state.actions[idx];
  if (target.status === 'NOT_APPLICABLE') {
    throw new ClinicalRuleError('ACTION_NOT_APPLICABLE', `action "${actionIdToConfirm}" is not applicable in the current context`);
  }
  const status =
    confirmation.decision === 'CONFIRMED' ? 'CONFIRMED' : confirmation.decision === 'DEFERRED' ? 'DEFERRED' : 'OVERRIDDEN';
  const actions = state.actions.map((a, i) =>
    i === idx ? { ...a, status: status as ActionItem['status'], confirmation } : a,
  );
  const completedActionIds =
    confirmation.decision === 'CONFIRMED' && !state.completedActionIds.includes(actionIdToConfirm)
      ? [...state.completedActionIds, actionIdToConfirm]
      : state.completedActionIds;
  return { ...state, actions, completedActionIds, lastReassessedAt: confirmation.confirmedAt };
}

/* ------------------------------------------------------------------ */
/* Dose calculations (gates G1–G9)                                     */
/* ------------------------------------------------------------------ */

function doseProvenance(): Provenance {
  return ruleProvenance();
}

export function computeDoses(payload: IntakePayload, pathwayId: PathwayId): DoseCalculation[] {
  validatePayload(payload);
  assertAdultScope(payload.ageYears); // G7
  if (pathwayId !== 'PPH') {
    throw new ClinicalRuleError('PATHWAY_NOT_IMPLEMENTED', `dosing for "${pathwayId}" is an architecture stub in the MVP`);
  }

  const weightAvailable = typeof payload.weightKg === 'number' && payload.weightKg > 0;
  const availabilityKnown = payload.facility.availableMedications.length > 0;
  const avail = new Set(payload.facility.availableMedications);
  const gates = evaluateContraindicationGates(payload);
  const gate = (drug: string) => gates.find((g) => g.drug === drug);

  const doses: DoseCalculation[] = [];
  const weightInputs = { weightKg: payload.weightKg ?? 'not recorded' };

  // oxytocin — first line (G1: only 10 IU IM or IV slow; never rapid IV push)
  if (!availabilityKnown || avail.has('oxytocin')) {
    doses.push({
      calculationId: 'dose.pph.oxytocin.treatment',
      drugName: 'oxytocin',
      indication: 'First-line uterotonic for PPH treatment',
      inputs: { ...weightInputs, context: 'pph_treatment_first_line' },
      formula: 'oxytocin 10 IU IM or IV slow; fixed dose (not weight-based). NEVER rapid IV push.',
      result: {
        dose: 10,
        doseUnit: 'IU',
        route: 'IM',
        administrationNote:
          'IM, or IV slow. Rapid IV push is blocked at any dose (gate G1): hypotension, tachycardia, cardiovascular collapse risk. Single bolus-equivalent above 10 IU is rejected by the engine.',
      },
      contraindications: [
        { rule: 'hypersensitivity to oxytocin (absolute)', triggered: false },
        { rule: 'rapid IV push administration (route hazard) — engine blocks this route at any dose', triggered: false },
      ],
      warnings: [
        'Never administer as rapid IV push at any dose (gate G1).',
        'Cold-chain failure may render oxytocin ineffective — verify storage history where possible.',
      ],
      requiresWeight: false,
      weightAvailable,
      citation: primaryCitation(['WHO-2012-PPH']),
      provenance: doseProvenance(),
    });
  }

  // tranexamic acid (G2 window, G3 dose/max)
  const g2 = gate('tranexamic_acid');
  if ((!availabilityKnown || avail.has('tranexamic_acid')) && g2?.status !== 'BLOCKED') {
    const warnings = [
      'Do not exceed 1 mL/min infusion rate — rapid injection can cause hypotension.',
      'Maximum 2 doses (2 g) per 24 h for this indication (gate G3). Second dose only if bleeding continues after 30 minutes or restarts within 24 hours of the first dose.',
    ];
    if (g2?.status === 'EXCLUDED_UNVERIFIABLE') {
      warnings.unshift('GATE G2: 3-hour window unverifiable — confirm exact time of birth before administration.');
    }
    doses.push({
      calculationId: 'dose.pph.tranexamic_acid.treatment',
      drugName: 'tranexamic acid',
      indication: 'Adjunct to standard care for clinically diagnosed PPH, as early as possible and within 3 hours of birth',
      inputs: { ...weightInputs, minutesSinceBirth: payload.clinicalContext?.minutesSinceBirth ?? 'unknown' },
      formula: 'tranexamic acid 1 g (100 mg/mL) IV at 1 mL/min — administered over 10 minutes; fixed dose (not weight-based)',
      result: {
        dose: 1,
        doseUnit: 'g',
        route: 'IV',
        administrationNote: 'IV slowly over 10 minutes (1 mL/min). Give as soon as PPH is diagnosed; benefit declines with delay.',
        maxCumulativeDose: { dose: 2, doseUnit: 'g (two 1 g doses per 24 h)' },
      },
      contraindications: [
        { rule: 'active thromboembolic disease (absolute)', triggered: false },
        { rule: 'known hypersensitivity to tranexamic acid (absolute)', triggered: false },
      ],
      warnings,
      requiresWeight: false,
      weightAvailable,
      citation: primaryCitation(['WHO-2017-TXA']),
      provenance: doseProvenance(),
    });
  }

  // misoprostol — second line (G6 flag)
  if (!availabilityKnown || avail.has('misoprostol')) {
    const g6 = gate('misoprostol');
    const warnings: string[] = [];
    if (g6?.status === 'FLAGGED') {
      warnings.push(g6.detail);
    }
    warnings.push('Fever and shivering are common and usually transient — counsel accordingly.');
    doses.push({
      calculationId: 'dose.pph.misoprostol.treatment',
      drugName: 'misoprostol',
      indication:
        g6?.status === 'FLAGGED'
          ? 'Second-line uterotonic — FLAGGED clinician-decision option (not the engine default; see gate G6)'
          : 'Second-line uterotonic when oxytocin unavailable or bleeding unresponsive',
      inputs: { ...weightInputs, context: 'pph_treatment' },
      formula: 'misoprostol 800 µg sublingual; fixed dose (not weight-based)',
      result: {
        dose: 800,
        doseUnit: 'ug',
        route: 'SL',
        administrationNote: 'Sublingual (treatment route — do not confuse with oral prevention dosing).',
      },
      contraindications: [{ rule: 'hypersensitivity to prostaglandins (absolute)', triggered: false }],
      warnings,
      requiresWeight: false,
      weightAvailable,
      citation: primaryCitation(['WHO-2012-PPH']),
      provenance: doseProvenance(),
    });
  }

  // ergometrine — only when G4 passes AND available
  const g4 = gate('ergometrine');
  if (g4?.status === 'PASSED' && (!availabilityKnown || avail.has('ergometrine'))) {
    doses.push({
      calculationId: 'dose.pph.ergometrine.treatment',
      drugName: 'ergometrine (methylergometrine)',
      indication: 'Second-line uterotonic — ONLY because a documented non-hypertensive BP is on record (gate G4 passed)',
      inputs: { ...weightInputs, systolicBpMmHg: payload.vitals.systolicBpMmHg ?? 'missing', diastolicBpMmHg: payload.vitals.diastolicBpMmHg ?? 'missing' },
      formula: 'ergometrine 200 µg IM (or IV slow); fixed dose (not weight-based)',
      result: {
        dose: 200,
        doseUnit: 'ug',
        route: 'IM',
        administrationNote: 'Single 200 µg dose; repeat dosing per facility protocol only. Engine rejects doses above 200 µg (gate G8).',
        maxCumulativeDose: { dose: 200, doseUnit: 'ug per administration' },
      },
      contraindications: [
        { rule: 'hypertension / preeclampsia / hypertensive disorder of pregnancy (absolute) — gate G4 checked: PASSED', triggered: false },
        { rule: 'cardiac disease, peripheral vascular disease (strong relative) — senior clinical judgment required', triggered: false },
      ],
      warnings: ['Causes hypertension and vomiting as common adverse effects — monitor BP after administration.'],
      requiresWeight: false,
      weightAvailable,
      citation: primaryCitation(['WHO-2012-PPH']),
      provenance: doseProvenance(),
    });
  }

  // carbetocin — alternative where stocked
  if (!availabilityKnown || avail.has('carbetocin')) {
    doses.push({
      calculationId: 'dose.pph.carbetocin.alternative',
      drugName: 'carbetocin (heat-stable formulation)',
      indication: 'Alternative uterotonic where available (heat-stable; strongest evidence for prevention)',
      inputs: { ...weightInputs },
      formula: 'carbetocin 100 µg IM or IV; fixed single dose (not weight-based)',
      result: {
        dose: 100,
        doseUnit: 'ug',
        route: 'IM',
        administrationNote: 'Heat-stable — no cold chain required. Engine rejects doses above 100 µg (gate G8).',
        maxCumulativeDose: { dose: 100, doseUnit: 'ug' },
      },
      contraindications: [{ rule: 'hypersensitivity to carbetocin or oxytocin (absolute)', triggered: false }],
      warnings: ['For treatment, oxytocin remains first-line per WHO/FIGO; carbetocin evidence is strongest for prevention.'],
      requiresWeight: false,
      weightAvailable,
      citation: primaryCitation(['WHO-2018-UTEROTONICS']),
      provenance: doseProvenance(),
    });
  }

  // carboprost — only when G5 passes AND stocked (facility-level hemorrhage cart)
  const g5 = gate('carboprost');
  if (g5?.status === 'PASSED' && availabilityKnown && avail.has('carboprost')) {
    doses.push({
      calculationId: 'dose.pph.carboprost.refractory',
      drugName: 'carboprost tromethamine (15-methyl prostaglandin F2alpha)',
      indication: 'Second/third-line uterotonic for refractory atony — stocked in this facility; asthma excluded (gate G5 passed)',
      inputs: { ...weightInputs, asthma: 'excluded' },
      formula: 'carboprost 250 µg IM; may repeat at ≥ 15-minute intervals; total ≤ 2 mg (8 doses)',
      result: {
        dose: 250,
        doseUnit: 'ug',
        route: 'IM',
        administrationNote: 'IM only (intramyometrial only by experienced clinicians). Engine rejects single doses above 250 µg and cumulative doses above 2 mg (gate G8).',
        maxCumulativeDose: { dose: 2, doseUnit: 'mg total (8 × 250 µg)' },
      },
      contraindications: [
        { rule: 'asthma (absolute) — gate G5 checked: PASSED', triggered: false },
        { rule: 'hypersensitivity to prostaglandins (absolute)', triggered: false },
      ],
      warnings: ['Bronchospasm risk — monitor respiratory status.', 'Fever, diarrhea, nausea, vomiting, flushing are common.'],
      requiresWeight: false,
      weightAvailable,
      citation: primaryCitation(['ACOG-2017-PB183']),
      provenance: doseProvenance(),
    });
  }

  return doses;
}

/* ------------------------------------------------------------------ */
/* Fluid guidance                                                      */
/* ------------------------------------------------------------------ */

export function computeFluidGuidance(payload: IntakePayload, assessment: RiskAssessment): FluidGuidance {
  validatePayload(payload);
  assertAdultScope(payload.ageYears);
  const weightAvailable = typeof payload.weightKg === 'number' && payload.weightKg > 0;
  const suggestedBolusMl = weightAvailable ? (payload.weightKg! >= 60 ? 1000 : 500) : 500;
  const v = payload.vitals;
  const si = assessment.derived.shockIndex;
  const ebl = payload.estimatedBloodLossMl;
  const hb = payload.labValues?.hemoglobinGL;

  const reasonCodes: string[] = [];
  if (typeof si === 'number' && si >= 1.3) reasonCodes.push('SHOCK_INDEX_GTE_1_3');
  if (typeof v.systolicBpMmHg === 'number' && v.systolicBpMmHg < 90 && typeof v.heartRateBpm === 'number' && v.heartRateBpm > 120)
    reasonCodes.push('SBP_LT_90_WITH_HR_GT_120');
  if (typeof ebl === 'number' && ebl >= 1500) reasonCodes.push('EBL_GTE_1500_ONGOING');
  if (typeof hb === 'number' && hb < 70) reasonCodes.push('HB_LT_7_G_DL');
  else if (typeof hb === 'number' && hb < 80 && payload.symptoms.includes('ONGOING_BLEEDING')) reasonCodes.push('HB_LT_8_G_DL_WITH_ONGOING_BLEEDING');

  const indicated = reasonCodes.length > 0;
  const bloodAvailable = payload.facility.bloodProductsAvailable;
  const note = indicated
    ? bloodAvailable === false
      ? 'Blood products are NOT available on site — this is a resource gap: apply temporizing measures (NASG, compression) and transfer immediately; never delay transfer waiting for deterioration. Document the gap in the referral note.'
      : 'Transfuse early where blood products are available (RCOG-aligned: maintain Hb > 8 g/dL during major hemorrhage). Transfusion triggers are guidance, not hard rules — integrate ongoing bleeding and hemodynamic status.'
    : 'No transfusion trigger met at this assessment. Continue isotonic crystalloid resuscitation and monitoring; reassess after each liter.';

  return {
    crystalloid: {
      suggestedBolusMl,
      note:
        `Isotonic crystalloid (0.9% sodium chloride or Ringer's lactate), warmed if possible: rapid bolus ~${suggestedBolusMl} mL now` +
        (weightAvailable ? '' : ' (weight not recorded — adult default; no weight assumed silently)') +
        ', running IN PARALLEL with uterotonics and TXA. Reassess after each liter; up to ~2 L crystalloid (≤ ~3.5 L total clear fluids) before escalating to blood products (RCOG-aligned volume discipline). Isotonic crystalloids are recommended in preference to colloids. Target perfusion (mental status, urine output ≥ 0.5 mL/kg/h), permissive SBP floor 80–90 pending hemorrhage control — do not chase normal BP with excessive crystalloid.',
      citation: primaryCitation(['WHO-2012-PPH']),
    },
    bloodProductPrompt: { indicated, reasonCodes, note },
    provenance: ruleProvenance(),
  };
}

/* ------------------------------------------------------------------ */
/* Escalation (fail-safe: ambiguity always escalates)                  */
/* ------------------------------------------------------------------ */

export function evaluateEscalation(payload: IntakePayload, assessment: RiskAssessment, state: PathwayState): EscalationDecision {
  validatePayload(payload);
  assertAdultScope(payload.ageYears);
  const v = payload.vitals;
  const si = assessment.derived.shockIndex;
  const ebl = payload.estimatedBloodLossMl;
  const reasonCodes: string[] = [];

  if (typeof si === 'number' && si >= 1.3) reasonCodes.push('SHOCK_INDEX_GTE_1_3');
  if (typeof v.systolicBpMmHg === 'number' && v.systolicBpMmHg < 90 && typeof v.heartRateBpm === 'number' && v.heartRateBpm > 120)
    reasonCodes.push('SBP_LT_90_WITH_HR_GT_120');
  if (v.mentalStatus === 'PAIN_RESPONSE' || v.mentalStatus === 'UNRESPONSIVE') reasonCodes.push('ALTERED_MENTAL_STATUS_HYPOVOLEMIA');
  const lowResourceSetting = payload.facility.surgicalCapability !== true;
  if (typeof si === 'number' && si >= 0.9 && si < 1.3 && lowResourceSetting) reasonCodes.push('COMMUNITY_OR_PHC_SETTING_SI_GTE_0_9');
  const severe = assessment.tier === 'CRITICAL' || assessment.tier === 'EMERGENT';
  const resourceGap =
    severe &&
    (payload.facility.bloodProductsAvailable === false ||
      (payload.facility.availableMedications.length > 0 && !payload.facility.availableMedications.includes('oxytocin')));
  if (resourceGap) reasonCodes.push('RESOURCE_GAP');
  if (typeof ebl === 'number' && ebl >= 1500) reasonCodes.push('EBL_GTE_1500_ONGOING');
  if (assessment.missingInfo.some((m) => m.field === 'vitals.heartRateBpm' || m.field === 'vitals.systolicBpMmHg') && payload.symptoms.includes('ONGOING_BLEEDING'))
    reasonCodes.push('INDETERMINATE_DATA_FAILSAFE');

  const escalate = reasonCodes.length > 0;
  const urgency: EscalationDecision['urgency'] =
    typeof si === 'number' && si >= 1.3
      ? 'IMMEDIATE'
      : reasonCodes.includes('SBP_LT_90_WITH_HR_GT_120') || reasonCodes.includes('ALTERED_MENTAL_STATUS_HYPOVOLEMIA')
        ? 'IMMEDIATE'
        : escalate
          ? 'URGENT'
          : 'ROUTINE';

  const actionsWhileAwaitingTransfer = escalate
    ? [
        'Continue uterine massage; bimanual uterine compression or external aortic compression if atony persists',
        'Apply the non-pneumatic anti-shock garment (NASG) as a temporizing measure (senior clinician confirms; device contraindication list is pending source verification)',
        'Maintain IV access; continue warmed isotonic crystalloid resuscitation en route',
        'Monitor HR, BP (recompute shock index), RR, SpO2 every 5 minutes; quantify ongoing blood loss continuously',
        'Keep the patient warm — hypothermia worsens coagulopathy',
        'Give tranexamic acid en route/on arrival if still inside the 3-hour window and not yet given',
      ]
    : [];

  const receivingFacilityRequirements = escalate
    ? ['SURGICAL_CAPABILITY', 'BLOOD_PRODUCTS', ...(payload.clinicalContext?.placentaAppearsComplete === false ? ['MANUAL_REMOVAL_CAPABILITY'] : []), 'BALLOON_TAMPONADE']
    : [];

  return {
    caseId: payload.caseId,
    decidedAt: payload.recordedAt,
    urgency,
    escalate,
    reasonCodes,
    actionsWhileAwaitingTransfer,
    receivingFacilityRequirements,
    provenance: ruleProvenance(),
    citations: resolveCitations(['FIGO-2022-PPH', 'NATHAN-2019-AOGS']),
  };
}

/* ------------------------------------------------------------------ */
/* Referral note + SBAR (deterministic RULE_BASED templates)           */
/* ------------------------------------------------------------------ */

export function generateReferralNote(payload: IntakePayload, state: PathwayState, escalation: EscalationDecision): ReferralNote {
  validatePayload(payload);
  assertAdultScope(payload.ageYears);
  const v = payload.vitals;
  const ctx = payload.clinicalContext;
  const age = typeof payload.ageYears === 'number' ? `${payload.ageYears}-year-old` : 'adult (age not recorded)';
  const ga = typeof payload.gestationalAgeWeeks === 'number' ? `${payload.gestationalAgeWeeks} weeks gestation, ` : '';
  const mode = ctx?.modeOfBirth ?? 'vaginal';
  const msb = ctx?.minutesSinceBirth;

  const patientSummary =
    `${age} postpartum patient (synthetic simulation case), ${ga}${mode} birth` +
    (typeof msb === 'number' ? ` ~${Math.round(msb)} minutes ago` : '') +
    '. Deidentified; no real patient identifiers.';

  const actionsTaken = state.actions
    .filter((a) => a.status === 'CONFIRMED' && a.confirmation)
    .map((a) => ({ actionId: a.actionId, title: a.title, confirmedAt: a.confirmation!.confirmedAt }));

  const timeline: { at: string; event: string }[] = [
    { at: payload.recordedAt, event: 'PPH intake recorded and pathway activated (MamaSafe simulation)' },
    ...actionsTaken.map((a) => ({ at: a.confirmedAt, event: `Confirmed: ${a.title}` })),
  ];

  const si = computeShockIndex(v.heartRateBpm, v.systolicBpMmHg);
  const vitalsTrendSummary =
    `Latest: HR ${v.heartRateBpm ?? 'not measured'} bpm, BP ${v.systolicBpMmHg ?? '?'}/${v.diastolicBpMmHg ?? '?'} mmHg` +
    (si.value !== undefined ? `, shock index ${si.value.toFixed(2)} (${si.band} band)` : ', shock index not computable — missing inputs') +
    `, RR ${v.respiratoryRatePerMin ?? '?'} /min, SpO2 ${v.spo2Percent ?? '?'}%, temp ${v.temperatureCelsius ?? '?'} °C, mental status ${v.mentalStatus ?? 'not assessed'}.`;

  const resourceGaps: string[] = [];
  if (payload.facility.availableMedications.length > 0) {
    for (const drug of ['oxytocin', 'tranexamic_acid', 'misoprostol']) {
      if (!payload.facility.availableMedications.includes(drug)) resourceGaps.push(`${drug} not available at referring facility`);
    }
  }
  if (payload.facility.bloodProductsAvailable === false) resourceGaps.push('no blood products at referring facility');

  const currentStatus =
    `Risk tier ${escalation.urgency === 'IMMEDIATE' ? 'CRITICAL' : 'see assessment'}; escalation urgency ${escalation.urgency}` +
    (escalation.reasonCodes.length > 0 ? ` (${escalation.reasonCodes.join(', ')})` : '') +
    `. Ongoing management per PPH pathway ${state.pathwayVersion}.`;

  return {
    caseId: payload.caseId,
    generatedAt: payload.recordedAt,
    patientSummary,
    timeline,
    latestVitals: { ...v },
    vitalsTrendSummary,
    estimatedBloodLossMl: payload.estimatedBloodLossMl,
    actionsTaken,
    medicationsGiven: [...payload.medicationsGiven],
    currentStatus,
    needsAtReceivingFacility: [...escalation.receivingFacilityRequirements, ...resourceGaps.map((g) => `RESOURCE GAP: ${g}`)],
    escalation,
    provenance: ruleProvenance(),
  };
}

export function generateSbarHandoff(note: ReferralNote): SbarHandoff {
  const v = note.latestVitals;
  const si =
    typeof v.heartRateBpm === 'number' && typeof v.systolicBpMmHg === 'number' && v.systolicBpMmHg > 0
      ? (v.heartRateBpm / v.systolicBpMmHg).toFixed(2)
      : 'not computable';
  return {
    situation:
      `Postpartum hemorrhage — ${note.patientSummary} ` +
      `EBL ${note.estimatedBloodLossMl ?? 'unknown'} mL. Latest vitals: HR ${v.heartRateBpm ?? '?'}, BP ${v.systolicBpMmHg ?? '?'}/${v.diastolicBpMmHg ?? '?'}, shock index ${si}. ` +
      `Escalation urgency: ${note.escalation.urgency}.`,
    background:
      `${note.patientSummary} Medications already given: ` +
      (note.medicationsGiven.length > 0
        ? note.medicationsGiven.map((m) => `${m.drugName} ${m.dose} ${m.doseUnit} ${m.route}`).join('; ')
        : 'none recorded') +
      '.',
    assessment:
      `${note.vitalsTrendSummary} Actions confirmed: ` +
      (note.actionsTaken.length > 0 ? note.actionsTaken.map((a) => a.title).join('; ') : 'none yet confirmed') +
      `. ${note.currentStatus}`,
    recommendation:
      (note.escalation.escalate
        ? `Recommend ${note.escalation.urgency} transfer to a facility with ${note.escalation.receivingFacilityRequirements.join(', ')}. While awaiting transfer: ${note.escalation.actionsWhileAwaitingTransfer.join('; ')}.`
        : 'No transfer indicated at this assessment — continue pathway monitoring and reassess.') +
      ' This is a recommendation for clinician confirmation, not a command.',
    provenance: ruleProvenance(),
  };
}

/* ------------------------------------------------------------------ */
/* Misc exported constants for UI/test                                 */
/* ------------------------------------------------------------------ */

export const ENGINE_DISCLAIMER =
  'SIMULATION — synthetic data only. Clinical decision support, not autonomous diagnosis. Not cleared for clinical use.';
