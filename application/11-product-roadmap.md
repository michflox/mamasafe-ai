# 11. Product Roadmap

## Sequencing principle

One excellent, safe, working workflow is worth more than fifteen partial modules. The roadmap therefore deepens before it widens: PPH to excellence, then the adjacent maternal emergencies that share its infrastructure, then the platform phases — never at the expense of the safety pipeline.

## Phase 0 — Flagship proof (current)

**Postpartum hemorrhage, end to end, in simulation.**

- ✅ Built/demonstrable: PPH intake → risk categorization (shock index, early-warning scoring) → red flags and missing-information detection → prioritized action checklist → rule-engine weight-based medication and fluid calculations → escalation thresholds → referral recommendation → structured referral note + SBAR handoff → confirmation logging → tamper-evident audit trail → offline operation.
- 🔨 In active build: Gemini live integration through the AI gateway (offline fallback is the shipping default); clinician-facing vs. patient-facing string separation; expanded synthetic case library and adversarial safety cases.
- Gate to next phase: full clinical safety evaluation suite passing; external clinical review of the PPH pathway against WHO/FIGO sources documented in `docs/CLINICAL_SOURCES.md`.

## Phase 1 — Maternal emergency suite (next 2 quarters)

Modules that reuse ~90% of the PPH infrastructure:

1. **Severe preeclampsia / eclampsia** — severe-range BP recognition, neurologic symptoms, seizure workflow, magnesium safety checks and toxicity warnings, antihypertensive pathway, fetal considerations, transfer escalation, monitoring.
2. **Maternal sepsis** — early recognition, deterioration tracking, escalation, locally configured antibiotic-pathway guidance, fluids, monitoring, referral.
3. **Obstetric deterioration** — early-warning-driven surveillance across postpartum patients.
4. **Newborn resuscitation** — first-minute assessment and action sequencing.
5. **Referral and escalation engine v2** — facility-capability directories, structured transfer documentation refinement.

Plus: Gemini intake/grounding live behind feature flags; multilingual clinician/patient layers (English + Nigerian Pidgin first, then Hausa/Yoruba/Igbo with community validation); Vertex AI evaluation pipeline operational; simulation-mode scenario library for all live modules.

## Phase 2 — Obstetric anesthesia and perioperative (AnesthesiaOS integration)

Emergency cesarean preparation, obstetric anesthesia preparation, preoperative assessment, anesthetic risk identification, neuraxial considerations, difficult-airway preparedness, hemorrhage preparedness, postoperative monitoring, emergency conversion planning. This is where the founder's AnesthesiaOS lineage becomes a direct product advantage.

## Phase 3 — Pediatric Emergency Copilot

Reusable pediatric components first (age/weight handling, weight estimation, dosing, fluid calculations, age-adjusted normal ranges and emergency thresholds — with aggressive dosing-error protection), then modules: pediatric sepsis, severe malaria, respiratory distress/pneumonia, dehydration and severe diarrhea, hypoglycemia, seizures, shock, severe anemia, neonatal emergencies, malnutrition-related emergencies.

## Phase 4 — SickleSafe Nigeria

Sickle-cell management and prevention: crisis history and baselines, pain-crisis plans, fever and acute-chest warnings, transfusion and medication history, hydroxyurea adherence support, reminders; pediatric sickle-cell care (newborn-screening tracking, prophylaxis and vaccination reminders, growth, fever escalation, parent education); culturally appropriate, non-stigmatizing genotype education (AS/AC/SS/SC) with an interactive inheritance-probability education tool framed as educational support, never reproductive coercion.

## Phase 5 — MalariaShield AI

Clinical support (RDT result recording, danger-sign recognition, severe-malaria referral, pregnancy-related malaria, pediatric danger signs, adherence and follow-up) plus public-health intelligence (outbreak/hotspot signals, medicine and RDT demand forecasting, outreach prioritization from rainfall, temperature, case reports, vector trends, inventory, and geography). Explicitly **not** a symptom-only chatbot.

## Phase 6 — VaxReach AI

Zero-dose and under-immunized-child outreach: dropout prediction, outreach lists, mobile-vaccination route optimization, demand forecasting, geographic-gap identification, multilingual parent reminders, CHW dashboards — with privacy-preserving design throughout.

## Phase 7 — Africa Clinical Copilot

The unified platform: maternal health, pediatrics, malaria, sickle cell, hypertension, diabetes, sepsis, emergency triage, perioperative medicine, anesthesia, medication safety, and referral — as clinical packages plugging into shared infrastructure (patient data model, rule engine, knowledge/retrieval system, audit system, localization layer, offline engine, medication library, referral engine).

## Cross-cutting tracks (continuous, every phase)

- **Safety & evaluation:** adversarial suite expansion per module; no module ships without its gate passing.
- **Offline & edge:** Gemma on-device inference tiers; deferred-sync hardening; low-resource device support.
- **Localization:** language packs with clinical-terminology protection (doses/drug names/thresholds never translated); community validation per language.
- **Governance:** data-protection compliance per country; clinical/analytics/research/training data separation; audit and version control.
- **Geospatial:** Google Maps referral routing piloted only where reliable facility/road data exist.
- **Evidence:** simulation-phase studies now; ethically governed pilot studies at Phase 1–2; no outcome claims without adequate evidence.

## Honest dependencies

Phase timing depends on: clinical-content governance bandwidth (each module requires expert-reviewed, cited pathways), pilot partner availability, Google Lab collaboration depth (Gemini/Gemma/Vertex), and funding. We would rather ship Phase 1 late and safe than early and unverified.
