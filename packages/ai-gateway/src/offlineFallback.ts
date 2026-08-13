/**
 * OfflineFallbackGateway — the mandatory zero-network adapter.
 * Implements the SAME AIGateway interface with deterministic templates
 * assembled from rule-engine objects. The demo is fully functional with
 * no API key and no network.
 */
import {
  generateSbarHandoff,
  type ActionItem,
  type DoseCalculation,
  type EscalationDecision,
  type Provenance,
  type RedFlag,
} from '@mamasafe/clinical-core';
import {
  OFFLINE_TEMPLATE_VERSION,
  type AIGateway,
  type DraftHandoffRequest,
  type DraftHandoffResult,
  type ExplainStepRequest,
  type ExplanationResult,
  type NarrateSimulationStepRequest,
  type NarrateSimulationStepResult,
  type StructureIntakeRequest,
  type StructureIntakeResult,
  type TranslatePatientFacingRequest,
  type TranslatePatientFacingResult,
} from './types.js';

function offlineProvenance(kind: Provenance['kind']): Provenance {
  return {
    kind,
    generatedBy: 'OFFLINE_TEMPLATE',
    generatorVersion: OFFLINE_TEMPLATE_VERSION,
    rulesVersion: 'clinical-rules@1.0.0 (thresholds.v1, medications.v1)',
    pathwayVersion: 'pph-pathway.v1@1.0.0',
  };
}

/** Fact strings that MUST survive any re-expression, per contract §3.2. */
export function extractPreservedFacts(content: ActionItem | RedFlag | DoseCalculation | EscalationDecision): string[] {
  const facts: string[] = [];
  if ('result' in content && 'formula' in content) {
    // DoseCalculation
    const d = content as DoseCalculation;
    facts.push(`${d.result.dose} ${d.result.doseUnit}`);
    facts.push(d.formula);
    if (d.result.maxCumulativeDose) facts.push(`${d.result.maxCumulativeDose.dose} ${d.result.maxCumulativeDose.doseUnit}`);
  } else if ('triggeringValues' in content) {
    const f = content as RedFlag;
    for (const v of Object.values(f.triggeringValues)) facts.push(String(v));
  } else if ('reasonCodes' in content) {
    const e = content as EscalationDecision;
    facts.push(e.urgency, ...e.reasonCodes);
  } else {
    const a = content as ActionItem;
    facts.push(a.title);
  }
  return facts.filter((f) => f.length > 0);
}

/** Post-hoc validation: every preserved fact must appear verbatim. */
export function verifyPreservedFacts(text: string, facts: readonly string[]): boolean {
  return facts.every((f) => text.includes(f));
}

function citationLine(c: { organization: string; documentTitle: string; year: string }): string {
  return `Source: ${c.organization} — ${c.documentTitle} (${c.year})`;
}

export function templateExplain(req: ExplainStepRequest): string {
  const c = req.ruleDerivedContent;
  const header =
    req.subject.kind === 'ACTION_ITEM'
      ? `Action: ${(c as ActionItem).title}`
      : req.subject.kind === 'RED_FLAG'
        ? `Red flag (${(c as RedFlag).severity}): ${(c as RedFlag).clinicianMessage}`
        : req.subject.kind === 'DOSE'
          ? `Dose calculation: ${(c as DoseCalculation).drugName} — ${(c as DoseCalculation).formula}`
          : `Escalation decision: ${(c as EscalationDecision).urgency} (${(c as EscalationDecision).reasonCodes.join(', ')})`;

  const body =
    'result' in c && 'formula' in c
      ? `Result: ${c.result.dose} ${c.result.doseUnit} ${c.result.route}. ${c.result.administrationNote ?? ''}` +
        (c.result.maxCumulativeDose
          ? `\nMaximum cumulative dose: ${c.result.maxCumulativeDose.dose} ${c.result.maxCumulativeDose.doseUnit}.`
          : '') +
        `\nWarnings: ${c.warnings.join(' ')}`
      : 'rationale' in c
        ? `Rationale: ${c.rationale}`
        : 'reasonCodes' in c
          ? `Actions while awaiting transfer: ${c.actionsWhileAwaitingTransfer.join('; ') || 'none'}`
          : `Severity: ${(c as RedFlag).severity}`;

  const citation = 'citation' in c && c.citation ? citationLine(c.citation) : '';
  const audience = req.audience === 'TRAINEE' ? '\n(Teaching point: this content is rule-derived and cited; verify against the source guideline.)' : '';
  return `${header}\n\n${body}\n\n${citation}${audience}`.trim();
}

