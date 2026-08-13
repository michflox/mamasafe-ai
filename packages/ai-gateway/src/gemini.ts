/**
 * GeminiGateway — live Gemini adapter (@google/genai).
 *
 * Safety architecture:
 *  - API key comes from the caller (environment), never hard-coded.
 *  - System prompts constrain the model to language/explanation/documentation.
 *  - Post-validation of preservedFacts: if any rule-derived fact string is
 *    corrupted or missing from the model output, the gateway auto-falls back
 *    to the deterministic offline template and emits AI_FALLBACK_USED.
 *  - Any transport error also falls back (fail-safe degradation, SAFETY.md §5).
 *
 * Testability: a `transport` function can be injected so the validation
 * contract is tested without a live API key or network.
 */
import type { Provenance } from '@mamasafe/clinical-core';
import {
  extractPreservedFacts,
  OfflineFallbackGateway,
  templateExplain,
  verifyPreservedFacts,
} from './offlineFallback.js';
import {
  GEMINI_MODEL_VERSION,
  OFFLINE_TEMPLATE_VERSION,
  type AIGateway,
  type DraftHandoffRequest,
  type DraftHandoffResult,
  type ExplainStepRequest,
  type ExplanationResult,
  type GatewayAuditHook,
  type NarrateSimulationStepRequest,
  type NarrateSimulationStepResult,
  type StructureIntakeRequest,
  type StructureIntakeResult,
  type TranslatePatientFacingRequest,
  type TranslatePatientFacingResult,
} from './types.js';

export type GeminiTransport = (prompt: string, systemInstruction: string) => Promise<string>;

async function defaultTransportFactory(apiKey: string, model: string): Promise<GeminiTransport> {
  const { GoogleGenAI } = await import('@google/genai');
  const client = new GoogleGenAI({ apiKey });
  return async (prompt, systemInstruction) => {
    const response = await client.models.generateContent({
      model,
      contents: prompt,
      config: { systemInstruction, temperature: 0.2 },
    });
    return response.text ?? '';
  };
}

const SYSTEM_LANGUAGE_ONLY =
  'You are the language layer of a clinical decision-support system for maternal emergencies. ' +
  'You ONLY re-express, explain, translate, or format the rule-derived clinical content provided to you. ' +
  'You must NEVER invent, alter, round, omit, or add any clinical fact, number, dose, unit, threshold, ' +
  'drug name, contraindication, or guideline citation. ' +
  'Medication names, doses, concentrations, units, and numeric thresholds must appear byte-identical to the source. ' +
  'If you cannot preserve every required fact verbatim, output the source text unchanged.';

function geminiProvenance(kind: Provenance['kind']): Provenance {
  return {
    kind,
    generatedBy: 'GEMINI',
    generatorVersion: GEMINI_MODEL_VERSION,
    rulesVersion: 'clinical-rules@1.0.0 (thresholds.v1, medications.v1)',
    pathwayVersion: 'pph-pathway.v1@1.0.0',
  };
}

export interface GeminiGatewayOptions {
  apiKey: string;
  model?: string;
  transport?: GeminiTransport;
  onAuditEvent?: GatewayAuditHook;
}

export class GeminiGateway implements AIGateway {
  private readonly apiKey: string;
  private readonly model: string;
  private transport: GeminiTransport | null;
  private readonly onAuditEvent?: GatewayAuditHook;
  private readonly offline = new OfflineFallbackGateway();

  constructor(opts: GeminiGatewayOptions) {
    if (!opts.apiKey) throw new Error('GeminiGateway requires an API key (from environment, never hard-coded)');
    this.apiKey = opts.apiKey;
    this.model = opts.model ?? 'gemini-2.0-flash';
    this.transport = opts.transport ?? null;
    this.onAuditEvent = opts.onAuditEvent;
  }

  private async callModel(prompt: string): Promise<string> {
    if (!this.transport) {
      this.transport = await defaultTransportFactory(this.apiKey, this.model);
    }
    this.onAuditEvent?.({ type: 'AI_CALL_MADE', modelVersion: GEMINI_MODEL_VERSION, detail: prompt.slice(0, 120) });
    return this.transport(prompt, SYSTEM_LANGUAGE_ONLY);
  }

  private fallback<T>(detail: string, fallbackValue: T, modelVersion = OFFLINE_TEMPLATE_VERSION): T {
    this.onAuditEvent?.({ type: 'AI_FALLBACK_USED', modelVersion, detail });
    return fallbackValue;
  }

  async structureIntake(req: StructureIntakeRequest): Promise<StructureIntakeResult> {
    // Structuring output is a PROPOSAL requiring clinician review; offline
    // behavior (empty proposal + unmapped narrative) is the safe default.
    // Live structuring is intentionally conservative in MVP: we delegate to
    // the offline contract unless a future validated prompt ships.
    return this.fallback('structureIntake delegated to offline contract in MVP', await this.offline.structureIntake(req));
  }

