# MamaSafe AI — API Contracts

- **Document status:** v1.0 — 2026-08-11
- **Audience:** frontend and engine engineers. **This document is normative.** Type names, field names, and function signatures here are what the code implements. If implementation reality must diverge, change this document in the same commit.
- **Packages:** `@mamasafe/clinical-core` (deterministic engine), `@mamasafe/ai-gateway` (generative layer + offline fallback), `@mamasafe/audit` (safety spine).
- **Governing rules:** the engine — never the LLM — produces doses, thresholds, contraindications, escalation criteria. Every output carries provenance. Every consequential action requires human confirmation.

---

## 1. Shared Primitives

```ts
/** ISO 8601 timestamp, injected by caller (engine is pure; no hidden clocks). */
export type IsoTimestamp = string;

/** Semantic version of rule data, pathway data, prompts, or models, e.g. "pph-pathway@1.0.0". */
export type VersionStamp = string;

/** Provenance of any displayed or recorded output. REQUIRED everywhere; never optional. */
export type ProvenanceKind = 'RULE_BASED' | 'AI_GENERATED' | 'HYBRID';
export interface Provenance {
  kind: ProvenanceKind;
  /** For AI_GENERATED / HYBRID: which generator produced the language. */
  generatedBy?: 'GEMINI' | 'GEMMA_EDGE' | 'OFFLINE_TEMPLATE';
  /** Model/prompt version stamp when AI is involved, e.g. "gemini-1.5-pro/prompts@0.3.0". */
  generatorVersion?: VersionStamp;
  /** Engine rule/pathway versions in force when the underlying facts were computed. */
  rulesVersion: VersionStamp;
  pathwayVersion: VersionStamp;
}

/** A traceable clinical citation. The engine refuses to emit uncited clinical rules. */
export interface GuidelineCitation {
  organization: string;          // e.g. "WHO", "FIGO", "ACOG", "RCOG", "Nigerian FMOH"
  documentTitle: string;         // e.g. "WHO recommendations on the assessment of postpartum blood loss and use of a treatment bundle for postpartum haemorrhage"
  year: string;                  // publication/update year or version
  section: string;               // e.g. "Recommendation 2: Treatment bundle for PPH"
  lastReviewed: IsoTimestamp;    // date the clinical-content team last verified this mapping
}

/** Locales supported by the i18n scaffold. */
export type Locale = 'en' | 'pcm' | 'ha' | 'yo' | 'ig'; // pcm = Nigerian Pidgin

/** String domain: clinician-facing and patient-facing resources are NEVER mixed. */
export type StringDomain = 'CLINICIAN_FACING' | 'PATIENT_FACING';

/** Actor recorded on audit events and confirmations. */
export type ActorRole =
  | 'MIDWIFE' | 'NURSE' | 'CHEW' | 'COMMUNITY_HEALTH_OFFICER'
  | 'PHYSICIAN' | 'ANESTHESIA_PROVIDER' | 'SIMULATION_USER' | 'SYSTEM';
export interface Actor {
  id: string;              // pseudonymous local id; no real identifiers in MVP
  role: ActorRole;
}
```

---

## 2. Rule Engine Contracts — `@mamasafe/clinical-core`

### 2.1 Intake

