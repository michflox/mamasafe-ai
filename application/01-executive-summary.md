# 1. Executive Summary

**MamaSafe AI** is an offline-first, multilingual clinical workflow and emergency-escalation copilot for frontline health workers in Nigeria and, over time, across Africa. Its first product proves one thing exceptionally well: guiding a health worker through a postpartum hemorrhage (PPH) emergency — the single leading cause of maternal death worldwide — from first recognition to structured referral, with or without an internet connection.

## The problem

Africa does not only face a shortage of clinicians. The health workers who *are* there operate under severe time, information, staffing, referral, and connectivity constraints. Sub-Saharan Africa carries about 70% of the world's maternal deaths (≈202,000 of 287,000 in 2020), with a regional maternal mortality ratio of 545 per 100,000 live births [UN MMEIG, *Trends in maternal mortality 2000 to 2020*, 2023]. Nigeria alone recorded an estimated 82,000 maternal deaths in 2020 — over a quarter of the global total — with an MMR of 1,047 per 100,000 [UN MMEIG country profile, 2023]. Haemorrhage is the leading cause, responsible for ~27% of maternal deaths globally and the highest share in sub-Saharan Africa [Cresswell et al., WHO systematic analysis, *Lancet Global Health*, 2025]. Meanwhile, WHO projects a global shortfall of ~10 million health workers by 2030, concentrated in low- and lower-middle-income countries [WHO, 2023]. We cannot train our way out of this gap on any realistic timeline — so we must multiply the capability of the workforce that already exists.

## The product

MamaSafe AI converts verified medical guidelines (WHO, FIGO, Nigerian FMOH-configured protocols) into executable, offline clinical workflows. A midwife, nurse, CHEW, or physician enters or speaks the patient's findings; the system returns a risk categorization, red flags, missing critical information, a prioritized action checklist, weight-based medication and fluid calculations, escalation thresholds, a referral recommendation, a structured referral note and SBAR handoff, and a complete audit record. **A deterministic clinical rule engine — not the language model — is the source of truth for every dose, threshold, contraindication, and escalation criterion.** Gemini powers what language models are genuinely good at: structuring free-text and voice intake, guideline-grounded question answering, drafting handoffs and referral notes, translation, and simulation. Every consequential output requires explicit human confirmation. AI assists, never replaces.

## What exists today

A working PPH demonstration, running in simulation mode on synthetic cases, including the flagship 29-year-old postpartum case (HR 124, BP 88/52, estimated blood loss 1,100 mL): the system detects the emergency (shock index 1.4), launches the PPH pathway, walks the clinician through uterotonics and time-critical TXA, enforces contraindication checks, documents every confirmation, and generates the referral handoff — **fully offline**. Simulation mode lets clinicians train and lets reviewers evaluate the product with zero real-patient exposure.

## The founder

A practicing CRNA/anesthesia clinician, healthcare researcher, and AI builder, working on the safety-first AnesthesiaOS perioperative platform. Founder-market fit is direct: hemorrhage resuscitation, emergency airway and hemodynamic management, medication safety, and clinical governance are the daily substance of anesthesia practice — and the architectural discipline of AnesthesiaOS (simulation-only operation, mandatory provider oversight, immutable audit) is carried wholesale into MamaSafe AI.

## Why Google, why now

The product is architected around Google AI where it creates genuine value: **Gemini** for intake structuring, grounded Q&A, handoff generation, translation, and simulation; **Gemma** for offline edge inference in low-connectivity facilities; **Vertex AI** for evaluation, guardrails, monitoring, and version control; and later **Google Maps Platform** for referral routing where reliable facility data exist. The Africa Applied AI Lab is the natural home for a responsible, offline-capable, Africa-first clinical AI.

## The business

Facility subscriptions, state/federal government licensing, NGO-supported deployment, training licenses for nursing/medical/anesthesia programs, and later API licensing — with a firm commitment that essential emergency functionality stays affordable for the primary-health centers that need it most. One excellent, safe workflow (PPH) scales to preeclampsia/eclampsia, maternal sepsis, newborn resuscitation, pediatrics, and ultimately a unified Africa Clinical Copilot on shared infrastructure.

## The ask

Admission to the Google Africa Applied AI Lab: technical mentorship on Gemini/Gemma edge deployment and Vertex AI safety evaluation; collaboration on multilingual clinical grounding for English, Nigerian Pidgin, Hausa, Yoruba, and Igbo; and partnership on a rigorous simulation-phase evaluation leading to ethically governed pilots in Nigerian facilities.
