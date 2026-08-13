# 15. Research Proposal

## Research posture

MamaSafe AI's evidence program is designed to be publishable, preregisterable, and honest. The governing rule from the founder brief stands: **we do not claim mortality reduction without sufficient evidence.** The program builds causal warrant step by step — simulation performance first, workflow outcomes second, clinical outcomes only when a properly powered, ethically approved study exists.

## Study 1 — Simulation-phase performance and usability study

**Question:** Does MamaSafe AI improve emergency-recognition speed, critical-action completion, and calculation accuracy for frontline health workers managing simulated obstetric emergencies, compared with standard practice (local protocols/job aids)?

**Design:** prospective, within-subjects, simulation-based comparison. Participants (midwives, nurses, CHEWs, community health officers, physicians) manage standardized synthetic scenarios (PPH, then preeclampsia/eclampsia and sepsis as modules mature) with and without the tool, order counterbalanced, scenarios counterbalanced to control difficulty.

**Primary endpoints:**
- Time to correct emergency recognition
- Critical-action completion rate (including TXA within the guideline window)
- Medication/fluid calculation accuracy

**Secondary endpoints:** guideline adherence; referral-note completeness (blinded structured scoring); usability (SUS); workload (NASA-TLX); and a safety endpoint: count and classification of unsafe AI outputs, with prespecified halt rules.

**Analysis:** prespecified statistical plan; effect sizes with confidence intervals; subgroup analyses by cadre and facility type; all materials and de-identified data prepared for open sharing.

**Setting/duration:** 2–3 training institutions and partner PHCs; ~3 months; institutional approval, no patient involvement.

## Study 2 — Shadow-mode concordance study

**Question:** When run in parallel with real (non-interventional) care, how concordant are MamaSafe AI's risk categorizations, action recommendations, and escalation triggers with actual guideline-concordant practice — and does it surface any unsafe divergence?

**Design:** prospective observational shadow-mode study in partner facilities; independent clinical panel adjudicates divergences; alert burden and confirmation behavior characterized in real workflow.

**Endpoints:** concordance rates; unsafe-divergence count (target zero unresolved); alert-burden metrics; audit-pipeline integrity metrics.

**Governance:** Nigerian ethics-committee approval; staff consent; data minimization and de-identification; no model training on study data without separate consent.

## Study 3 — Supported-use pilot evaluation

**Question:** In facilities using MamaSafe AI as confirmed decision support, do referral quality, workflow completion, time to escalation, and documentation completeness improve versus baseline?

**Design:** stepped-wedge or pre/post facility-level evaluation (final design set with academic partners); safety committee with stop authority; predefined disagreement-escalation protocol.

**Endpoints:** receiving-facility referral-quality ratings; workflow completion; time to escalation; documentation completeness; treatment delays; near-miss and unsafe-event surveillance.

## Study 4 — (Future, only with partners) outcomes study

Any mortality or severe-morbidity outcome claims require an adequately powered, preregistered, independently monitored study with ethical oversight — likely cluster-randomized at facility level with ministry and academic partners. Until such a study reports, all public materials carry the current honest wording: the product targets earlier recognition, more consistent protocol execution, and better referral communication.

## Cross-cutting research infrastructure

- **Clinical safety evaluation suite as a living instrument:** the adversarial test families (hallucination, wrong doses/calculations, omitted emergencies, wrong escalation, contraindication errors, prompt injection, fabricated citations, translation errors, pediatric dosing, pregnancy-specific errors) double as a research instrument for measuring generative-layer safety across model versions — a publishable methodology contribution for clinical LLM governance in low-resource settings.
- **Multilingual grounding validation:** with Lab collaboration, a community-validation protocol for clinician-facing and patient-facing language in Nigerian Pidgin, Hausa, Yoruba, and Igbo, including the non-translatable-clinical-token invariant (doses, drug names, thresholds never translated) — an open methodological contribution.
- **Open science commitments:** preregistration of confirmatory studies; publication of null and negative results; de-identified datasets and analysis code shared where governance permits.

## Roles sought from the Google Africa Applied AI Lab

- Vertex AI evaluation infrastructure and mentorship for reproducible safety-eval pipelines.
- Gemini/Gemma expertise for multilingual grounding experiments and edge-inference feasibility studies on real frontline device profiles.
- Connections to academic and evaluation partners within the Lab network.

## Independence and integrity

An independent clinical panel adjudicates concordance; a safety committee holds stop authority; the founder's conflict of interest (inventor evaluating own product) is managed through independent evaluation partners, blinded scoring where feasible, and preregistered endpoints. Every scientific or performance claim in this application and future publications must be independently verified before it is made.
