# MamaSafe AI — Product Requirements Document (PRD)

- **Product:** MamaSafe AI — offline clinical emergency copilot for Africa's frontline health workers
- **Platform lineage:** AnesthesiaOS Africa (safety-first perioperative AI platform)
- **Document status:** v1.0 — 2026-08-11 (draft for Google Africa Applied AI Lab application cycle)
- **Owner:** Founder / Product Architect
- **Governing documents:** `docs/FOUNDER_BRIEF.md` (authoritative spec), `plan.md` (build plan), `docs/SAFETY.md` (safety architecture), `docs/API_CONTRACTS.md` (engineering contracts)
- **Regulatory position:** Development and simulation only. **Not** FDA cleared, **not** CE marked, **not** approved for clinical use. See `docs/SAFETY.md` § Regulatory Positioning.

---

## 1. Product Summary

MamaSafe AI is an offline-first, multilingual, AI-assisted clinical workflow and emergency-escalation copilot for frontline healthcare workers in Nigeria and, later, across Africa. It converts verified clinical guidelines into actionable, step-by-step emergency workflows that help existing health workers **recognize emergencies earlier, execute critical protocols more consistently, and communicate referrals more effectively**.

MamaSafe AI is **clinical decision support**. It produces recommendations, never commands. A qualified human clinician must confirm every consequential action. The product never diagnoses autonomously, never treats autonomously, and never replaces clinical judgment.

The MVP proves one concept exceptionally well: a complete, end-to-end **postpartum hemorrhage (PPH) emergency workflow**, demonstrated entirely on **synthetic patient data** in a built-in simulation mode.

> **Central narrative (for the Google application):** Africa does not only face a shortage of clinicians. Frontline health workers frequently work under severe time, information, staffing, referral, and connectivity constraints. MamaSafe AI turns verified medical knowledge into offline, actionable clinical workflows that **multiply the capabilities** of the healthcare workers who are already there.

---

## 2. Problem Statement

Maternal hemorrhage remains a leading cause of preventable maternal death in Nigeria. The binding constraints at the point of care are rarely "knowledge does not exist" — they are:

- **Time:** emergencies evolve in minutes; guideline PDFs do not.
- **Staffing:** one midwife or CHEW may be alone at night in a primary healthcare center (PHC).
- **Information:** drug doses, escalation thresholds, and referral criteria must be recalled under stress.
- **Connectivity:** internet is intermittent; cloud-only tools fail exactly when they are needed.
- **Referral friction:** unstructured handoffs lose critical information; receiving facilities are unprepared.

Existing digital tools are typically cloud-dependent, English-only, chatbot-shaped (conversation rather than workflow), and silent on safety engineering. MamaSafe AI is designed against each of these failure modes.

---

## 3. Goals and Non-Goals

### 3.1 MVP Goals

| ID | Goal |
|---|---|
| G1 | Deliver one complete, excellent, end-to-end PPH emergency workflow: intake → risk → checklist → calculations → escalation → referral → handoff → audit. |
| G2 | Prove the safety architecture: deterministic rule engine as source of truth; generative AI confined to language, retrieval, explanation, and documentation; every output labeled RULE-BASED or AI-GENERATED; human confirmation gates. |
| G3 | Work offline-first on older Android devices via a Progressive Web App (PWA): cached pathways, local storage, deferred sync. |
| G4 | Demonstrate a meaningful Google AI story: Gemini (cloud) for intake structuring, explanation, documentation, translation, and simulation narration; Gemma (edge) exploration for offline language tasks; mandatory templated offline fallback so the demo never depends on a network or API key. |
| G5 | Provide a simulation mode using synthetic cases only, usable for training, demonstration, testing, research, and validation. |
| G6 | Produce an honest audit trail and the documentation set required for future regulatory scrutiny. |

### 3.2 Non-Goals for MVP (explicit)

| ID | Non-goal | Rationale |
|---|---|---|
| NG1 | Preeclampsia/eclampsia, maternal sepsis, newborn resuscitation modules | Architecture stubs only; PPH first. One excellent workflow beats fifteen partial ones. |
| NG2 | Live Gemini API calls in the shipped demo | Gateway + offline fallback are designed and implemented; live calls are deliberately out of the demo path so the demo is deterministic and safe. |
| NG3 | Autonomous diagnosis or treatment | Prohibited by design and by regulatory positioning. |
| NG4 | Real patient data of any kind | Synthetic data only, enforced as a hard rule. |
| NG5 | Google Maps / referral routing | Future capability; requires reliable local facility data. |
| NG6 | Integration with medical devices, monitors, or actuators | Simulation/clinical separation is architecturally enforced (AnesthesiaOS safety lineage). |
| NG7 | Claims of regulatory clearance, clinical validation, or mortality reduction | No such evidence exists; claims are prohibited. |
| NG8 | Multi-user facility administration, EHR/FHIR integration, billing | Post-MVP; API contracts are shaped to accommodate later. |
| NG9 | Full production localization | i18n scaffolding with English complete and Pidgin/Hausa/Yoruba/Igbo string-folder structure + translation-safety rules; professional clinical translation review is a post-MVP workstream. |