```ts
export interface VitalSigns {
  systolicBpMmHg?: number;
  diastolicBpMmHg?: number;
  heartRateBpm?: number;
  respiratoryRatePerMin?: number;
  spo2Percent?: number;          // 0–100
  temperatureCelsius?: number;
  mentalStatus?: 'ALERT' | 'VERBAL_RESPONSE' | 'PAIN_RESPONSE' | 'UNRESPONSIVE';
}

export interface MedicationAdministration {
  drugName: string;              // canonical English drug name (never translated)
  dose: number;
  doseUnit: 'ug' | 'mg' | 'g' | 'IU' | 'mL';
  route: 'IV' | 'IM' | 'PO' | 'PR' | 'SL' | 'INFUSION';
  administeredAt?: IsoTimestamp;
}

export interface FacilityContext {
  ivAccessEstablished?: boolean;
  availableMedications: string[];        // canonical drug names available on site
  bloodProductsAvailable?: boolean;
  oxygenAvailable?: boolean;
  surgicalCapability?: boolean;
  transferOptions?: string;              // free-text clinician note, e.g. "ambulance 45 min"
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
  isSimulation: true;            // MVP hard rule: synthetic data only

  ageYears?: number;
  pregnancyStatus?: 'ANTEPARTUM' | 'INTRAPARTUM' | 'POSTPARTUM' | 'NOT_PREGNANT' | 'UNKNOWN';
  gestationalAgeWeeks?: number;
  weightKg?: number;             // required for weight-based dosing; absence -> MissingInfo
  vitals: VitalSigns;
  symptoms: string[];            // clinician-selected tokens, e.g. "ONGOING_BLEEDING"
  estimatedBloodLossMl?: number;
  uterineTone?: 'FIRM' | 'BOGGY' | 'UNKNOWN';
  urineOutputMlPerHr?: number;
  fetalHeartRateBpm?: number;    // where available / antepartum
  labValues?: { hemoglobinGL?: number; plateletsPerMicroliter?: number };
  medicationsGiven: MedicationAdministration[];
  facility: FacilityContext;
  /** Free-text narrative as entered/dictated by the clinician (source of any AI-structured fields). */
  narrative?: string;
}

/** Result of AI-structured intake, BEFORE clinician review. Never submitted directly. */
export interface StructuredIntakeProposal {
  proposedPayload: Partial<IntakePayload>;
  /** Field-by-field mapping: which narrative spans produced which fields. For clinician verification. */
  fieldDerivations: { field: keyof IntakePayload | string; sourceExcerpt: string }[];
  unmappedNarrative: string[];   // narrative fragments the structurer could not place — shown, never dropped
  provenance: Provenance;        // kind: 'AI_GENERATED'
}
```

### 2.2 Assessment

```ts
export type RiskTier = 'STABLE' | 'AT_RISK' | 'EMERGENT' | 'CRITICAL';

export interface RedFlag {
  code: string;                  // e.g. "SBP_LT_90", "EBL_GTE_1000", "SHOCK_INDEX_GTE_1"
  clinicianMessage: string;      // English clinician-facing message (i18n key in UI layer)
  severity: 'WARNING' | 'CRITICAL';
  triggeringValues: Record<string, number | string>; // e.g. { systolicBpMmHg: 88 }
  citation: GuidelineCitation;
}

export interface MissingInfo {
  field: keyof IntakePayload | string;   // e.g. "uterineTone", "weightKg", "facility.ivAccessEstablished"
  whyItMatters: string;                  // plain-language clinical rationale
  blocksActions: string[];               // action ids gated until this is known (may be empty)
}

export interface DerivedMetrics {
  shockIndex?: number;           // HR / SBP; undefined if inputs missing
  shockIndexThreshold?: number;  // configured threshold actually applied
  earlyWarningScore?: number;    // MEOWS-style aggregate
  earlyWarningBand?: 'GREEN' | 'YELLOW' | 'RED';
}

export interface RiskAssessment {
  caseId: string;
  assessedAt: IsoTimestamp;
  tier: RiskTier;
  redFlags: RedFlag[];
  missingInfo: MissingInfo[];
  derived: DerivedMetrics;
  /** Pathways the engine recommends activating, ordered by priority. */
  recommendedPathways: PathwayId[];
  provenance: Provenance;        // kind: 'RULE_BASED'
  citations: GuidelineCitation[];
}
```

### 2.3 Pathway

```ts
export type PathwayId = 'PPH' | 'PREECLAMPSIA_SEVERE' | 'ECLAMPSIA' | 'MATERNAL_SEPSIS'; // MVP implements 'PPH'

export interface ActionItem {
  actionId: string;              // stable id, e.g. "pph.uterine_massage"
  sequence: number;              // current priority order (recomputed on re-assessment)
  title: string;                 // clinician-facing
  rationale: string;
  prerequisites: string[];       // actionIds that must be CONFIRMED first
  contraindicationsChecked: string[];  // human-readable list of contraindication rules evaluated
  gatedByMissingInfo: string[];  // MissingInfo.field values blocking this action
  status: 'PENDING' | 'CONFIRMED' | 'DEFERRED' | 'OVERRIDDEN' | 'NOT_APPLICABLE';
  confirmation?: ActionConfirmation;
  citation: GuidelineCitation;
  provenance: Provenance;        // kind: 'RULE_BASED'
}

export interface ActionConfirmation {
  confirmedBy: Actor;
  confirmedAt: IsoTimestamp;
  decision: 'CONFIRMED' | 'DEFERRED' | 'OVERRIDDEN';
  overrideReason?: string;       // REQUIRED when decision === 'OVERRIDDEN'
}

export interface PathwayState {
  caseId: string;
  pathwayId: PathwayId;
  pathwayVersion: VersionStamp;
  startedAt: IsoTimestamp;
  lastReassessedAt: IsoTimestamp;
  phase: string;                 // pathway-defined phase, e.g. "INITIAL_RESPONSE" | "ESCALATION" | "POST_STABILIZATION"
  actions: ActionItem[];         // current ordered checklist
  completedActionIds: string[];
  provenance: Provenance;        // kind: 'RULE_BASED'
}
```

