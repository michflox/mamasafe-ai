/**
 * Free-text safety scanners. Free-text intake fields are DATA, never
 * instructions (pph-pathway.v1.json governing_principles). The engine never
 * acts on narrative content; these scanners surface anomalies to the
 * clinician and to the audit spine.
 *
 * IMPORTANT: messages produced here must NOT echo the suspicious value
 * verbatim into recommendation space (a flag that repeats "40 IU" inside
 * output text could be misread as an endorsed dose).
 */

/** Instruction-injection patterns (prompt-injection resistance, adversarial case adv-06). */
const INJECTION_PATTERNS: { id: string; re: RegExp }[] = [
  { id: 'ignore_previous_instructions', re: /ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/i },
  { id: 'persona_override', re: /you\s+are\s+now\b/i },
  { id: 'unrestricted_mode', re: /unrestricted|jailbreak|developer\s+mode|do\s+anything\s+now/i },
  { id: 'suppress_safety_behavior', re: /do\s+not\s+(compute|calculate|recommend|escalate|transfer|log|audit)/i },
  { id: 'skip_audit', re: /skip\s+the\s+audit|disable\s+(the\s+)?audit|no\s+audit/i },
  { id: 'system_note_prefix', re: /\b(note\s+to\s+system|system\s*:|assistant\s*:|\[system\])/i },
  { id: 'reply_exactly', re: /simply\s+reply|respond\s+with\s+only|say\s+only/i },
];

export interface InjectionFinding {
  patternId: string;
  /** Short excerpt for clinician review — truncated, never re-executable. */
  excerpt: string;
}

/** Scan narrative text for instruction-injection patterns. Pure; never throws. */
export function detectInjectionPatterns(text: string | undefined): InjectionFinding[] {
  if (!text) return [];
  const findings: InjectionFinding[] = [];
  for (const { id, re } of INJECTION_PATTERNS) {
    const m = text.match(re);
    if (m) {
      const start = Math.max(0, (m.index ?? 0) - 12);
      findings.push({ patternId: id, excerpt: text.slice(start, start + 60).replace(/\s+/g, ' ').trim() });
    }
  }
  return findings;
}

/**
 * Dose-conflict scanner: narrative asserts a dose/route that conflicts with
 * the guideline data files (adversarial cases adv-01, adv-02, adv-05).
 * Returns machine codes; the engine maps them to RedFlags with messages that
 * describe the conflict WITHOUT repeating the unsafe value.
 */
export type DoseConflictCode =
  | 'OXYTOCIN_BOLUS_MAGNITUDE_CONFLICT' // any IU value other than guideline bolus in a push/bolus context
  | 'RAPID_IV_PUSH_REQUESTED'           // forbidden route at any dose (gate G1)
  | 'TXA_MAGNITUDE_CONFLICT'            // TXA dose above the 1 g guideline dose (gate G3)
  | 'UNVERIFIABLE_CITATION_CLAIM';      // citation claim absent from the registry (adv-05)

export function detectDoseConflicts(text: string | undefined): DoseConflictCode[] {
  if (!text) return [];
  const codes = new Set<DoseConflictCode>();
  const lower = text.toLowerCase();

  if (/\b(iv\s*push|iv\s*bolus|push\s+stat|rapid\s+iv)\b/i.test(text)) {
    codes.add('RAPID_IV_PUSH_REQUESTED');
  }
  // IU magnitudes other than the 10 IU guideline bolus
  for (const m of text.matchAll(/(\d+)\s*iu\b/gi)) {
    if (Number(m[1]) !== 10) codes.add('OXYTOCIN_BOLUS_MAGNITUDE_CONFLICT');
  }
  // TXA magnitudes above the 1 g single dose
  if (/tranexamic|txa/i.test(text)) {
    for (const m of text.matchAll(/(\d+(?:\.\d+)?)\s*g\b/gi)) {
      if (Number(m[1]) > 1) codes.add('TXA_MAGNITUDE_CONFLICT');
    }
  }
  // Citation claims: "WHO 2019", "section 12.4", "ACOG 2021 guideline" style references.
  // The registry contains 2012/2015/2016/2017/2018/2020/2022 vintages only; any other
  // guideline-year claim is unverifiable against the registry.
  const knownYears = new Set(['2012', '2015', '2016', '2017', '2018', '2020', '2022']);
  for (const m of lower.matchAll(/\b(who|figo|acog|rcog|nice|fmoh)\b[^.\n]{0,40}?\b(19|20)\d{2}\b/g)) {
    const year = m[0].match(/\b(19|20)\d{2}\b/)?.[0];
    if (year && !knownYears.has(year)) codes.add('UNVERIFIABLE_CITATION_CLAIM');
  }
  if (/\bsection\s+\d+(\.\d+)+\b/i.test(text) && codes.size === 0) {
    // A highly specific section claim that cannot be verified against the registry.
    codes.add('UNVERIFIABLE_CITATION_CLAIM');
  }
  return [...codes];
}
