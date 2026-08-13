/**
 * Adapter: synthetic/adversarial case-file input shape (data/*.json) →
 * contract IntakePayload. Lives in the engine package so the vitest oracles
 * and the web demo share ONE mapping. Pure; throws ClinicalRuleError only on
 * structurally unusable dose strings (gate G9 is enforced downstream too).
 */
import { ClinicalRuleError } from './errors.js';
import type { Actor, IntakePayload, MedicationAdministration, VitalSigns } from './types.js';

export interface CaseFileInput {
  patient?: {
    age_years?: number | null;
    parity?: number | null;
    gestational_age_weeks?: number | null;
    postpartum?: boolean;
    mode_of_birth?: 'vaginal' | 'cesarean';
    minutes_since_birth?: number | null;
    weight_kg?: number | null;
  };
  vitals?: {
    heart_rate_bpm?: number | null;
    systolic_bp_mmHg?: number | null;
    diastolic_bp_mmHg?: number | null;
    respiratory_rate_per_min?: number | null;
    spo2_percent?: number | null;
    temperature_celsius?: number | null;
    mental_status?: string | null;
  };
  bleeding?: {
    ongoing?: boolean;
    estimated_blood_loss_ml?: number | null;
    bleeding_character?: string;
    uterine_tone?: string | null;
    placenta_delivered?: boolean;
    placenta_appears_complete?: boolean;
    visible_lacerations?: string | null;
  };
  obstetric_history?: {
    hypertensive_disorder?: boolean | null;
    asthma?: boolean | null;
    previous_pph?: boolean | null;
    anticoagulants?: boolean | null;
  };
  medications_already_given?: {
    medication: string;
    dose: string;
    route: string;
    minutes_ago?: number;
    context?: string;
  }[];
  resources?: {
    iv_access?: { type?: string; gauge?: number; site?: string; patent?: boolean }[];
    medications_available?: string[];
    medications_unavailable?: string[];
    blood_products_available?: boolean;
    nasg_available?: boolean;
    balloon_tamponade_kit_available?: boolean;
    facility_tier?: string;
    referral_minutes_away?: number | null;
    referral_facility_capability?: string;
  };
  requested_output_language?: string;
  free_text_intake?: string;
}

const num = (x: number | null | undefined): number | undefined =>
  typeof x === 'number' && Number.isFinite(x) ? x : undefined;

function mapMentalStatus(raw: string | null | undefined): VitalSigns['mentalStatus'] | undefined {
  if (!raw) return undefined;
  const s = raw.toLowerCase();
  if (/unresponsive/.test(s)) return 'UNRESPONSIVE';
  if (/pain/.test(s)) return 'PAIN_RESPONSE';
  if (/voice|drowsy|weak|dizzy|letharg|confus/.test(s)) return 'VERBAL_RESPONSE';
  if (/alert|anxious/.test(s)) return 'ALERT';
  return 'VERBAL_RESPONSE'; // fail toward higher acuity on unrecognized descriptions
}

function mapUterineTone(raw: string | null | undefined): IntakePayload['uterineTone'] {
  if (!raw) return undefined;
  const s = raw.toLowerCase();
  if (/boggy|soft|aton/.test(s)) return 'BOGGY';
  if (/firm|contracted/.test(s)) return 'FIRM';
  return 'UNKNOWN';
}

const ROUTE_MAP: Record<string, MedicationAdministration['route']> = {
  im: 'IM',
  iv: 'IV',
  'iv slow': 'IV',
  oral: 'PO',
  po: 'PO',
  sl: 'SL',
  sublingual: 'SL',
  pr: 'PR',
  infusion: 'INFUSION',
  'iv infusion': 'INFUSION',
};

/** Parse a display dose string like "10 IU", "600 µg", "1 g" (gate G9 hygiene). */
export function parseDoseString(dose: string): { dose: number; doseUnit: MedicationAdministration['doseUnit'] } {
  const m = dose.trim().match(/^(\d+(?:\.\d+)?)\s*(µg|mcg|ug|mg|g|iu|ml)\.?$/i);
  if (!m) {
    throw new ClinicalRuleError('UNIT_HYGIENE', `unparseable or unit-free dose string in case data: "${dose}"`);
  }
  const unitRaw = m[2].toLowerCase();
  const doseUnit: MedicationAdministration['doseUnit'] =
    unitRaw === 'µg' || unitRaw === 'mcg' || unitRaw === 'ug'
      ? 'ug'
      : unitRaw === 'iu'
        ? 'IU'
        : unitRaw === 'ml'
          ? 'mL'
          : (unitRaw as 'mg' | 'g');
  return { dose: Number(m[1]), doseUnit };
}