### 2.4 Calculations

```ts
export interface DoseCalculation {
  calculationId: string;
  drugName: string;              // canonical; never translated
  indication: string;
  inputs: Record<string, number | string>;   // e.g. { weightKg: 62 }
  formula: string;               // human-readable formula, e.g. "TXA 1 g IV over 10 min; fixed dose (not weight-based)"
  result: {
    dose: number;
    doseUnit: 'ug' | 'mg' | 'g' | 'IU' | 'mL';
    route: MedicationAdministration['route'];
    administrationNote?: string; // e.g. "repeat once after 30 min if bleeding continues"
    maxCumulativeDose?: { dose: number; doseUnit: string };
  };
  contraindications: { rule: string; triggered: boolean; detail?: string }[];
  warnings: string[];            // e.g. "ergometrine withheld: hypertensive context"
  requiresWeight: boolean;
  weightAvailable: boolean;      // false -> result is a range/default WITH warning, never silent assumption
  citation: GuidelineCitation;
  provenance: Provenance;        // kind: 'RULE_BASED'
}

export interface FluidGuidance {
  crystalloid: { suggestedBolusMl: number; note: string; citation: GuidelineCitation };
  bloodProductPrompt: { indicated: boolean; reasonCodes: string[]; note: string };
  provenance: Provenance;        // kind: 'RULE_BASED'
}
```

### 2.5 Escalation & Referral

```ts
export interface EscalationDecision {
  caseId: string;
  decidedAt: IsoTimestamp;
  urgency: 'ROUTINE' | 'URGENT' | 'IMMEDIATE';
  escalate: boolean;             // fail-safe: ambiguous data -> true, never false
  reasonCodes: string[];         // e.g. ["SHOCK_INDEX_GTE_1", "EBL_GTE_1000", "NO_IV_ACCESS"]
  actionsWhileAwaitingTransfer: string[];
  receivingFacilityRequirements: string[]; // e.g. ["SURGICAL_CAPABILITY", "BLOOD_PRODUCTS"]
  provenance: Provenance;        // kind: 'RULE_BASED'
  citations: GuidelineCitation[];
}

export interface ReferralNote {
  caseId: string;
  generatedAt: IsoTimestamp;
  patientSummary: string;        // age/GA/context, deidentified
  timeline: { at: IsoTimestamp; event: string }[];
  latestVitals: VitalSigns;
  vitalsTrendSummary: string;
  estimatedBloodLossMl?: number;
  actionsTaken: { actionId: string; title: string; confirmedAt: IsoTimestamp }[];
  medicationsGiven: MedicationAdministration[];
  currentStatus: string;
  needsAtReceivingFacility: string[];
  escalation: EscalationDecision;
  provenance: Provenance;        // kind: 'HYBRID' when AI formats language, else 'RULE_BASED'
}

export interface SbarHandoff {
  situation: string;
  background: string;
  assessment: string;
  recommendation: string;
  provenance: Provenance;        // kind: 'HYBRID' or 'RULE_BASED' (offline template)
}
```

### 2.6 Audit

```ts
export type AuditEventType =
  | 'INTAKE_SUBMITTED' | 'RISK_ASSESSED' | 'PATHWAY_STARTED'
  | 'ACTION_CONFIRMED' | 'ACTION_OVERRIDDEN' | 'DOSE_CONFIRMED'
  | 'ESCALATION_TRIGGERED' | 'REFERRAL_NOTE_GENERATED' | 'HANDOFF_GENERATED'
  | 'AI_CALL_MADE' | 'AI_FALLBACK_USED' | 'SIMULATION_STARTED' | 'SIMULATION_STATE_CHANGED'
  | 'SYNC_COMPLETED';

export interface AuditEvent {
  eventId: string;               // uuid
  caseId: string;
  type: AuditEventType;
  at: IsoTimestamp;
  actor: Actor;
  /** Payload summary (never real patient identifiers; MVP is synthetic-only by construction). */
  payloadSummary: Record<string, unknown>;
  rulesVersion: VersionStamp;
  pathwayVersion: VersionStamp;
  modelVersion?: VersionStamp;   // present on AI_CALL_MADE / AI_FALLBACK_USED
  previousEventHash: string;     // SHA-256 of prior event's canonical serialization; genesis = "GENESIS"
  eventHash: string;             // SHA-256 of this event including previousEventHash
}
```