  async explainStep(req: ExplainStepRequest): Promise<ExplanationResult> {
    const preservedFacts = extractPreservedFacts(req.ruleDerivedContent);
    const prompt =
      `Re-express the following rule-derived clinical content for a ${req.audience.toLowerCase()} audience (locale: ${req.locale}). ` +
      `These fact strings MUST appear verbatim in your output: ${JSON.stringify(preservedFacts)}.\n\n` +
      `CONTENT:\n${JSON.stringify(req.ruleDerivedContent, null, 2)}`;
    try {
      const text = await this.callModel(prompt);
      if (!verifyPreservedFacts(text, preservedFacts)) {
        const offline = await this.offline.explainStep(req);
        return this.fallback('preservedFacts validation failed on Gemini explainStep output', {
          ...offline,
          provenance: {
            ...offline.provenance,
            kind: 'HYBRID' as const,
            generatedBy: 'OFFLINE_TEMPLATE' as const,
            generatorVersion: OFFLINE_TEMPLATE_VERSION,
          },
        });
      }
      return { explanation: text, preservedFacts, provenance: geminiProvenance('HYBRID') };
    } catch (e) {
      const offline = await this.offline.explainStep(req);
      return this.fallback(`Gemini explainStep transport error: ${(e as Error).message}`, {
        ...offline,
        provenance: {
          ...offline.provenance,
          generatedBy: 'OFFLINE_TEMPLATE' as const,
          generatorVersion: OFFLINE_TEMPLATE_VERSION,
        },
      });
    }
  }

  async draftHandoff(req: DraftHandoffRequest): Promise<DraftHandoffResult> {
    const offline = await this.offline.draftHandoff(req);
    const prompt =
      `Format this referral note as ${req.format} (locale: ${req.locale}). Language only — preserve every number, ` +
      `drug name, dose, unit, and reason code verbatim. Required fact strings: ${JSON.stringify(offline.preservedFacts)}.\n\n` +
      `NOTE:\n${JSON.stringify(req.referralNote, null, 2)}`;
    try {
      const text = await this.callModel(prompt);
      if (!verifyPreservedFacts(text, offline.preservedFacts)) {
        return this.fallback('preservedFacts validation failed on Gemini draftHandoff output', offline);
      }
      if (req.format === 'SBAR') {
        // Gemini returns prose; wrap into the SBAR envelope only if the four
        // sections are detectable, else use the deterministic template.
        const sections = /situation:?(.*)background:?(.*)assessment:?(.*)recommendation:?(.*)/is.exec(text);
        if (!sections) return this.fallback('Gemini SBAR output lacked detectable sections', offline);
        return {
          draft: {
            situation: sections[1].trim(),
            background: sections[2].trim(),
            assessment: sections[3].trim(),
            recommendation: sections[4].trim(),
            provenance: geminiProvenance('HYBRID'),
          },
          preservedFacts: offline.preservedFacts,
          provenance: geminiProvenance('HYBRID'),
        };
      }
      return { draft: { prose: text }, preservedFacts: offline.preservedFacts, provenance: geminiProvenance('HYBRID') };
    } catch (e) {
      return this.fallback(`Gemini draftHandoff transport error: ${(e as Error).message}`, offline);
    }
  }

  async translatePatientFacing(req: TranslatePatientFacingRequest): Promise<TranslatePatientFacingResult> {
    const prompt =
      `Translate the following patient-facing text into locale "${req.targetLocale}". ` +
      `These protected tokens (drug names, doses, units, thresholds) must appear byte-identical in the output: ` +
      `${JSON.stringify(req.protectedTokens.map((t) => t.value))}.\n\nTEXT:\n${req.text}`;
    try {
      const text = await this.callModel(prompt);
      const tokensPreserved = req.protectedTokens.every((t) => text.includes(t.value));
      if (!tokensPreserved) {
        // Contract §3.4: return source text with tokensPreserved=false; UI
        // shows English with an "untranslated" badge, never a corrupted translation.
        const offline = await this.offline.translatePatientFacing(req);
        return this.fallback('protected tokens corrupted by Gemini translation', {
          ...offline,
          tokensPreserved: false,
        });
      }
      return { translatedText: text, tokensPreserved: true, reviewRequired: true, provenance: geminiProvenance('AI_GENERATED') };
    } catch (e) {
      const offline = await this.offline.translatePatientFacing(req);
      return this.fallback(`Gemini translate transport error: ${(e as Error).message}`, offline);
    }
  }

  async narrateSimulationStep(req: NarrateSimulationStepRequest): Promise<NarrateSimulationStepResult> {
    const offline = await this.offline.narrateSimulationStep(req);
    const prompt =
      `Narrate this simulation step for a ${req.audience.toLowerCase()} audience (locale: ${req.locale}). ` +
      `You may ONLY describe the state changes listed; invent no physiology. Fact strings to preserve: ` +
      `${JSON.stringify(offline.patientStateChanges.map((c) => `${c.metric}: ${c.to}`))}.\n\n` +
      `ENGINE STATE SUMMARY:\n${offline.narration}`;
    try {
      const text = await this.callModel(prompt);
      const required = offline.patientStateChanges.map((c) => String(c.to));
      if (!required.every((f) => text.includes(f))) {
        return this.fallback('Gemini narration dropped state-change facts', offline);
      }
      return { narration: text, patientStateChanges: offline.patientStateChanges, provenance: geminiProvenance('AI_GENERATED') };
    } catch (e) {
      return this.fallback(`Gemini narrate transport error: ${(e as Error).message}`, offline);
    }
  }
}
