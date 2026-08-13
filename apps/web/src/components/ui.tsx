import type { GuidelineCitation, Provenance } from '@mamasafe/clinical-core';

export function ProvenanceBadge({ provenance }: { provenance: Provenance }) {
  if (provenance.kind === 'RULE_BASED') {
    return (
      <span className="inline-flex items-center rounded-full bg-teal-soft text-teal px-2 py-0.5 text-xs font-semibold">
        RULE-BASED
      </span>
    );
  }
  if (provenance.kind === 'AI_GENERATED') {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-soft text-amber-dark px-2 py-0.5 text-xs font-semibold">
        AI-generated — verify
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-amber-soft text-amber-dark px-2 py-0.5 text-xs font-semibold">
      HYBRID — rule facts, {provenance.generatedBy === 'GEMINI' ? 'Gemini' : 'template'} language — verify
    </span>
  );
}

export function CitationChip({ citation }: { citation: GuidelineCitation }) {
  return (
    <span
      className="inline-flex items-center rounded-full border border-stone-300 bg-white px-2 py-0.5 text-xs text-muted"
      title={`${citation.documentTitle} (${citation.year}) — ${citation.section}. Last reviewed ${citation.lastReviewed}`}
    >
      {citation.organization} {citation.year}
    </span>
  );
}

export function SimulationBanner() {
  return (
    <div className="bg-danger-soft border-b border-danger/30 text-danger-dark text-center text-sm font-medium px-3 py-2">
      SIMULATION — synthetic data only. Clinical decision support, not autonomous diagnosis. Not cleared for clinical use.
    </div>
  );
}

export function TierBadge({ tier }: { tier: string }) {
  const styles: Record<string, string> = {
    STABLE: 'bg-teal-soft text-teal',
    AT_RISK: 'bg-amber-soft text-amber-dark',
    EMERGENT: 'bg-terracotta-soft text-terracotta-dark',
    CRITICAL: 'bg-danger-soft text-danger-dark',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-bold ${styles[tier] ?? styles.AT_RISK}`}>
      {tier.replace('_', ' ')}
    </span>
  );
}
