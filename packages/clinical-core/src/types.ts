/**
 * MamaSafe AI — shared primitives & rule-engine contracts.
 * NORMATIVE: mirrors docs/API_CONTRACTS.md v1.0 exactly.
 *
 * Additive extension (documented in docs/BUILD_STATUS.md): `IntakePayload`
 * gains ONE optional field, `clinicalContext`, to carry facts the PPH gates
 * require but the v1 contract did not model (time since birth for the TXA
 * 3-hour window, obstetric history for the ergometrine/carboprost gates).
 * No contract field was renamed, removed, or retyped.
 */

/** ISO 8601 timestamp, injected by caller (engine is pure; no hidden clocks). */
export type IsoTimestamp = string;

/** Semantic version of rule data, pathway data, prompts, or models, e.g. "pph-pathway@1.0.0". */
export type VersionStamp = string;

/** Provenance of any displayed or recorded output. REQUIRED everywhere; never optional. */
export type ProvenanceKind = 'RULE_BASED' | 'AI_GENERATED' | 'HYBRID';
export interface Provenance {
  kind: ProvenanceKind;
  generatedBy?: 'GEMINI' | 'GEMMA_EDGE' | 'OFFLINE_TEMPLATE';
  generatorVersion?: VersionStamp;
  rulesVersion: VersionStamp;
  pathwayVersion: VersionStamp;
}

/** A traceable clinical citation. The engine refuses to emit uncited clinical rules. */
export interface GuidelineCitation {
  organization: string;
  documentTitle: string;
  year: string;
  section: string;
  lastReviewed: IsoTimestamp;
}

/** Locales supported by the i18n scaffold. */
export type Locale = 'en' | 'pcm' | 'ha' | 'yo' | 'ig';

/** String domain: clinician-facing and patient-facing resources are NEVER mixed. */
export type StringDomain = 'CLINICIAN_FACING' | 'PATIENT_FACING';

/** Actor recorded on audit events and confirmations. */
export type ActorRole =
  | 'MIDWIFE' | 'NURSE' | 'CHEW' | 'COMMUNITY_HEALTH_OFFICER'
  | 'PHYSICIAN' | 'ANESTHESIA_PROVIDER' | 'SIMULATION_USER' | 'SYSTEM';
export interface Actor {
  id: string;
  role: ActorRole;
}

/* ------------------------------------------------------------------ */
/* 2.1 Intake                                                          */
/* ------------------------------------------------------------------ */

export interface VitalSigns {
  systolicBpMmHg?: number;
  diastolicBpMmHg?: number;
  heartRateBpm?: number;
  respiratoryRatePerMin?: number;
  spo2Percent?: number;
  temperatureCelsius?: number;
  mentalStatus?: 'ALERT' | 'VERBAL_RESPONSE' | 'PAIN_RESPONSE' | 'UNRESPONSIVE';
}

export interface MedicationAdministration {
  drugName: string;
  dose: number;
  doseUnit: 'ug' | 'mg' | 'g' | 'IU' | 'mL';
  route: 'IV' | 'IM' | 'PO' | 'PR' | 'SL' | 'INFUSION';
  administeredAt?: IsoTimestamp;
}

export interface FacilityContext {
  ivAccessEstablished?: boolean;
  availableMedications: string[];
  bloodProductsAvailable?: boolean;
  oxygenAvailable?: boolean;
  surgicalCapability?: boolean;
  transferOptions?: string;
}

/**
 * Additive extension context (NOT in contracts v1.0 — see header note).
 * All fields optional; absence is surfaced via MissingInfo, never imputed.
 */
export interface ClinicalContextExtension {
  /** Minutes elapsed since birth; feeds TXA 3-hour window (gate G2). */
  minutesSinceBirth?: number | null;
  /** Mode of birth; selects blood-loss band cutoffs (500 mL vaginal / 1000 mL cesarean). */
  modeOfBirth?: 'vaginal' | 'cesarean';
  /** Obstetric history flags feeding contraindication gates G4/G5/G6. */
  obstetricHistory?: {
    hypertensiveDisorder?: boolean | null;
    asthma?: boolean | null;
    previousPph?: boolean | null;
    anticoagulants?: boolean | null;
  };
  /** Whether genital-tract trauma inspection has been performed (4T Trauma). */
  genitalTraumaAssessed?: boolean;
  /** Whether the placenta appears complete (4T Tissue). */
  placentaAppearsComplete?: boolean;
  /** Number of patent IV lines currently established. */
  ivAccessCount?: number;
  /** Estimated transport time to referral facility, minutes. */
  referralMinutesAway?: number | null;
}

/**
 * Full intake for a maternal emergency case. All fields optional EXCEPT
 * caseId and recordedAt — the workflow must start from partial data;
 * absence is surfaced via MissingInfo, never by blocking.
 */
export interface IntakePayload {
  caseId: string;
  recordedAt: IsoTimestamp;
  recordedBy: Actor;
  isSimulation: true;

  ageYears?: number;
  pregnancyStatus?: 'ANTEPARTUM' | 'INTRAPARTUM' | 'POSTPARTUM' | 'NOT_PREGNANT' | 'UNKNOWN';
  gestationalAgeWeeks?: number;
  weightKg?: number;
  vitals: VitalSigns;
  symptoms: string[];
  estimatedBloodLossMl?: number;
  uterineTone?: 'FIRM' | 'BOGGY' | 'UNKNOWN';
  urineOutputMlPerHr?: number;
  fetalHeartRateBpm?: number;
  labValues?: { hemoglobinGL?: number; plateletsPerMicroliter?: number };
  medicationsGiven: MedicationAdministration[];
  facility: FacilityContext;
  narrative?: string;

