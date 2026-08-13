# MamaSafe AI — Build Status

- **As of:** 2026-08-11 (Stage 2 implementation complete)
- **Rule for this file:** honest over impressive. If it is not built and verified, it does not say "done."

---

## Status Summary

| Area | Status | Notes |
|---|---|---|
| Foundation documents (PRD, architecture, API contracts, safety, roadmap) | **Authored** | v1.0 drafts dated 2026-08-11. |
| Clinical content data (PPH pathway rules, drug library, citations) | **Authored (in review)** | Expert clinical review pending — see `docs/CLINICAL_SOURCES.md`. |
| Clinical rule engine (`packages/clinical-core`) | **IMPLEMENTED + TESTED** | All 9 contract functions (`assessIntake`, `initPathway`, `reassess`, `confirmAction`, `computeDoses`, `computeFluidGuidance`, `evaluateEscalation`, `generateReferralNote`, `generateSbarHandoff`). Pure, synchronous, zero runtime deps. Hard gates G1–G9 enforced. 84 engine/oracle/adversarial tests passing. |
| Audit spine (`packages/audit`) | **IMPLEMENTED + TESTED** | Hash-chained append-only log (pure-TS SHA-256, canonical serialization), `appendAuditEvent` / `verifyAuditChain`, memory + Node-file + IndexedDB (idb) stores. 8 tests passing incl. tamper detection. |
| AI gateway (`packages/ai-gateway`) | **IMPLEMENTED + TESTED (offline path); live Gemini coded but UNTESTED** | `AIGateway` interface, `OfflineFallbackGateway` (full interface, zero network), `GeminiGateway` (@google/genai, env-injected key, preservedFacts post-validation → auto-fallback + `AI_FALLBACK_USED`), `createAIGateway({online, apiKey})`. 11 contract tests passing with injected transport. **No live Gemini call has ever been made from this repo.** |
| Web app (`apps/web` PWA) | **IMPLEMENTED + BUILD VERIFIED** | Vite + React 18 + TS + Tailwind + vite-plugin-pwa. Six screens: intake (one-tap synthetic case + injection-safety demo field), risk dashboard (SI band dial, tier, red flags, missing info), prioritized action checklist (tap-to-confirm with actor/timestamp audit, override with required reason, dose cards with citation chips, loud contraindication blocks), escalation & referral (referral note + SBAR + Web Speech read-back + patient/family explanation), simulation mode (timed scenario, scripted vitals evolution, TXA 3-h countdown), audit trail viewer (hash chain + verify button). Persistent simulation banner; RULE-BASED vs AI-GENERATED badges throughout. |
| Test suite (engine + safety batteries) | **103 / 103 PASSING** | See `docs/TEST_RESULTS.md` (2026-08-11). |
| Simulation mode | **IMPLEMENTED (scripted)** | 29-year-old case runs as timed scenario; vitals evolve per scripted rules in response to confirmed actions; delay worsens shock index; TXA countdown. **Scripted training model, not a physiological model.** |
| Multilingual scaffold | **Scaffolded (English shipped)** | `en/pcm/ha/yo/ig` locale table with clinician vs patient string-domain separation; pcm/ha/yo/ig fall back to English pending professional translation + human review. Protected-token rule documented in UI. |
| Google Africa Applied AI Lab application assets | **In progress (parallel workstream)** | See `application/`. |

## Verification Evidence (2026-08-11)

| Check | Result |
|---|---|
| `npm install` at root | ✅ 483 packages installed, no errors |
| `npx vitest run` | ✅ **5 files, 103 tests, 100% passing** (audit 8, engine unit 27, adversarial 37, oracle 20, gateway 11) |
| `npm run build` in `apps/web` | ✅ `tsc && vite build` clean; PWA service worker generated |
| Dev server smoke (`vite --port 5199`) | ✅ HTTP 200 served; server stopped after check; no node/vite processes left running |

## Deviations from docs/API_CONTRACTS.md

