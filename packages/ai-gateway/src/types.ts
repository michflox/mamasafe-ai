/**
 * AI Gateway contracts — docs/API_CONTRACTS.md §3 (normative).
 * The generative layer re-expresses rule-derived content; it never
 * originates doses, thresholds, contraindications, or escalation decisions.
 */
import type {
  ActionItem,
  DoseCalculation,
  EscalationDecision,
  Locale,
  PathwayState,
  Provenance,
  RedFlag,
  ReferralNote,
  RiskAssessment,
  SbarHandoff,
  StructuredIntakeProposal,
  IntakePayload,
} from '@mamasafe/clinical-core';

export interface StructureIntakeRequest {
  narrative: string;
  locale: Locale;
  knownPayload?: Partial<IntakePayload>;
}
export interface StructureIntakeResult {
  proposal: StructuredIntakeProposal;
  provenance: Provenance;
}

export interface ExplainStepRequest {
  subject: { kind: 'ACTION_ITEM' | 'RED_FLAG' | 'DOSE' | 'ESCALATION'; id: string };
  ruleDerivedContent: ActionItem | RedFlag | DoseCalculation | EscalationDecision;
  audience: 'CLINICIAN' | 'TRAINEE';
  locale: Locale;
}
export interface ExplanationResult {
  explanation: string;
  preservedFacts: string[];
  provenance: Provenance;
}

export interface DraftHandoffRequest {
  referralNote: ReferralNote;
  format: 'SBAR' | 'REFERRAL_PROSE';
  locale: Locale;
}
export interface DraftHandoffResult {
  draft: SbarHandoff | { prose: string };
  preservedFacts: string[];
  provenance: Provenance;
}

export interface ProtectedToken {
  placeholder: string;
  value: string;
}
export interface TranslatePatientFacingRequest {
  text: string;
  protectedTokens: ProtectedToken[];
  targetLocale: Locale;
  domain: 'PATIENT_FACING';
}
export interface TranslatePatientFacingResult {
  translatedText: string;
  tokensPreserved: boolean;
  reviewRequired: true;
  provenance: Provenance;
}

export interface NarrateSimulationStepRequest {
  scenarioId: string;
  engineState: { assessment: RiskAssessment; state: PathwayState };
  actionsSinceLastStep: string[];
  audience: 'TRAINEE' | 'DEMO';
  locale: Locale;
}
export interface NarrateSimulationStepResult {
  narration: string;
  patientStateChanges: { metric: string; from: number | string; to: number | string }[];
  provenance: Provenance;
}

export interface AIGateway {
  structureIntake(req: StructureIntakeRequest): Promise<StructureIntakeResult>;
  explainStep(req: ExplainStepRequest): Promise<ExplanationResult>;
  draftHandoff(req: DraftHandoffRequest): Promise<DraftHandoffResult>;
  translatePatientFacing(req: TranslatePatientFacingRequest): Promise<TranslatePatientFacingResult>;
  narrateSimulationStep(req: NarrateSimulationStepRequest): Promise<NarrateSimulationStepResult>;
}

/** Optional audit hook — gateways emit AI_CALL_MADE / AI_FALLBACK_USED through it. */
export type GatewayAuditHook = (event: {
  type: 'AI_CALL_MADE' | 'AI_FALLBACK_USED';
  modelVersion: string;
  detail: string;
}) => void;

export const GEMINI_MODEL_VERSION = 'gemini-2.0-flash/prompts@0.1.0';
export const OFFLINE_TEMPLATE_VERSION = 'offline-templates@0.1.0';