  /** ADDITIVE extension — see ClinicalContextExtension docs. */
  clinicalContext?: ClinicalContextExtension;
}

/** Result of AI-structured intake, BEFORE clinician review. Never submitted directly. */
export interface StructuredIntakeProposal {
  proposedPayload: Partial<IntakePayload>;
  fieldDerivations: { field: keyof IntakePayload | string; sourceExcerpt: string }[];
  unmappedNarrative: string[];
  provenance: Provenance;
}

/* ------------------------------------------------------------------ */
/* 2.2 Assessment                                                      */
/* ------------------------------------------------------------------ */

export type RiskTier = 'STABLE' | 'AT_RISK' | 'EMERGENT' | 'CRITICAL';

export interface RedFlag {
  code: string;
  clinicianMessage: string;
  severity: 'WARNING' | 'CRITICAL';
  triggeringValues: Record<string, number | string>;
  citation: GuidelineCitation;
}

export interface MissingInfo {
  field: keyof IntakePayload | string;
  whyItMatters: string;
  blocksActions: string[];
}

export interface DerivedMetrics {
  shockIndex?: number;
  shockIndexThreshold?: number;
  earlyWarningScore?: number;
  earlyWarningBand?: 'GREEN' | 'YELLOW' | 'RED';
}

export interface RiskAssessment {
  caseId: string;
  assessedAt: IsoTimestamp;
  tier: RiskTier;
  redFlags: RedFlag[];
  missingInfo: MissingInfo[];
  derived: DerivedMetrics;
  recommendedPathways: PathwayId[];
  provenance: Provenance;
  citations: GuidelineCitation[];
}

/* ------------------------------------------------------------------ */
/* 2.3 Pathway                                                         */
/* ------------------------------------------------------------------ */

export type PathwayId = 'PPH' | 'PREECLAMPSIA_SEVERE' | 'ECLAMPSIA' | 'MATERNAL_SEPSIS';

export interface ActionItem {
  actionId: string;
  sequence: number;
  title: string;
  rationale: string;
  prerequisites: string[];
  contraindicationsChecked: string[];
  gatedByMissingInfo: string[];
  status: 'PENDING' | 'CONFIRMED' | 'DEFERRED' | 'OVERRIDDEN' | 'NOT_APPLICABLE';
  confirmation?: ActionConfirmation;
  citation: GuidelineCitation;
  provenance: Provenance;
}

export interface ActionConfirmation {
  confirmedBy: Actor;
  confirmedAt: IsoTimestamp;
  decision: 'CONFIRMED' | 'DEFERRED' | 'OVERRIDDEN';
  overrideReason?: string;
}

export interface PathwayState {
  caseId: string;
  pathwayId: PathwayId;
  pathwayVersion: VersionStamp;
  startedAt: IsoTimestamp;
  lastReassessedAt: IsoTimestamp;
  phase: string;
  actions: ActionItem[];
  completedActionIds: string[];
  provenance: Provenance;
}

/* ------------------------------------------------------------------ */
/* 2.4 Calculations                                                    */
/* ------------------------------------------------------------------ */

export interface DoseCalculation {
  calculationId: string;
  drugName: string;
  indication: string;
  inputs: Record<string, number | string>;
  formula: string;
  result: {
    dose: number;
    doseUnit: 'ug' | 'mg' | 'g' | 'IU' | 'mL';
    route: MedicationAdministration['route'];
    administrationNote?: string;
    maxCumulativeDose?: { dose: number; doseUnit: string };
  };
  contraindications: { rule: string; triggered: boolean; detail?: string }[];
  warnings: string[];
  requiresWeight: boolean;
  weightAvailable: boolean;
  citation: GuidelineCitation;
  provenance: Provenance;
}

export interface FluidGuidance {
  crystalloid: { suggestedBolusMl: number; note: string; citation: GuidelineCitation };
  bloodProductPrompt: { indicated: boolean; reasonCodes: string[]; note: string };
  provenance: Provenance;
}

/* ------------------------------------------------------------------ */
/* 2.5 Escalation & Referral                                           */
/* ------------------------------------------------------------------ */

export interface EscalationDecision {
  caseId: string;
  decidedAt: IsoTimestamp;
  urgency: 'ROUTINE' | 'URGENT' | 'IMMEDIATE';
  escalate: boolean;
  reasonCodes: string[];
  actionsWhileAwaitingTransfer: string[];
  receivingFacilityRequirements: string[];
  provenance: Provenance;
  citations: GuidelineCitation[];
}

export interface ReferralNote {
  caseId: string;
  generatedAt: IsoTimestamp;
  patientSummary: string;
  timeline: { at: IsoTimestamp; event: string }[];
  latestVitals: VitalSigns;
  vitalsTrendSummary: string;
  estimatedBloodLossMl?: number;
  actionsTaken: { actionId: string; title: string; confirmedAt: IsoTimestamp }[];
  medicationsGiven: MedicationAdministration[];
  currentStatus: string;
  needsAtReceivingFacility: string[];
  escalation: EscalationDecision;
  provenance: Provenance;
}

export interface SbarHandoff {
  situation: string;
  background: string;
  assessment: string;
  recommendation: string;
  provenance: Provenance;
}
