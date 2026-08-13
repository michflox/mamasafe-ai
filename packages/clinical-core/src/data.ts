/**
 * Data-file loading, envelope validation, and citation registry.
 * Fail-closed: any malformed envelope, unknown document_type, or
 * unresolvable citation id throws ClinicalRuleError at load time
 * (configuration error = test failure, never a runtime clinical event).
 */
import { ClinicalRuleError } from './errors.js';
import type { GuidelineCitation } from './types.js';

import pphPathwayRaw from '../data/pph-pathway.v1.json';
import medicationsRaw from '../data/medications.v1.json';
import thresholdsRaw from '../data/thresholds.v1.json';

export const RULES_VERSION = 'clinical-rules@1.0.0 (thresholds.v1, medications.v1)' as const;
export const PATHWAY_VERSION = 'pph-pathway.v1@1.0.0' as const;

interface DataEnvelope {
  schema_version: string;
  document_type: string;
  data_file_id: string;
  status: string;
  last_reviewed: string;
  citations?: Record<string, RawCitation>;
}

interface RawCitation {
  organization: string;
  title: string;
  year: number | string | null;
  sections_used?: string[];
  url?: string | null;
  date_reviewed: string;
}

const KNOWN_STATUSES = new Set([
  'draft_pending_clinical_review',
  'approved_for_clinical_use',
]);

function validateEnvelope(raw: unknown, expectedType: string, fileLabel: string): DataEnvelope {
  const env = raw as DataEnvelope;
  if (!env || typeof env !== 'object') {
    throw new ClinicalRuleError('DATA_ENVELOPE_MALFORMED', `${fileLabel}: not an object`);
  }
  if (env.document_type !== expectedType) {
    throw new ClinicalRuleError(
      'DATA_TYPE_MISMATCH',
      `${fileLabel}: expected document_type "${expectedType}", got "${env.document_type}"`,
    );
  }
  if (!env.schema_version || !env.data_file_id || !env.last_reviewed) {
    throw new ClinicalRuleError('DATA_ENVELOPE_MALFORMED', `${fileLabel}: missing envelope keys`);
  }
  if (!KNOWN_STATUSES.has(env.status)) {
    throw new ClinicalRuleError('DATA_STATUS_UNKNOWN', `${fileLabel}: unknown status "${env.status}"`);
  }
  if (env.status !== 'approved_for_clinical_use') {
    // Simulation-only by design — surfaced in the UI footer by the app layer.
  }
  return env;
}

/** Convert a raw registry entry to the contract GuidelineCitation shape. */
function toCitation(id: string, raw: RawCitation): GuidelineCitation {
  return {
    organization: raw.organization,
    documentTitle: raw.title,
    year: raw.year == null ? 'n/a' : String(raw.year),
    section:
      raw.sections_used && raw.sections_used.length > 0
        ? raw.sections_used.join('; ')
        : raw.url
          ? raw.url
          : 'pending source verification',
    lastReviewed: raw.date_reviewed,
  };
}

/** Merged citation registry across all three data files (id → citation). */
export type CitationRegistry = Readonly<Record<string, GuidelineCitation>>;

function buildRegistry(): Record<string, GuidelineCitation> {
  const reg: Record<string, GuidelineCitation> = {};
  const files: [string, DataEnvelope][] = [
    ['pph-pathway.v1.json', pphPathway],
    ['medications.v1.json', medications],
    ['thresholds.v1.json', thresholds],
  ];
  for (const [label, env] of files) {
    for (const [id, raw] of Object.entries(env.citations ?? {})) {
      const existing = reg[id];
      if (existing) {
        // DATA ISSUE (reported in docs/BUILD_STATUS.md): the same citation id
        // carries slightly different `title` strings across the three data
        // files (same underlying document, e.g. FIGO-2022-PPH with/without
        // author/journal suffix). Workaround: same id + same organization +
        // same year ⇒ keep the richer entry (more detail wins). A genuinely
        // conflicting id (different org or year) remains a hard data error.
        const sameYear = existing.year === (raw.year == null ? 'n/a' : String(raw.year));
        const orgA = existing.organization;
        const orgB = raw.organization ?? '';
        const sameOrg =
          orgA === orgB || orgA.startsWith(orgB) || orgB.startsWith(orgA) || orgA.slice(0, 40) === orgB.slice(0, 40);
        if (!sameOrg || !sameYear) {
          throw new ClinicalRuleError(
            'CITATION_CONFLICT',
            `citation id "${id}" has conflicting definitions (${label})`,
          );
        }
        const richer = (raw.title?.length ?? 0) > existing.documentTitle.length || (raw.sections_used?.length ?? 0) > 0;
        if (!richer) continue;
      }
      reg[id] = toCitation(id, raw);
    }
  }
  return reg;
}

