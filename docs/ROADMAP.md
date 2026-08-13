# MamaSafe AI — Product Roadmap

- **Document status:** v1.0 — 2026-08-11
- **Horizon:** Phases 1–6 per the founder brief. Dates are directional, not commitments; sequencing logic is the point.
- **Governing principle:** one excellent working workflow is more valuable than fifteen partial modules. Each phase must clear its own safety bar (evaluation suite, honest build status) before the next begins.

---

## Phase Overview

| Phase | Product | Scope | Platform reuse | Status |
|---|---|---|---|---|
| 1 | **MamaSafe AI** | Maternal + newborn emergencies; MVP = PPH workflow end-to-end | Establishes the platform: rule engine, audit spine, AI gateway, offline PWA, i18n, referral engine | **Active** (foundation + MVP build) |
| 2 | **Pediatric Emergency Copilot** | Pediatric emergencies incl. severe malaria, sepsis, dehydration, shock; pediatric dosing guardrails | New rule packs + pediatric intake extension on the same engine; stricter dosing guardrails | Architecture stub |
| 3 | **SickleSafe Nigeria** | Sickle-cell management, prevention, genetic education | Shared audit, i18n, offline engine; adds longitudinal-care data model | Concept |
| 4 | **MalariaShield AI** | Clinical malaria support + public-health intelligence | Adds geospatial/analytics services on top of clinical platform | Concept |
| 5 | **VaxReach AI** | Immunization outreach, zero-dose reduction | Reuses offline engine, multilingual messaging, CHW dashboard patterns | Concept |
| 6 | **Africa Clinical Copilot** | Unified frontline platform (maternal, pediatric, malaria, sickle-cell, NCD, perioperative) | All prior phases converge; clinical packages plug into shared services | Vision |

---

## Phase 1 — MamaSafe AI (current)

**Goal:** prove the concept and the safety architecture with one workflow done exceptionally well.

| Milestone | Content | Exit criteria |
|---|---|---|
| 1a. Foundation | Repo, docs (PRD, architecture, contracts, safety), clinical data + citations, application assets | Docs complete; clinical rule data cited and reviewed |
| 1b. PPH MVP | Engine + audit + AI gateway (offline fallback) + PWA demo + simulation mode + tests | Demo runs offline end-to-end; test suite green; safety suite zero uncaught unsafe outputs |
| 1c. Google application | 23 application assets + demo script + video script | Submission-ready |
| 1d. Secondary maternal modules | Severe preeclampsia/eclampsia (Mg safety checks, antihypertensive pathway), maternal sepsis, obstetric anesthesia preparation (AnesthesiaOS integration) | Each module passes its own rule review + adversarial suite |
| 1e. Newborn resuscitation + simulation-phase research | Newborn module; usability/performance study with clinicians | Research metrics collected per PRD §7 |

**Google AI integration trajectory:** MVP ships the gateway + offline fallback; post-MVP wires live Gemini calls (intake structuring, drafting, translation, simulation narration), explores Gemma for edge inference, and prototypes Vertex AI evaluation/monitoring. Maps/geospatial referral routing only when reliable local facility data exists.

---

## Phase 2 — Pediatric Emergency Copilot

**Scope:** pediatric sepsis, severe malaria, respiratory distress/pneumonia, dehydration and severe diarrhea, hypoglycemia, seizures, meningitis danger signs, shock, severe anemia, malnutrition-related emergencies, neonatal emergencies; pediatric airway support guidance.

**Platform reuse and new work:**

- **Reuses:** rule engine, pathway state-machine pattern, AI gateway, audit spine, offline PWA, i18n layer, referral engine, medication library (extended).
- **New:** pediatric intake extension (age, weight, weight-estimation aids), age-banded normal vital-sign ranges, pediatric rule packs, and **aggressive pediatric dosing guardrails** — weight-band verification, max-dose caps, double-check prompts. Pediatric dosing errors get a dedicated evaluation battery (SAFETY.md §8), carried over from Phase 1 design.

**Sequencing rationale:** pediatrics is second because it reuses the most platform and addresses the next-largest frontline emergency burden; its dosing-risk profile forces the guardrail architecture early, benefiting all later modules.

## Phase 3 — SickleSafe Nigeria