1. **Additive `IntakePayload.clinicalContext` field.** Contract v1.0 did not model time-since-birth (required for TXA gate G2) or obstetric history (required for ergometrine/carboprost gates G4/G5). Added ONE optional field `clinicalContext?: ClinicalContextExtension` (minutesSinceBirth, modeOfBirth, obstetricHistory, genitalTraumaAssessed, placentaAppearsComplete, ivAccessCount, referralMinutesAway). No contract field renamed, removed, or retyped; absence surfaces via `MissingInfo`, never imputation. Recommend folding into contracts v1.1.
2. **Pediatric rejection is a thrown `OutOfScopeError`** (subtype of `ClinicalRuleError`, code `OUT_OF_SCOPE`). The contract's return types have no out-of-scope variant, and gate G7 forbids producing any dosing/pathway output for under-18 patients; a typed throw with a dosing-free message is the only way to guarantee "no output". Documented in `packages/clinical-core/src/errors.ts`.
3. **Injection/dose-conflict/fabricated-citation flags ride on `RedFlag`** (codes `INJECTION_PATTERN_DETECTED`, `OXYTOCIN_BOLUS_MAGNITUDE_CONFLICT`, `RAPID_IV_PUSH_REQUESTED`, `TXA_MAGNITUDE_CONFLICT`, `UNVERIFIABLE_CITATION_CLAIM`) since `RiskAssessment` has no dedicated anomaly channel. Flag messages deliberately never echo the unsafe value.
4. **`SbarHandoff` carries provenance but no citations array** (per contract shape); citation-integrity tests therefore assert "every citation present resolves" rather than "every output has citations".

## Data Issues Found (worked around in engine code; data files untouched)

1. **Citation registry drift across data files.** The same citation id (e.g. `FIGO-2022-PPH`, `WHO-2012-PPH`) carries slightly different `title`/`organization` strings in `pph-pathway.v1.json` vs `medications.v1.json` vs `thresholds.v1.json` (same underlying documents). Engine workaround: same id + same organization (prefix-tolerant) + same year ⇒ keep the richer entry; genuinely conflicting ids still fail closed. Recommend a single canonical registry in a future data revision.
2. **`NATHAN-2019-AOGS` organization field is "Nathan HL et al."** rather than the publishing journal — cosmetic only, left as-is.
3. No other data defects blocked implementation. `docs/CLINICAL_SOURCES.md` and all `data/*.json` / `packages/clinical-core/data/*.json` were **not modified**.

## Explicitly NOT Done (to prevent overclaiming)

- ❌ **Live Gemini API integration** — coded behind the gateway (env key, constrained prompts, preservedFacts post-validation) but **never called; untested without a key**. Demo runs entirely on `OfflineFallbackGateway`.
- ❌ Preeclampsia/eclampsia, maternal sepsis, newborn resuscitation modules — **architecture stubs only** (pathway ids exist; `initPathway`/`computeDoses` throw `PATHWAY_NOT_IMPLEMENTED`); severe-hypertension red flag does emit a `PREECLAMPSIA_SEVERE` evaluation trigger.
- ❌ Pediatric, sickle-cell, malaria, immunization modules — future phases; pediatric input is hard-rejected (G7).
- ❌ Voice input (voice *read-back* via Web Speech API is implemented; voice intake is post-MVP).
- ❌ Deferred sync to any server (audit persists locally in IndexedDB; no backend exists).
- ❌ Professional pcm/ha/yo/ig translation (scaffold + English only).
- ❌ Gemma edge inference, RAG retrieval, maps/referral routing — designed, not built.
- ❌ Human-factors / simulation-phase research study (metrics defined; study not run).
- ❌ Any regulatory engagement or clearance claim (development/simulation only — `docs/SAFETY.md` §1).
- ❌ Any use of real patient data (synthetic only, type-enforced `IntakePayload.isSimulation: true`).

## Demo

```bash
cd mamasafe-ai
npm install
npm run dev        # serves apps/web (Vite); open the printed localhost URL
```

Demo path: Intake → "Load synthetic case: 29-year-old PPH" → Risk dashboard → Actions (confirm steps; watch dose cards + blocks) → Escalation (generate referral + SBAR, voice read-back) → Simulation (start timed scenario; confirm actions to stabilize the patient before the TXA window closes) → Audit (verify chain).

## Change Log

| Date | Change |
|---|---|
| 2026-08-11 | Initial status: foundation docs + clinical data authored. |
| 2026-08-11 | Stage 2 complete: clinical-core engine, audit spine, ai-gateway (offline + Gemini adapter), web PWA demo; 103/103 tests passing; build + dev-server verified; TEST_RESULTS.md published; deviations and data issues documented above. |

---

*Update this file whenever status changes. Stage-gate reviews read this file first.*
