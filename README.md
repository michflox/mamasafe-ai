# MamaSafe AI

**Offline clinical emergency copilot for Africa's frontline health workers.**

MamaSafe AI is an offline-first, multilingual, AI-assisted clinical workflow and emergency-escalation copilot for frontline healthcare workers in Nigeria — midwives, nurses, CHEWs, physicians, and anesthesia providers working under severe time, staffing, referral, and connectivity constraints. It turns verified clinical guidelines into actionable, step-by-step emergency workflows that help existing health workers recognize emergencies earlier, execute critical protocols more consistently, and communicate referrals more effectively. It is built on the safety-first **AnesthesiaOS Africa** platform lineage and is being developed for a **2026 Google Africa Applied AI Lab** application.

The MVP proves one workflow end-to-end: **postpartum hemorrhage (PPH)** — from intake through risk categorization, prioritized checklist, dose/fluid calculation, escalation, structured referral and SBAR handoff, to a tamper-evident audit trail — demonstrated entirely in simulation mode.

---

## ⚠️ Safety and Data Disclaimers

> **Development / simulation only.** MamaSafe AI is **not** FDA cleared, **not** CE marked, and **not** approved or registered for clinical use by any authority. It is **not** connected to real clinical devices. It produces clinical decision **support — recommendations, never commands** — and every consequential action requires human clinician confirmation. See [`docs/SAFETY.md`](docs/SAFETY.md).
>
> **Synthetic data only.** All cases, scenarios, and test data in this repository are synthetic. No real patient data is used, stored, or permitted in this development system.

## Architecture in one paragraph

Anything clinically consequential (doses, thresholds, contraindications, scoring, escalation) is computed by a **deterministic, version-controlled, guideline-cited rule engine** — never by the LLM. The **generative layer** (Gemini cloud / Gemma edge, with a mandatory templated offline fallback) handles language only: intake structuring, explanation, documentation drafting, translation, and simulation narration. A **safety & audit spine** wraps everything: RULE-BASED vs AI-GENERATED provenance labels, human confirmation gates, a hash-chained audit log, and version stamps. Details in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Repository structure

```
mamasafe-ai/
  plan.md                     # orchestrator build plan
  README.md                   # this file
  docs/
    FOUNDER_BRIEF.md          # authoritative product spec
    PRD.md                    # product requirements (PPH MVP)
    ARCHITECTURE.md           # 3 layers + safety spine, offline-first, governance
    API_CONTRACTS.md          # normative TypeScript contracts (engine + AI gateway + audit)
    SAFETY.md                 # safety architecture, risk register, evaluation suite
    CLINICAL_SOURCES.md       # guideline citations & clinical review log
    ROADMAP.md                # Phases 1–6 (MamaSafe → Africa Clinical Copilot)
    BUILD_STATUS.md           # honest live build status
    TEST_RESULTS.md           # test suite results
    DEMO_SCRIPT.md            # demo walkthrough
  application/                # Google Africa Applied AI Lab application assets
  packages/
    clinical-core/            # deterministic rule engine (pure TS, zero deps) + versioned rule data
    audit/                    # tamper-evident hash-chained audit log
    ai-gateway/               # Gemini integration + mandatory offline fallback
  apps/
    web/                      # Vite + React + TS + Tailwind PWA (offline-first demo)
  data/                       # synthetic cases & adversarial safety cases (JSON)
```

## Quickstart

Prerequisites: Node.js 18+ and npm.

```bash
npm install
cd apps/web
npm run dev
```

The demo is an offline-first PWA. **No API key and no network are required**: AI features run through a deterministic offline fallback (templated, rule-derived text), so the full PPH workflow works with zero connectivity. Live Gemini integration is designed but intentionally not wired into the demo path — see [`docs/BUILD_STATUS.md`](docs/BUILD_STATUS.md) for exactly what is built vs designed.

## Status

As of 2026-08-11: foundation documentation and clinical data authored; engine, app, and tests **in progress**. The single source of truth for current status is [`docs/BUILD_STATUS.md`](docs/BUILD_STATUS.md).

## Contributing rules (hard rules)

1. Synthetic data only — never real patient data.
2. The rule engine is the source of truth for all consequential clinical values; the LLM never originates doses, thresholds, or escalation decisions.
3. Every clinical rule must carry a guideline citation (organization, document, year/version, section).
4. Every output is labeled RULE-BASED or AI-GENERATED; human confirmation gates are never bypassed.
5. No claims of regulatory clearance or clinical outcomes anywhere in the repo.
6. Engineers code against [`docs/API_CONTRACTS.md`](docs/API_CONTRACTS.md) — it is normative; change it in the same commit as any contract change.

## License

Proprietary — all rights reserved (founder project, pre-incorporation).