**Scope:** longitudinal sickle-cell care — crisis history and individual baselines, pain-crisis plans, fever and acute-chest/stroke warning pathways, transfusion and medication history, hydroxyurea adherence support, appointment/vaccination reminders, pregnancy monitoring; pediatric sickle-cell care (newborn screening tracking, prophylaxis reminders, growth, parent education); non-stigmatizing genotype education and an interactive inheritance-probability counseling tool (AS/AC/SS/SC) framed strictly as educational support.

**Platform reuse and new work:**

- **Reuses:** audit, i18n (patient-facing education is the multilingual priority here), offline engine, medication library, escalation pathways.
- **New:** longitudinal (not just episodic) care data model; reminder/scheduling service; education-content service. This phase introduces the platform's first **chronic-care** workload, which later NCD modules (hypertension, diabetes) build on.

**Sequencing rationale:** requires the longitudinal data model; deliberately after the emergency-care platform is proven.

## Phase 4 — MalariaShield AI

**Scope:** clinical support (RDT result recording, danger-sign recognition, severe-malaria referral, pregnancy-related malaria, pediatric danger signs, adherence/follow-up) **plus** public-health intelligence: using rainfall, temperature, case reports, vector trends, medication and RDT inventory, and geography to predict outbreaks, hotspots, medicine/RDT demand, and outreach priorities for PHCs, health ministries, NGOs, and malaria programs.

**Explicit non-goal (from the founder brief):** not a symptom-only malaria diagnostic chatbot.

**Platform reuse and new work:** clinical side reuses Phase 1–2 modules wholesale (severe malaria is already a pediatric module). **New:** analytics data plane (kept strictly separate from clinical operations data per governance), forecasting models, geospatial services, program dashboards.

**Sequencing rationale:** its public-health half needs analytics infrastructure and real program partnerships; building it after clinical credibility is established reduces partnership friction.

## Phase 5 — VaxReach AI

**Scope:** reduce zero-dose and under-immunized children — identify children likely to miss vaccination, predict dropout, generate outreach lists, optimize mobile vaccination routes, forecast vaccine demand, identify geographic gaps, parent reminders, multilingual education, missed-appointment tracking, incomplete-record detection, CHW dashboard. Privacy-first by design.

**Platform reuse and new work:** reuses offline engine, multilingual messaging, CHW-facing UX patterns, geospatial services from Phase 4. **New:** population-registry data model with strict minimization, outreach optimization.

**Sequencing rationale:** operationally depends on partnerships (immunization programs) and on geospatial infrastructure proven in Phase 4.

## Phase 6 — Africa Clinical Copilot

**Scope:** the unified frontline platform — maternal, pediatric, malaria, sickle-cell, hypertension, diabetes, sepsis, emergency triage, perioperative medicine and anesthesia (full AnesthesiaOS integration), medication safety, referral — as **clinical packages plugging into shared services** (shared patient data model, rule engine, RAG, audit, localization, offline engine, medication library, referral engine).

**Sequencing rationale:** this is an integration-and-scale phase, not a new-build phase. It exists as a credible vision precisely because Phases 1–5 each hardened one platform capability.

---

## Cross-Phase Tracks (continuous)

| Track | Notes |
|---|---|
| Safety & evaluation | Evaluation suite grows per module; every model/rules/prompt change passes it. Safety incident protocol always active. |
| Regulatory strategy | Phase 1 = simulation only. Formal regulatory pathway planning begins before any real-patient pilot; no clinical claims until clearance. |
| Data governance | Clinical/analytics/research/training separation enforced from Phase 1; Nigerian data-protection compliance; training use never automatic. |
| Localization | English complete in Phase 1; Pidgin/Hausa/Yoruba/Igbo patient-facing content professionally reviewed module-by-module; protected-token invariant permanent. |
| SafeAccess (confidential care) | Designed but **not deployed** without community partners, formal privacy/safety review, threat modeling, and human-rights review. Deliberately outside the numbered phases. |
| Commercial model | Facility subscriptions, enterprise/government licensing, NGO-supported deployment, training licenses, API licensing; essential emergency functionality kept affordable. |

## Honest Risk Notes

- Phase timing depends on partnerships and regulatory work outside engineering control; the roadmap sequences *dependencies*, not dates.
- Each phase's clinical content requires its own expert review cycle; content review capacity is the most likely bottleneck, not software.
- Public-health phases (4–5) require real program data agreements that do not exist yet; they remain concepts until then.

---

*Roadmap changes are recorded here with dates. `docs/BUILD_STATUS.md` tracks what is actually built.*