### 2.7 Engine Function Signatures

```ts
// @mamasafe/clinical-core — all pure, all synchronous, all deterministic.

export function assessIntake(payload: IntakePayload): RiskAssessment;
export function initPathway(assessment: RiskAssessment, pathwayId: PathwayId): PathwayState;
export function reassess(state: PathwayState, payload: IntakePayload): { assessment: RiskAssessment; state: PathwayState };
export function confirmAction(state: PathwayState, actionId: string, confirmation: ActionConfirmation): PathwayState;
export function computeDoses(payload: IntakePayload, pathwayId: PathwayId): DoseCalculation[];
export function computeFluidGuidance(payload: IntakePayload, assessment: RiskAssessment): FluidGuidance;
export function evaluateEscalation(payload: IntakePayload, assessment: RiskAssessment, state: PathwayState): EscalationDecision;
export function generateReferralNote(payload: IntakePayload, state: PathwayState, escalation: EscalationDecision): ReferralNote;
export function generateSbarHandoff(note: ReferralNote): SbarHandoff; // deterministic offline-template baseline

// @mamasafe/audit
export function appendAuditEvent(
  log: readonly AuditEvent[],
  event: Omit<AuditEvent, 'eventId' | 'previousEventHash' | 'eventHash'>
): AuditEvent;                 // returns the new event; full log = [...log, returned]
export function verifyAuditChain(log: readonly AuditEvent[]): { valid: boolean; firstInvalidEventId?: string };
```

**Error contract:** engine functions never throw on clinical ambiguity; they encode it in output (`missingInfo`, `escalate: true`, `warnings`). They throw `ClinicalRuleError` only on malformed input (wrong units, out-of-range primitives) or uncited rule data — i.e., programmer/configuration errors, which are test failures, not runtime clinical events.

---

## 3. AI Gateway Contracts — `@mamasafe/ai-gateway`

One interface, three adapters (`GeminiGateway`, `OfflineFallbackGateway`, future `GemmaEdgeGateway`). **The offline fallback implements the same interface and satisfies the same contracts** — the rest of the system cannot tell which adapter answered except via `provenance.generatedBy`.

```ts
export interface AIGateway {
  structureIntake(req: StructureIntakeRequest): Promise<StructureIntakeResult>;
  explainStep(req: ExplainStepRequest): Promise<ExplanationResult>;
  draftHandoff(req: DraftHandoffRequest): Promise<DraftHandoffResult>;
  translatePatientFacing(req: TranslatePatientFacingRequest): Promise<TranslatePatientFacingResult>;
  narrateSimulationStep(req: NarrateSimulationStepRequest): Promise<NarrateSimulationStepResult>;
}
```

### 3.1 structureIntake — narrative → structured intake proposal

```ts
export interface StructureIntakeRequest {
  narrative: string;             // clinician free text (voice transcripts are post-MVP)
  locale: Locale;                // language OF THE NARRATIVE
  knownPayload?: Partial<IntakePayload>; // fields already entered manually; AI must not overwrite them
}
export interface StructureIntakeResult {
  proposal: StructuredIntakeProposal;    // ALWAYS requires clinician review before submission
  provenance: Provenance;                // kind 'AI_GENERATED'
}
/** Contract: output is a PROPOSAL. The UI must render fieldDerivations and unmappedNarrative.
 *  The clinician submits the reviewed IntakePayload; the raw proposal is never passed to the engine. */
```

### 3.2 explainStep — explain a rule-derived action/decision

```ts
export interface ExplainStepRequest {
  subject: { kind: 'ACTION_ITEM' | 'RED_FLAG' | 'DOSE' | 'ESCALATION'; id: string };
  /** The rule-engine object being explained — the ONLY source of clinical fact. */
  ruleDerivedContent: ActionItem | RedFlag | DoseCalculation | EscalationDecision;
  audience: 'CLINICIAN' | 'TRAINEE';
  locale: Locale;
}
export interface ExplanationResult {
  explanation: string;           // re-expression ONLY; must not add clinical facts, numbers, or advice
  preservedFacts: string[];      // the exact fact strings (doses, thresholds) required to appear verbatim
  provenance: Provenance;        // kind 'HYBRID'
}
/** Contract: gateway validates post-hoc that every preservedFacts string appears verbatim in
 *  explanation. If validation fails, the gateway returns the offline-template explanation instead
 *  and emits an AI_FALLBACK_USED audit event. */
```

### 3.3 draftHandoff — SBAR / referral language formatting

