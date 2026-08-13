# 3. Product Description

## What it is

**MamaSafe AI** is an offline-first, multilingual clinical workflow and emergency-escalation copilot for frontline health workers, built on the safety-first AnesthesiaOS Africa platform. Its first clinical focus is maternal, obstetric, newborn, and perioperative emergencies — launched through one flagship workflow executed to excellence: **postpartum hemorrhage (PPH)**.

Positioning, stated precisely: MamaSafe AI provides **AI-assisted clinical decision support, workflow execution, training, documentation, and referral coordination**. It is not autonomous diagnosis and not autonomous treatment. It produces recommendations; a human clinician confirms before any consequential action. Every screen, document, and demo in this application reflects that boundary.

## Who uses it

Midwives, nurses, community health officers, community health extension workers (CHEWs), physicians, anesthesia providers, and rural health workers — in primary healthcare centers, secondary hospitals, and emergency units, including facilities with intermittent power and connectivity.

## The core experience

A clinician enters or speaks the essentials: age, pregnancy status, gestational age, weight, blood pressure, heart rate, respiratory rate, oxygen saturation, temperature, mental status, symptoms, estimated bleeding, urine output, fetal heart rate where available, relevant laboratory values, medications already given, available resources, facility capabilities, and transfer options.

The system returns, in prioritized order:

1. Risk categorization (including shock index and early-warning scoring)
2. Immediate red flags
3. Missing critical information — the system asks for what it needs
4. A prioritized action checklist following the verified guideline pathway
5. The relevant source-linked guideline pathway, with organization, document, year, and section
6. Weight-based medication calculations where clinically appropriate
7. Fluid and transfusion calculations when appropriate
8. Monitoring recommendations
9. Escalation thresholds — stated in advance, not discovered late
10. Referral recommendation
11. A structured referral note
12. An SBAR-style handoff
13. Voice read-back of critical information
14. A patient/family explanation in plain, local language
15. A complete, tamper-evident audit record

## The flagship workflow: postpartum hemorrhage

The PPH pathway encodes the standard of care as executable logic: recognition and call for help → uterine massage and uterotonics (oxytocin first-line) → time-critical tranexamic acid (1 g IV, within 3 hours of birth, per WHO 2017 and the WOMAN trial evidence) → second-line uterotonics with automated contraindication screening (e.g., ergometrine withheld in hypertensive disorders) → fluid resuscitation and transfusion logic adapted to local blood-product availability → continuous reassessment via shock index and vital-sign trajectories → explicit escalation and referral thresholds → structured handoff. Doses, maximums, contraindications, and thresholds come **only** from the deterministic rule engine, version-controlled and cited to WHO, FIGO, Nigerian FMOH-configured protocols, and ACOG/RCOG as secondary references.

## Simulation mode

Because this is a healthcare product under development, the demonstration and training environment is a full simulation mode using **synthetic cases only** — never real patient data. The flagship synthetic case: a 29-year-old woman immediately post-delivery, HR 124, BP 88/52, ongoing bleeding, estimated blood loss 1,100 mL, weakness and dizziness, with uterine-tone, IV-access, medication, and blood-product information to gather. The simulated patient deteriorates or stabilizes in response to the clinician's actions. Simulation mode serves training, demonstration, testing, and research — a powerful, zero-risk way to evaluate the product.

## Built vs. designed (honest status)

| Status | Scope |
|---|---|
| **Built — demonstrable today** | PPH end-to-end workflow in simulation mode: intake → risk categorization → red flags/missing info → prioritized checklist → rule-engine medication/fluid calculations → escalation thresholds → referral note + SBAR handoff → confirmation logging → audit trail → offline operation |
| **Designed — in active build** | Gemini live integration via the AI gateway (the demo ships with a mandatory offline, rule-derived fallback requiring no API key and no network); severe preeclampsia/eclampsia, maternal sepsis, newborn resuscitation modules (architecture stubs); clinician-facing vs. patient-facing multilingual string separation |
| **Roadmap** | Gemma on-device inference, Vertex AI evaluation/guardrails pipeline, Maps-based referral routing, obstetric-anesthesia module (AnesthesiaOS integration), pediatric, sickle-cell, malaria, and immunization platforms |

## Design constraints honored everywhere

Offline-first (progressive web app and Android path, cached pathways, local storage, deferred synchronization); older Android devices; low bandwidth; multiple Nigerian languages with **clinical terms, drug names, concentrations, doses, and thresholds never translated**; separate clinician-facing and patient-facing language layers; and Nigerian data-protection-aware governance with clinical, analytics, research, and model-training data strictly separated. Patient data is never automatically used for model training.
