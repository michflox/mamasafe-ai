# 14. Pilot Proposal

## Positioning

This is a proposal for a **staged, ethics-first pilot pathway** — deliberately conservative. MamaSafe AI is in development/simulation; no real-patient use occurs until each preceding stage is completed, independently reviewed, and ethically approved. The staging is the credibility.

## Stage A — Simulation-based deployment (proposed first step; no patient contact)

**Setting:** 2–3 training institutions (nursing/midwifery schools, an anesthesia training program) plus 5–10 partner primary-health centers and secondary facilities in one Nigerian state, using the product in **simulation mode only** with synthetic cases.

**Objectives:**
- Validate usability and workflow fit with real frontline workers (midwives, nurses, CHEWs, community health officers) on the devices and in the environments they actually use — including offline conditions and power instability.
- Measure simulation-phase endpoints (below).
- Collect structured qualitative feedback on language, alert design, confirmation friction, and referral-note utility.

**Endpoints (simulation phase):**
- Emergency recognition time (case start → correct emergency identified)
- Critical action completion rate (uterotonics, TXA within the time window, escalation triggered appropriately)
- Medication-calculation accuracy (system-derived vs. participant-independent)
- Guideline adherence (checklist fidelity)
- Referral-note completeness (structured scoring of generated handoffs)
- Usability (SUS or equivalent) and clinician workload (NASA-TLX or equivalent)
- Unsafe AI outputs (count and classification — target: zero consequential-rule violations; the architecture makes rule violations structurally impossible, so this endpoint measures the generative layer's labeling and grounding fidelity)

**Duration:** ~3 months. **Oversight:** facility training leads; no ethics-board patient-research approval required (no patients), but institutional sign-off obtained.

## Stage B — Shadow-mode pilot (documentation-only, alongside care)

**Setting:** the same partner facilities, after Stage A exit criteria are met.

**Design:** the product runs **alongside** standard care on real shifts with real staff, but its outputs are **not used for clinical decisions**. Clinicians record what they actually did per standard of care; the system's parallel outputs are logged for comparison. Differences are reviewed by an independent clinical panel.

**Objectives:** measure concordance between rule-engine outputs and actual guideline-concordant care; detect any unsafe divergence before it could ever matter; characterize alert burden and confirmation behavior in real workflow; validate the audit pipeline with real operational tempo (still with strict data governance and consent).

**Gate to Stage C:** zero unresolved unsafe divergences; independent clinical review sign-off; facility governance approval.

**Ethics & governance:** full institutional/ethics-committee review in Nigeria; Nigerian data-protection compliance; staff consent; patient data minimization and de-identification; no model training on pilot data without separate consent and approval.

## Stage C — Supported-use pilot (decision support in care, supervised)

**Setting:** selected facilities from Stage B, with physician oversight structures in place.

**Design:** MamaSafe AI outputs may inform care, with mandatory clinician confirmation (as architected), predefined escalation of any system-clinician disagreement, continuous audit review, and a standing safety committee with stop authority.

**Endpoints (pilot phase):** referral quality (receiving-facility rating), workflow completion, time to escalation, documentation completeness, treatment delays, and near-miss/unsafe-event surveillance.

**Explicit non-endpoints:** we do not power or claim mortality reduction at this stage. If a future, adequately powered outcomes study becomes feasible with partners, it will be designed separately and preregistered.

## Partnerships sought

- A state ministry of health (or its innovation/PHC agency) as facility-network sponsor and protocol-configuration partner.
- A maternal-health NGO or development partner as co-funder and field-operations partner.
- A Nigerian academic clinical unit as independent evaluator.
- Google Africa Applied AI Lab as technical partner for evaluation rigor (Vertex AI pipelines) and multilingual grounding validation.

## Risk management within the pilot

| Risk | Mitigation |
|---|---|
| Alert fatigue in real workflow | Severity-tiered alerts; burden measured in Stage B; thresholds tuned before Stage C |
| Automation bias | Confirmation design enforces rule+citation visibility; training reinforces verification; disagreement auditing |
| Data-protection breach | Encryption, role-based access, minimum-necessary data, local governance review, incident-response protocol |
| Workflow disruption | Shadow mode first; rollout only after measured fit; facility champions co-design |
| Scope creep to unsupported use | Written intended-use and prohibited-use terms in every pilot agreement; audit monitoring for misuse patterns |

## What the Lab's support changes

The Lab partnership compresses the timeline to *rigorous* evidence: Vertex AI evaluation infrastructure for the safety suite, Gemini/Gemma expertise for multilingual grounding validation with community reviewers, and credibility that opens ministry and NGO doors. What it does not change: the staging discipline. We will not skip Stage A.