---

## 4. Users and Personas

| Persona | Description | Primary needs |
|---|---|---|
| **Midwife (PHC, rural)** | Often sole clinician on duty; conducts deliveries; first responder to PPH. | Instant protocol, dose calculation without mental arithmetic, clear escalation trigger, structured referral note. |
| **Nurse (secondary hospital)** | Works in maternity ward or emergency unit; variable obstetric experience. | Red-flag recognition, monitoring schedule, handoff structure. |
| **Community Health Officer / CHEW** | Community Health Extension Worker; frontline, limited formal training; first contact for many births. | Extremely clear language, missing-information prompts ("you must check X before Y"), conservative escalation defaults, patient/family explanation in local language. |
| **Physician (general duty, district hospital)** | Receives referrals; may not be an obstetrician. | SBAR handoff, physiologic summary, what has already been given and when. |
| **Anesthesia provider (nurse anesthetist / anesthesiologist)** | Called for emergency cesarean; hemorrhage preparedness. | Pre-anesthetic risk summary, blood-loss status, fluid/transfusion state, difficult-airway flags (AnesthesiaOS lineage). |
| **(Research/training) Educator & program evaluator** | Nursing/medical schools, NGO training programs. | Simulation mode, scenario library, measurable performance metrics, audit export. |

**Environment assumptions:** intermittent internet, low bandwidth, older Android devices, power instability, variable literacy, limited laboratory access, limited blood products, variable oxygen availability, referral delays. These are design constraints, not edge cases.

---

## 5. MVP Functional Requirements — PPH Workflow

Each requirement is numbered for traceability into tests and `docs/TEST_RESULTS.md`. Priority: **P0** = must for MVP demo; **P1** = MVP if time permits; **P2** = post-MVP.

### 5.1 Intake

| ID | Req | Description | Pri |
|---|---|---|---|
| FR-INT-1 | Structured intake form | Clinician can enter: age, pregnancy status, gestational age, weight (kg), systolic/diastolic BP, heart rate, respiratory rate, SpO₂, temperature, mental status, symptoms, estimated blood loss (mL), uterine tone, urine output, fetal heart rate (where available), relevant lab values, medications already given (with time), IV/IO access status, available medications, available blood products, facility capabilities, transfer options. | P0 |
| FR-INT-2 | Free-text / voice narration intake | Clinician can type (or later speak) a natural-language narrative; the AI gateway structures it into the `IntakePayload` schema for clinician review and correction before submission. | P1 (text), P2 (voice) |
| FR-INT-3 | Partial intake tolerance | The workflow must start from whatever is known. Missing critical fields trigger the missing-information detector (FR-RISK-4), not a blocker. | P0 |
| FR-INT-4 | Unit discipline | All values stored with explicit units. Weight-based calculations require weight in kg; if weight is unknown, the system flags it as missing critical information and offers estimation guidance rather than silently assuming. | P0 |

### 5.2 Risk Categorization and Red Flags

| ID | Req | Description | Pri |
|---|---|---|---|
| FR-RISK-1 | Risk categorization | Engine classifies the patient into a defined risk tier (e.g., STABLE / AT-RISK / EMERGENT / CRITICAL) from vitals, EBL, and context, using deterministic rules only. | P0 |
| FR-RISK-2 | Shock index | Engine computes shock index (HR/SBP) and applies configured thresholds; displayed with its derivation, never as a bare number. | P0 |
| FR-RISK-3 | Early-warning scoring | MEOWS-style early-warning aggregation of vital signs drives deterioration detection and re-assessment prompts. | P0 |
| FR-RISK-4 | Missing critical information detection | Engine lists exactly which decision-relevant fields are absent (e.g., uterine tone, IV access status, blood availability) with a plain-language reason each matters. This list is generated by the **rule engine** (deterministic), optionally re-phrased by AI but never expanded or invented by AI. | P0 |
| FR-RISK-5 | Red-flag display | Immediate red flags (e.g., SBP < 90, HR > 120, EBL ≥ 1000 mL, altered mental status) are surfaced prominently, each labeled RULE-BASED with its guideline citation. | P0 |

### 5.3 Prioritized Action Checklist