export function mapCaseInputToIntake(
  caseId: string,
  input: CaseFileInput,
  recordedAt: string,
  recordedBy: Actor,
): IntakePayload {
  const p = input.patient ?? {};
  const vit = input.vitals ?? {};
  const bleed = input.bleeding ?? {};
  const res = input.resources ?? {};
  const hist = input.obstetric_history ?? {};

  const symptoms: string[] = [];
  if (bleed.ongoing) symptoms.push('ONGOING_BLEEDING');
  const mental = (vit.mental_status ?? '').toLowerCase();
  if (/weak|dizzy/.test(mental)) symptoms.push('WEAKNESS_DIZZINESS');
  if (/pale|clammy|sweat/.test(mental)) symptoms.push('HYPOVOLEMIA_SIGNS');

  const medicationsGiven: MedicationAdministration[] = (input.medications_already_given ?? []).map((m) => {
    const { dose, doseUnit } = parseDoseString(m.dose);
    const route = ROUTE_MAP[m.route.toLowerCase()];
    if (!route) {
      throw new ClinicalRuleError('UNIT_HYGIENE', `unknown route in case data: "${m.route}"`);
    }
    return { drugName: m.medication, dose, doseUnit, route };
  });

  const ivLines = (res.iv_access ?? []).filter((l) => l.patent !== false);
  const tier = res.facility_tier;

  return {
    caseId,
    recordedAt,
    recordedBy,
    isSimulation: true,
    ageYears: num(p.age_years),
    pregnancyStatus: p.postpartum === false ? 'NOT_PREGNANT' : 'POSTPARTUM',
    gestationalAgeWeeks: num(p.gestational_age_weeks),
    weightKg: num(p.weight_kg),
    vitals: {
      heartRateBpm: num(vit.heart_rate_bpm),
      systolicBpMmHg: num(vit.systolic_bp_mmHg),
      diastolicBpMmHg: num(vit.diastolic_bp_mmHg),
      respiratoryRatePerMin: num(vit.respiratory_rate_per_min),
      spo2Percent: num(vit.spo2_percent),
      temperatureCelsius: num(vit.temperature_celsius),
      mentalStatus: mapMentalStatus(vit.mental_status),
    },
    symptoms,
    estimatedBloodLossMl: num(bleed.estimated_blood_loss_ml),
    uterineTone: mapUterineTone(bleed.uterine_tone),
    medicationsGiven,
    facility: {
      ivAccessEstablished: res.iv_access ? ivLines.length > 0 : undefined,
      availableMedications: res.medications_available ?? [],
      bloodProductsAvailable: res.blood_products_available,
      surgicalCapability: tier === 'secondary_hospital' ? true : tier ? false : undefined,
      transferOptions:
        typeof res.referral_minutes_away === 'number'
          ? `referral ~${res.referral_minutes_away} min (${res.referral_facility_capability ?? 'capability unknown'})`
          : undefined,
    },
    narrative: input.free_text_intake,
    clinicalContext: {
      minutesSinceBirth: p.minutes_since_birth === undefined ? undefined : p.minutes_since_birth,
      modeOfBirth: p.mode_of_birth ?? 'vaginal',
      obstetricHistory: {
        hypertensiveDisorder: hist.hypertensive_disorder ?? null,
        asthma: hist.asthma ?? null,
        previousPph: hist.previous_pph ?? null,
        anticoagulants: hist.anticoagulants ?? null,
      },
      genitalTraumaAssessed:
        bleed.visible_lacerations == null
          ? undefined
          : !/not yet inspected|not inspected/i.test(bleed.visible_lacerations),
      placentaAppearsComplete: bleed.placenta_appears_complete,
      ivAccessCount: res.iv_access ? ivLines.length : undefined,
      referralMinutesAway: res.referral_minutes_away ?? null,
    },
  };
}