export const pphPathway = validateEnvelope(pphPathwayRaw, 'clinical_pathway', 'pph-pathway.v1.json') as typeof pphPathwayRaw;
export const medications = validateEnvelope(medicationsRaw, 'medication_library', 'medications.v1.json') as typeof medicationsRaw;
export const thresholds = validateEnvelope(thresholdsRaw, 'threshold_library', 'thresholds.v1.json') as typeof thresholdsRaw;

export const citationRegistry: CitationRegistry = Object.freeze(buildRegistry());

/** Resolve a citation id against the merged registry; throws on unknown id (fail closed). */
export function resolveCitation(id: string): GuidelineCitation {
  const c = citationRegistry[id];
  if (!c) {
    throw new ClinicalRuleError('CITATION_UNRESOLVED', `citation id "${id}" not present in any data-file registry`);
  }
  return c;
}

/** Resolve the first citation id from a list (primary citation for an output object). */
export function primaryCitation(ids: readonly string[]): GuidelineCitation {
  if (!ids || ids.length === 0) {
    throw new ClinicalRuleError('CITATION_MISSING', 'clinical rule emitted without citation ids');
  }
  return resolveCitation(ids[0]);
}

/** Resolve all ids. */
export function resolveCitations(ids: readonly string[]): GuidelineCitation[] {
  return ids.map(resolveCitation);
}

/**
 * Citation-integrity assertion for engine OUTPUT objects: every citation
 * attached to an output must be byte-identical to a registry entry.
 * Used by the safety test suite and available to the app layer.
 */
export function assertCitationsResolve(citations: readonly GuidelineCitation[]): void {
  const registryValues = new Set(Object.values(citationRegistry).map((c) => JSON.stringify(c)));
  for (const c of citations) {
    if (!registryValues.has(JSON.stringify(c))) {
      throw new ClinicalRuleError(
        'CITATION_NOT_IN_REGISTRY',
        `output citation "${c.organization} / ${c.documentTitle}" does not resolve to the data-file registry`,
      );
    }
  }
}

/** Collect every citation object reachable in an output graph (for test assertions). */
export function collectCitations(root: unknown, acc: GuidelineCitation[] = []): GuidelineCitation[] {
  if (!root || typeof root !== 'object') return acc;
  if (Array.isArray(root)) {
    for (const item of root) collectCitations(item, acc);
    return acc;
  }
  const obj = root as Record<string, unknown>;
  if (
    typeof obj.organization === 'string' &&
    typeof obj.documentTitle === 'string' &&
    typeof obj.lastReviewed === 'string'
  ) {
    acc.push(obj as unknown as GuidelineCitation);
  }
  for (const value of Object.values(obj)) collectCitations(value, acc);
  return acc;
}

/** True when a citation registry entry is UNVERIFIED (url null / year null). */
export function isUnverifiedCitation(id: string): boolean {
  const raw =
    (pphPathway.citations as Record<string, RawCitation>)[id] ??
    (medications.citations as Record<string, RawCitation>)[id] ??
    (thresholds.citations as Record<string, RawCitation>)[id];
  return !!raw && (raw.url == null || raw.year == null);
}