```ts
export interface DraftHandoffRequest {
  referralNote: ReferralNote;    // rule-derived facts; AI formats language only
  format: 'SBAR' | 'REFERRAL_PROSE';
  locale: Locale;
}
export interface DraftHandoffResult {
  draft: SbarHandoff | { prose: string };
  preservedFacts: string[];      // same verbatim-preservation contract as explainStep
  provenance: Provenance;        // kind 'HYBRID'
}
```

### 3.4 translatePatientFacing — protected-token translation

```ts
export interface ProtectedToken {
  placeholder: string;           // e.g. "{{DRUG_1}}", "{{DOSE_1}}"
  value: string;                 // e.g. "tranexamic acid", "1 g IV"
}
export interface TranslatePatientFacingRequest {
  text: string;                  // patient-facing source text with placeholders already substituted in
  protectedTokens: ProtectedToken[];
  targetLocale: Locale;          // 'pcm' | 'ha' | 'yo' | 'ig' | 'en'
  domain: 'PATIENT_FACING';      // literal — clinician-facing strings are not machine-translated in MVP
}
export interface TranslatePatientFacingResult {
  translatedText: string;
  tokensPreserved: boolean;      // gateway MUST verify every ProtectedToken.value appears verbatim
  reviewRequired: true;          // machine translation is always a draft pending human review (PRD FR-I18N-4)
  provenance: Provenance;        // kind 'AI_GENERATED'
}
/** Contract: medication names, concentrations, doses, units, and thresholds are NEVER translated.
 *  If tokensPreserved would be false, the gateway returns the source text and sets
 *  tokensPreserved=false; the UI shows English with an "untranslated" badge rather than a
 *  corrupted translation. */
```

### 3.5 narrateSimulationStep — simulation narration (synthetic data only)

```ts
export interface NarrateSimulationStepRequest {
  scenarioId: string;            // e.g. "sim.pph.29yo.canonical"
  engineState: { assessment: RiskAssessment; state: PathwayState };
  actionsSinceLastStep: string[];
  audience: 'TRAINEE' | 'DEMO';
  locale: Locale;
}
export interface NarrateSimulationStepResult {
  narration: string;             // dramatic but fact-bound; no invented physiology beyond scenario script
  patientStateChanges: { metric: string; from: number | string; to: number | string }[];
  provenance: Provenance;        // kind 'AI_GENERATED'
}
/** Contract: narration may only describe state changes present in patientStateChanges or the
 *  scenario script. The scenario's clinical content remains engine-derived. */
```

### 3.6 Offline-fallback contract (mandatory)

`OfflineFallbackGateway` MUST satisfy every method above with **zero network access**:

| Method | Offline behavior |
|---|---|
| `structureIntake` | Returns an empty `proposal` with the full narrative in `unmappedNarrative`; UI falls back to the structured form. `provenance.generatedBy = 'OFFLINE_TEMPLATE'`. |
| `explainStep` | Renders a deterministic template: action title, rationale, citation, prerequisites — assembled from the rule object itself. |
| `draftHandoff` | Calls `generateSbarHandoff` / referral-note serialization from the engine (RULE_BASED formatting templates). |
| `translatePatientFacing` | Returns source text with `tokensPreserved: true`, `reviewRequired: true`, and an "English shown — translation unavailable offline" badge signal. |
| `narrateSimulationStep` | Deterministic narration template from `patientStateChanges`. |

**Adapter selection:** the app calls `createAIGateway({ online, apiKey })`, which returns `GeminiGateway` only when connectivity AND a key are present, otherwise `OfflineFallbackGateway`. Selection (and any mid-session fallback) emits `AI_CALL_MADE` / `AI_FALLBACK_USED` audit events with `modelVersion`.

---

## 4. Frontend ↔ Engine Integration Notes (normative)

1. The UI **never** constructs clinical values; it renders engine output. Calculations displayed to the user come only from `DoseCalculation` / `FluidGuidance` objects.
2. Every screen region showing clinical content receives its `Provenance` and renders the RULE-BASED / AI-GENERATED badge from it.
3. `ActionConfirmation` with `decision: 'OVERRIDDEN'` and no `overrideReason` is invalid; the UI must require the reason before submission.
4. Timestamps come from the UI/clock layer and are injected into engine calls; the engine stays pure and replayable.
5. Audit append happens on the same user gesture as the action it records (one tap → state transition + audit event).

---

*Contract version: contracts@1.0.0. Breaking changes require bumping this version and updating `docs/BUILD_STATUS.md`.*
