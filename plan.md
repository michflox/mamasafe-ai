# MamaSafe AI — Orchestrator Plan (v1, 2026-08-11)

Source brief: `docs/FOUNDER_BRIEF.md` (read this first — it is the authoritative spec).
Governing skill: `anesthesia-os-safety-architect` at
`C:/Users/michf/AppData/Roaming/kimi-desktop/daimon-share/daimon/skills/anesthesia-os-safety-architect/SKILL.md`
(simulation-only, provider oversight, immutable audit, recommendations ≠ commands).

## A. Assessment of the vision
- Founder-market fit is the strongest asset: CRNA + African healthcare focus + safety-first framing is exactly what the Google Africa Applied AI Lab rewards.
- Biggest risks: (1) clinical-content accuracy, (2) regulatory positioning (must stay "clinical decision support", never autonomous diagnosis/treatment), (3) depth of the "Google AI" story beyond a chatbot.
- Mitigations baked into architecture: a deterministic clinical rule engine is the safety spine; Gemini/Gemma only handle language, retrieval, explanation, documentation. Every consequential output is rule-derived, source-linked, and human-confirmed.

## B. Recommended product name
**MamaSafe AI** (flagship product) — built on the **AnesthesiaOS Africa** platform, evolving to **Africa Clinical Copilot**.
Tagline: *"Offline clinical emergency copilot for Africa's frontline health workers."*
Rationale: warm, maternal-health-specific, memorable, non-threatening; "copilot" signals assist-not-replace. Repo/package names use `mamasafe-ai`; the platform layer keeps the AnesthesiaOS safety lineage.

## C. Repository structure (monorepo, root: `C:\Users\michf\Documents\kimi\workspace\mamasafe-ai`)
```
mamasafe-ai/
  plan.md                     # this file
  README.md
  docs/
    FOUNDER_BRIEF.md          # authoritative spec (given)
    PRD.md                    # product requirements document
    ARCHITECTURE.md           # system architecture
    API_CONTRACTS.md          # rule-engine + AI-gateway contracts
    SAFETY.md                 # safety architecture & risk register
    CLINICAL_SOURCES.md       # guideline citations & review log
    ROADMAP.md                # module roadmap (Phases 1-6)
    BUILD_STATUS.md           # honest live build status
    TEST_RESULTS.md           # test suite results
    DEMO_SCRIPT.md            # Google demo walkthrough script
  application/                # Google Africa Applied AI Lab assets (23 items)
    GOOGLE_AI_LAB_APPLICATION.md
    ... (one .md per application asset)
  packages/
    clinical-core/            # deterministic rule engine (pure TypeScript, zero deps)
      data/                   # versioned clinical pathway data (JSON)
      src/                    # engine: intake, risk, pathways, dosing, escalation
      tests/                  # vitest suite incl. synthetic + adversarial cases
    audit/                    # tamper-evident hash-chained audit log
    ai-gateway/               # Gemini integration: prompts, grounding, offline fallback
  apps/
    web/                      # Vite + React + TS + Tailwind PWA (offline-first demo)
  data/                       # synthetic cases & adversarial safety cases (JSON)
```
File-ownership rules for agents are set per stage; no two agents write the same tree.

## D. Technology stack
- Language: TypeScript everywhere.
- Rule engine: pure TS functions, no runtime deps, fully unit-tested (vitest). Rules are data-driven from versioned JSON pathway files with guideline citations.
- Frontend: Vite + React 18 + Tailwind CSS + vite-plugin-pwa; IndexedDB (`idb`) for offline storage; hash-chained audit log client-side; i18n scaffold (en + Nigerian Pidgin/Hausa/Yoruba/Igbo folders, clinician-facing vs patient-facing strings; clinical terms/doses never translated).
- AI layer: `@google/genai` Gemini calls through `packages/ai-gateway` behind a thin optional proxy (`server/` documented contract); **mandatory offline fallback** — templated, rule-derived explanations so the demo works with no API key and no network.
- Tests: vitest; clinical safety suite covers dosing, thresholds, escalation, hallucination guards, fabricated-citation detection, adversarial prompt-injection cases.
- No database server required for the demo; API contracts define the future Postgres/FHIR-shaped schema.

