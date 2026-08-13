# 12. Technical Architecture

## Overview: three layers plus a spine

```
┌──────────────────────────────────────────────────────────────────┐
│  GENERATIVE LAYER (language only)                                │
│  Gemini (cloud) · Gemma (edge, roadmap) · offline templates      │
│  intake structuring · grounded Q&A · handoff drafting ·          │
│  translation · patient explanation · simulation narration        │
├──────────────────────────────────────────────────────────────────┤
│  SAFETY & AUDIT SPINE (everything passes through)                │
│  human-confirmation gate · RULE-BASED / AI-GENERATED stamps ·    │
│  tamper-evident hash-chained audit log · model/rule versions ·   │
│  output-validation (conflict + fabricated-citation rejection)    │
├──────────────────────────────────────────────────────────────────┤
│  DETERMINISTIC CLINICAL CORE (source of truth)                   │
│  intake normalization · shock index · early-warning scoring ·    │
│  pathway state machines · weight-based dosing · fluid/           │
│  transfusion calcs · contraindications · escalation thresholds   │
├──────────────────────────────────────────────────────────────────┤
│  OFFLINE-FIRST PLATFORM                                          │
│  PWA + Android path · cached pathways · local storage ·          │
│  deferred sync · i18n (clinician/patient layers) · low-data mode │
└──────────────────────────────────────────────────────────────────┘
```

## 1. Deterministic clinical core (`packages/clinical-core`)

- **Pure functions, zero runtime dependencies**, fully unit-tested — the core can be audited, verified, and ported without framework entanglement.
- **Data-driven rules:** clinical pathways are version-controlled JSON files with per-rule citations (organization, document, year/version, section). Changing a threshold is a reviewed data change with a version bump, not a code edit lost in a refactor.
- **Components:** intake normalization; shock index (HR/SBP) and MEOWS-style early-warning scoring; the PPH pathway state machine (recognition → uterotonics → TXA time-window tracking → second-line agents with contraindication screening → fluids/transfusion adapted to configured blood-product availability → reassessment → escalation); weight-based dosing with hard limits; fluid and transfusion calculations; escalation and referral triggers.
- **Fail-safe defaults:** missing critical inputs produce explicit requests; impossible/implausible inputs are rejected; the engine never extrapolates silently.
- **Synthetic-case test harness:** golden cases plus adversarial cases (prompt injection strings in intake text, fabricated-citation bait, translation attacks, boundary weights/ages) gate every release.

## 2. Safety & audit spine (`packages/audit` + gate logic)

- **Human-confirmation gate:** no output flagged consequential renders as actionable without an explicit, logged confirmation event. Confirmations display value + rule + citation for genuine reviewability.
- **Provenance stamps:** every output carries RULE-BASED or AI-GENERATED labels plus model-version and rule-version identifiers.
- **Tamper-evident log:** append-only, hash-chained audit records (each entry commits to the previous entry's hash) capturing inputs, evaluations, AI calls, confirmations, overrides, and timestamps. Works offline; syncs when connected.
- **Output validation:** generative outputs are screened before display — conflicts with rule-engine values are rejected; citations not present in the retrieved corpus are stripped and flagged.

## 3. Generative layer (`packages/ai-gateway`)

- **Gateway pattern:** all model calls route through one module with prompt templates, structured-context injection (rule-engine outputs as facts), guardrail instructions (never generate doses/thresholds/contraindications), and response post-processing.
- **Providers:** Gemini via `@google/genai` behind an optional thin proxy (documented contract; keys never in the client); Gemma at the edge in the roadmap tier.
- **Mandatory offline fallback:** deterministic, templated explanations generated from rule outputs — the product is fully functional with no API key and no network. AI enhances; it is never load-bearing for safety.
- **Retrieval:** guideline corpus is versioned and source-stamped; RAG answers must display the retrieved source. Fabricated citations are a test-suite failure class, not a shrug.

## 4. Offline-first platform (`apps/web`)

- **Progressive web app** (Vite + React + TypeScript + Tailwind + vite-plugin-pwa) installable on older Android devices; Android-native path preserved.
- **Local-first storage:** IndexedDB for case state, audit log, cached pathways, and guideline corpus; deferred synchronization with conflict-safe merging; an interrupted emergency session resumes exactly where it left off.
- **Low-data design:** compressed assets, cached everything, voice designed for low bandwidth, SMS-fallback concept documented for referral notifications where appropriate.
- **Internationalization:** separate clinician-facing and patient-facing string layers; English and Nigerian Pidgin scaffolding first, Hausa/Yoruba/Igbo to follow with community validation; **clinical terms, drug names, concentrations, doses, and thresholds are non-translatable tokens** enforced by the i18n pipeline.

## 5. Data architecture & governance

- **Demo today:** no server database required; all data local, synthetic cases only.
- **Defined contracts (future):** API contracts specify a Postgres/FHIR-shaped schema — patients, encounters, observations, pathway executions, confirmations, audit events, facility directories — with HL7 FHIR R4 alignment for interoperability.
- **Governance by design:** encryption in transit/at rest, role-based access, minimum-necessary collection; strict separation of clinical-operations, analytics, research, and model-training data stores; patient data never trains models by default; Nigerian data-protection alignment with per-country configuration for expansion.

## 6. Cloud & MLOps (Vertex AI, current and roadmap)

- **Now (development):** evaluation harnesses run the clinical safety suite against model/rule candidates; version stamps flow into audit records.
- **Roadmap:** Vertex AI managed endpoints with guardrails, monitoring, logging, model comparison, and safety evaluation as a release gate; de-identified, aggregated telemetry for safety analytics; no raw clinical content in analytics pipelines.

## 7. Environments and separation

Simulation and clinical environments are architecturally separated — the simulation engine (synthetic patient state evolution) shares no pathway with any future clinical deployment, and development systems contain no real patient data. There is no actuator layer and no device integration; the product produces recommendations and documentation for humans, period.

## 8. Why this architecture survives scrutiny

- **Regulatory-shaped:** feature-level intended-use/failure-mode/hazard/risk-control documentation; version control; auditability; human oversight — the IEC 62304 / ISO 14971 / IEC 62366-1 way of thinking, applied from day one even though no clearance is claimed.
- **Reviewable:** pure-function core + data-driven rules + hash-chained logs mean any external reviewer (clinical, technical, or regulatory) can trace any output to the exact rule, version, citation, and human confirmation behind it.
- **Evolvable:** modules are clinical packages over shared infrastructure, so the roadmap expands by adding governed content and pathways — not by re-architecting.