| ID | Req | Description | Pri |
|---|---|---|---|
| FR-ACT-1 | Pathway state machine | The PPH pathway is a deterministic state machine producing an ordered, prioritized action checklist consistent with the WHO treatment-bundle approach (uterine massage → uterotonics → TXA within 3 hours → escalation of care) and configured local adaptations. | P0 |
| FR-ACT-2 | Action gating | Each action item shows: what to do, why (source citation), prerequisites, contraindications checked, and an explicit **clinician confirm/defer/override** control. Checking an action off requires a human tap; nothing auto-completes. | P0 |
| FR-ACT-3 | Contraindication checks | Drug suggestions carry deterministic contraindication screening (e.g., ergometrine withheld in hypertension/preeclampsia context) drawn from the rule engine — never from LLM recall. | P0 |
| FR-ACT-4 | Re-prioritization | Checklist re-orders as new observations arrive (vitals trend, ongoing bleeding, actions completed). | P0 |

### 5.4 Medication and Fluid Calculations

| ID | Req | Description | Pri |
|---|---|---|---|
| FR-CALC-1 | Weight-based dosing | Deterministic dose calculations for oxytocin, tranexamic acid, misoprostol, and (with contraindication gate) ergometrine — route, dose, concentration handling, max cumulative dose. All formulas live in the version-controlled rule engine. | P0 |
| FR-CALC-2 | Fluid / transfusion guidance | Crystalloid volume guidance and blood-product request prompts when thresholds met; conservative defaults for blood-scarce facilities. | P0 |
| FR-CALC-3 | Calculation transparency | Every calculated value shows inputs, formula, and citation. The clinician can independently verify before confirming. AI never performs arithmetic. | P0 |

### 5.5 Monitoring

| ID | Req | Description | Pri |
|---|---|---|---|
| FR-MON-1 | Monitoring plan | Engine generates a monitoring schedule (vitals frequency, blood-loss reassessment, urine output, mental status) appropriate to risk tier and resources. | P0 |
| FR-MON-2 | Re-entry of observations | New observations re-run risk categorization and can trigger escalation (FR-ESC-1). | P0 |

### 5.6 Escalation and Referral

| ID | Req | Description | Pri |
|---|---|---|---|
| FR-ESC-1 | Escalation decision | Deterministic escalation thresholds produce `EscalationDecision`: urgency tier, reason codes, what to do while awaiting transfer. Fail-safe default: ambiguous data escalates, never de-escalates. | P0 |
| FR-ESC-2 | Referral recommendation | Recommendation to refer, with capability requirements of the receiving facility (e.g., surgery, blood) stated explicitly. | P0 |
| FR-REF-1 | Structured referral note | System generates a complete structured referral note (patient summary, timeline, vitals trend, EBL, actions taken with times, doses given, current status, needs at receiving facility). Rule-derived facts; AI may format language only. | P0 |
| FR-REF-2 | SBAR handoff | Situation-Background-Assessment-Recommendation handoff draft for phone/radio or in-person transfer; read-back supported (FR-VOICE-1). | P0 |

### 5.7 Voice, Explanation, and Patient Communication

| ID | Req | Description | Pri |
|---|---|---|---|
| FR-VOICE-1 | Voice read-back | The SBAR/referral content can be read aloud (device TTS) so a clinician with hands full can verify by listening. Read-only voice tier: voice never issues or confirms clinical actions. | P1 |
| FR-PAT-1 | Patient/family explanation | Plain-language, patient-facing explanation of what is happening and what the team is doing, in the selected language. Patient-facing strings are a separate string domain from clinician-facing strings (see §6). | P1 |

### 5.8 Audit Record

| ID | Req | Description | Pri |
|---|---|---|---|
| FR-AUD-1 | Audit trail | Every intake submission, risk assessment, checklist confirmation, override, escalation, note generation, and AI call produces a tamper-evident, hash-chained audit event with timestamps, actor, rules version, pathway version, and model version (when AI involved). | P0 |
| FR-AUD-2 | Audit visibility | The audit trail is viewable in the UI (and exportable later), reinforcing that the system is documentation-support, not a black box. | P0 |

### 5.9 Simulation Mode

| ID | Req | Description | Pri |
|---|---|---|---|
| FR-SIM-1 | Synthetic scenario library | At minimum, the canonical synthetic case from the founder brief: 29-year-old, just delivered, HR 124, BP 88/52, ongoing bleeding, EBL 1,100 mL, weakness/dizziness, uterine tone + IV access + available meds/blood specified. | P0 |
| FR-SIM-2 | Responsive patient state | In simulation, patient status evolves in response to clinician actions (and inaction), so the workflow is exercised, not just displayed. | P1 |
| FR-SIM-3 | Simulation/clinical separation | Simulation mode is visually unmistakable (persistent banner + synthetic-data watermark) and can never ingest real patient identifiers. | P0 |

---

## 6. Offline-First and Multilingual Requirements

### 6.1 Offline-first