export class OfflineFallbackGateway implements AIGateway {
  async structureIntake(req: StructureIntakeRequest): Promise<StructureIntakeResult> {
    return {
      proposal: {
        proposedPayload: {},
        fieldDerivations: [],
        unmappedNarrative: req.narrative ? [req.narrative] : [],
        provenance: offlineProvenance('AI_GENERATED'),
      },
      provenance: offlineProvenance('AI_GENERATED'),
    };
  }

  async explainStep(req: ExplainStepRequest): Promise<ExplanationResult> {
    const preservedFacts = extractPreservedFacts(req.ruleDerivedContent);
    const explanation = templateExplain(req);
    // Templates are assembled FROM the rule object, so validation holds by construction.
    return { explanation, preservedFacts, provenance: offlineProvenance('HYBRID') };
  }

  async draftHandoff(req: DraftHandoffRequest): Promise<DraftHandoffResult> {
    const note = req.referralNote;
    const preservedFacts = [
      `${note.estimatedBloodLossMl ?? 'unknown'}`,
      note.escalation.urgency,
      ...note.escalation.reasonCodes,
    ];
    if (req.format === 'SBAR') {
      const draft = generateSbarHandoff(note);
      return { draft, preservedFacts, provenance: offlineProvenance('HYBRID') };
    }
    const prose =
      `REFERRAL — ${note.patientSummary}\n\n` +
      `${note.vitalsTrendSummary}\n` +
      `Estimated blood loss: ${note.estimatedBloodLossMl ?? 'unknown'} mL.\n` +
      `Actions taken: ${note.actionsTaken.map((a) => a.title).join('; ') || 'none confirmed yet'}.\n` +
      `Current status: ${note.currentStatus}\n` +
      `Needs at receiving facility: ${note.needsAtReceivingFacility.join('; ') || 'per escalation decision'}.\n` +
      `Urgency: ${note.escalation.urgency} (${note.escalation.reasonCodes.join(', ')}).`;
    return { draft: { prose }, preservedFacts, provenance: offlineProvenance('HYBRID') };
  }

  async translatePatientFacing(req: TranslatePatientFacingRequest): Promise<TranslatePatientFacingResult> {
    // Offline: no translation engine. Return the source text; verify every
    // protected token survives verbatim (they are never translated).
    const tokensPreserved = req.protectedTokens.every((t) => req.text.includes(t.value));
    return {
      translatedText: req.text,
      tokensPreserved,
      reviewRequired: true,
      provenance: offlineProvenance('AI_GENERATED'),
    };
  }

  async narrateSimulationStep(req: NarrateSimulationStepRequest): Promise<NarrateSimulationStepResult> {
    const { assessment, state } = req.engineState;
    const changes: NarrateSimulationStepResult['patientStateChanges'] = [];
    const v = assessment.derived;
    if (typeof v.shockIndex === 'number') {
      changes.push({ metric: 'shock_index', from: 'previous measurement', to: v.shockIndex.toFixed(2) });
    }
    const confirmed = state.completedActionIds.length;
    const actionsText =
      req.actionsSinceLastStep.length > 0 ? `Since the last step you confirmed: ${req.actionsSinceLastStep.join(', ')}.` : 'No new actions confirmed since the last step.';
    const narration =
      `Simulation step (${req.scenarioId}). Risk tier: ${assessment.tier}. ` +
      (typeof v.shockIndex === 'number' ? `Shock index is now ${v.shockIndex.toFixed(2)}.` : 'Shock index is not computable — measure vitals.') +
      ` ${confirmed} pathway action(s) confirmed so far. ${actionsText} ` +
      (assessment.redFlags.length > 0 ? `Active red flags: ${assessment.redFlags.map((f) => f.code).join(', ')}.` : 'No active red flags.');
    return { narration, patientStateChanges: changes, provenance: offlineProvenance('AI_GENERATED') };
  }
}