## E. System architecture (3 layers + spine)
1. **Deterministic clinical core** (source of truth for anything consequential): intake normalization, shock index, MEOWS-style early-warning scoring, PPH pathway state machine, weight-based dosing (oxytocin, TXA, misoprostol, ergometrine contraindications), fluid/transfusion calcs, escalation thresholds, referral triggers. Pure functions, version-controlled rules, fail-safe defaults.
2. **Generative layer** (Gemini cloud / Gemma edge, later): voice/text intake structuring, guideline-grounded Q&A (RAG with source attribution), SBAR/referral-note drafting, patient/family explanation, translation, simulation narration. **Never** computes doses or thresholds; outputs always labeled "AI-generated — verify".
3. **Safety & audit spine**: every output stamped RULE-BASED or AI-GENERATED; human confirmation gate before any consequential action; tamper-evident hash-chained audit log; model/rule version stamps; automation-bias mitigations (genuine reviewability, read-back).
Cross-cutting: offline-first (PWA, cached pathways, deferred sync), multilingual, Nigerian data-protection-aware governance, separation of clinical/analytics/research/training data.

## F. MVP scope (one workflow, excellent)
Postpartum hemorrhage end-to-end, synthetic cases only:
structured + free-text intake (age, GA, vitals, EBL, uterine tone, IV access, meds given, available resources/blood) → shock index + risk categorization → red flags + missing critical info → prioritized PPH action checklist (uterine massage → oxytocin → TXA ≤3h → misoprostol/ergometrine w/ contraindication checks → fluids → escalation) → weight-based calculations → monitoring plan → escalation threshold + referral recommendation → structured referral note + SBAR handoff + voice read-back → audit trail → **simulation mode** (the 29-year-old case: HR 124, BP 88/52, EBL 1,100 mL) where patient state evolves with clinician actions.
Non-goals for MVP: preeclampsia/sepsis/newborn modules (architecture stubs only), Gemini live calls (gateway + offline fallback only), maps, real patient data, any claim of regulatory clearance.

## G. Development sequence (stage-gated)
- **Stage 1 — Foundation (parallel swarm, 3 agents, disjoint trees):**
  1. `Clinical_Content_Author` → `packages/clinical-core/data/*`, `data/*`, `docs/CLINICAL_SOURCES.md`
  2. `Product_Docs_Author` → `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/API_CONTRACTS.md`, `docs/SAFETY.md`, `docs/ROADMAP.md`, `docs/BUILD_STATUS.md`, `README.md`
  3. `Application_Strategist` → `application/*` (all 23 Google Lab assets) + `docs/DEMO_SCRIPT.md`
- **Stage 2 — Implementation (single coder, gate: stage-1 files exist):**
  `Platform_Engineer` → `packages/clinical-core` engine + tests, `packages/audit`, `packages/ai-gateway`, `apps/web` PWA demo, `npm run dev` working, vitest passing, updates `docs/TEST_RESULTS.md` + `docs/BUILD_STATUS.md`.
- **Stage 3 — Verification & polish (1 coder):**
  `QC_Engineer` → runs build + full test suite, clinical spot-check vs WHO/FIGO, fixes defects, finalizes TEST_RESULTS.md/BUILD_STATUS.md, confirms preview readiness.

## H. First working implementation
The Stage-2 PWA: an offline-capable PPH emergency copilot demo runnable via `npm run dev` from `apps/web` (previewed at http://localhost:7100/), with simulation mode, deterministic rule engine underneath, and audit trail visible in the UI.

## Hard rules for every agent
- Synthetic data only. No real patient data. No claims of FDA/CE/clinical approval.
- Recommendations, never commands; human confirmation before consequential actions.
- Doses/thresholds come ONLY from the deterministic rule engine + cited guidelines.
- English for code/docs; clinician vs patient language separation in UI strings.
- Do not fabricate completed features; BUILD_STATUS.md must be honest.
- Git Bash on Windows: use forward-slash or quoted Windows paths.