| ID | Req | Pri |
|---|---|---|
| FR-OFF-1 | The PWA installs and fully runs the PPH workflow with **zero network**: pathways, rules, calculations, checklist, referral-note structure, audit log. | P0 |
| FR-OFF-2 | Clinical pathways and rules ship as versioned, cached data; version stamp visible; stale-version warning after configurable age. | P0 |
| FR-OFF-3 | Local persistence via IndexedDB: case state, audit events, and settings survive reload and device restart. | P0 |
| FR-OFF-4 | Deferred sync: audit and (future, consented) analytics queue locally and sync when connectivity returns; conflict policy documented in `docs/ARCHITECTURE.md`. | P1 |
| FR-OFF-5 | AI features degrade gracefully: when Gemini is unreachable, the offline fallback (templated, rule-derived text) supplies explanations/handoffs, clearly labeled; no clinical content is lost. | P0 |
| FR-OFF-6 | SMS fallback (concept stage): referral note can be compressed into an SMS-sized structured summary for transfer coordination where data is unavailable. Documented concept; not required for the demo. | P2 |

### 6.2 Multilingual

| ID | Req | Pri |
|---|---|---|
| FR-I18N-1 | String architecture supports English, Nigerian Pidgin, Hausa, Yoruba, and Igbo from day one (folder/locale scaffold), with English complete for MVP. | P0 |
| FR-I18N-2 | **Two language domains:** clinician-facing strings (technical, precise) and patient-facing strings (plain, reassuring) are separate resources and never mixed. | P0 |
| FR-I18N-3 | **Translation safety invariant:** medication names, concentrations, doses, units, thresholds, and numeric protocol values are **never translated**. Translation pipelines must treat them as protected tokens; the AI gateway translation contract enforces this (`docs/API_CONTRACTS.md`). | P0 |
| FR-I18N-4 | Translations of patient-facing safety content require qualified human review before release; machine-translated strings are labeled as drafts. | P1 |

---

## 7. Success Metrics — Simulation-Phase Research

These metrics define the evaluation plan for the simulation-phase research program (and double as the Google demo's credibility story). No clinical-outcome claims are made or implied.

| Metric | Definition | Target (simulation phase) | Measured via |
|---|---|---|---|
| **Recognition time** | Time from case presentation to clinician identifying "this is a PPH emergency" | Reduction vs. unaided control scenario | Simulation timestamps (audit log) |
| **Critical action completion** | % of pathway-critical actions completed within the scenario window | Higher completion and more correct ordering vs. control | Checklist audit events |
| **Calculation accuracy** | % of dose/fluid calculations performed without arithmetic error | ≥ target threshold; system-calculated values used as verifier | Rule-engine comparison |
| **Guideline adherence** | % of actions consistent with the referenced guideline pathway | Improvement vs. control | Expert-scored simulation recordings |
| **Referral-note completeness** | % of required referral-note elements present and correct | Near-complete with system vs. baseline | Structured scoring rubric |
| **Usability** | SUS (System Usability Scale) + task-level success | SUS ≥ target threshold | Post-scenario survey |
| **Clinician workload** | NASA-TLX or equivalent | No increase vs. control; ideally reduced | Post-scenario survey |
| **Unsafe-output rate** | Rate of unsafe AI outputs (hallucinated guidance, fabricated citations, wrong doses escaping review, translation errors altering clinical meaning) across the evaluation suite | Zero tolerance for uncaught unsafe outputs in the shipped configuration | Safety evaluation suite (`docs/SAFETY.md` §8) |

Pilot-phase metrics (later, not MVP): referral quality, workflow completion in real settings, time to escalation, treatment delays. **Mortality or morbidity claims are prohibited** until supported by adequate evidence.

---

## 8. Experience Principles

1. **Calm under pressure.** High-alert visual design only for true red flags; no alarm fatigue.
2. **Every number is checkable.** No unexplained scores; derivation and citation always one tap away.
3. **The clinician is the pilot.** The system proposes; the human disposes. Overrides are first-class, logged, and never punished by UX friction beyond a reason prompt.
4. **Honest provenance.** RULE-BASED vs AI-GENERATED labeling is visible wherever output appears, not buried in settings.
5. **Works where it is needed.** Offline is the default assumption, not the degraded mode.

---

## 9. Release Criteria for the MVP Demo

- [ ] Full PPH workflow runs end-to-end offline in the PWA on the synthetic case set.
- [ ] All P0 requirements verified by automated and/or scripted tests, recorded in `docs/TEST_RESULTS.md`.
- [ ] Safety evaluation suite passes with zero uncaught unsafe outputs in shipped configuration.
- [ ] Audit trail complete and hash-chain verifiable for a demo session.
- [ ] `docs/BUILD_STATUS.md` accurately reflects what is built vs designed.
- [ ] No regulatory-clearance language anywhere in product, docs, or application assets.

---

*This PRD is a living document. Changes to P0 requirements require updating `docs/API_CONTRACTS.md` and `docs/SAFETY.md` in the same change.*
