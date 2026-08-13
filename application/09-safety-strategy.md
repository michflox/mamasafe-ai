# 9. Safety Strategy

## The one-sentence version

Every clinically consequential value in MamaSafe AI — every dose, threshold, contraindication, and escalation criterion — is produced by a deterministic, version-controlled, guideline-cited rule engine; the language model is architecturally incapable of changing any of them; and a human clinician must confirm before any consequential action.

This strategy inherits the AnesthesiaOS safety doctrine wholesale: simulation-only development, mandatory provider oversight, immutable audit, recommendations that are never commands, and absolute regulatory honesty.

## 1. Architectural separation: the deterministic spine

**Two layers, one boundary that is never crossed:**

- **Clinical rules / safety layer (source of truth):** medication limits, dosing formulas, critical thresholds (e.g., shock index interpretation), emergency protocol sequencing, contraindications (e.g., ergometrine in hypertension), escalation criteria, and mandatory warning conditions. Implemented as deterministic functions over version-controlled, data-driven pathway files. Every rule carries its citation: organization, document title, year/version, and section. Fail-safe defaults: when data are missing, the engine asks or refuses — it never guesses.
- **Generative layer (language only):** intake structuring, explanation, translation, summarization, conversation, documentation drafting, retrieval, simulation narration. The LLM receives rule-engine outputs as facts it may explain but may not alter. Post-processing rejects any generative output that conflicts with rule-engine values or cites sources not present in the retrieved guideline corpus.

High-risk clinical calculations never rely on unconstrained LLM generation. This is enforced by architecture, not by prompting alone.

## 2. Output provenance and labeling

Every output is stamped **RULE-BASED** or **AI-GENERATED — VERIFY**, with the model version and rule-version recorded. The clinician can always see which parts of the screen are deterministic guideline logic and which are language-model drafts requiring review.

## 3. Mandatory human confirmation

- No consequential clinical action proceeds without explicit clinician confirmation.
- Recommendations remain visually and structurally distinguishable from commands.
- Confirmation dialogs are designed to be **genuinely reviewable**: the underlying values, the rule that produced them, and the citation are shown at the point of confirmation — we do not create the appearance of meaningful review where realistic review is impossible (automation-bias mitigation).
- Manual override is always available, and overrides are themselves audit-logged.
- Critical information uses read-back: the system reads back doses and key values for verbal or on-screen confirmation.

## 4. Tamper-evident audit trail

All interactions — inputs, rule evaluations, AI calls, confirmations, overrides, timestamps, model/rule versions — pass through a hash-chained audit log. The audit layer is the system spine: nothing bypasses it, and it is never disabled for convenience. Audit records support incident investigation, quality improvement, and future regulatory scrutiny.

## 5. Clinical evaluation suite (gate for every model/rule update)

A dedicated safety test suite runs against synthetic and adversarial cases before any update ships. Test families:

1. Hallucination in explanations
2. Incorrect medication recommendations
3. Incorrect calculations (weight-based dosing, fluids, transfusion)
4. Omitted emergencies (failure to flag deterioration)
5. Wrong escalation (too early or — worse — too late)
6. Incorrect contraindication handling
7. Prompt injection (adversarial intake text attempting to bypass rules)
8. Fabricated guideline citations
9. Translation errors (with the invariant that doses/drug names/thresholds are never translated)
10. Pediatric dosing errors (architectural, ahead of the pediatric phase — pediatric components are aggressively protected from day one)
11. Pregnancy-specific errors

Results are published in `docs/TEST_RESULTS.md`. A failing gate blocks the release — no exceptions for schedule pressure.

## 6. Degraded-mode and fail-safe behavior

- **Offline:** full pathway functionality via cached rules and deterministic templated explanations; no emergency feature requires connectivity.
- **AI unavailable:** the product degrades to rule-engine-only operation — identical safety, less polish.
- **Sensor/data gaps:** missing inputs trigger explicit requests, never silent defaults.
- **Power/device constraints:** low-resource mode for older Android devices; state is locally persisted so an interrupted emergency session resumes intact.

## 7. Data governance and privacy

- Encryption in transit and at rest; role-based access; minimum-necessary data collection.
- Strict separation of clinical operations data, analytics data, research data, and model-training data. **Patient data is never automatically used for model training**; research use requires consent and governance approval.
- Synthetic data only in development and demonstration — no real patient data exists anywhere in this project today.
- Designed with Nigerian data-protection requirements in mind and for eventual cross-border expansion with local configuration.

## 8. Human factors and automation-bias controls

| Risk | Control |
|---|---|
| Over-reliance on the AI ("the app said so") | AI/GENERATED labeling; confirmation requires viewing the rule and citation; training mode teaches verification behavior |
| Alarm fatigue | Prioritized, severity-tiered alerts; red flags reserved for true critical findings |
| False confidence from fluent language | Explanations always display their guideline source; absent source = the statement is not shown as clinical guidance |
| Review impossible under time pressure | Confirmations summarize exactly what must be checked (value, rule, citation) in one glance |
| Misuse outside intended users | Intended-use documentation; facility onboarding with training; prohibited-use list (no autonomous use, no use by untrained laypersons for consequential decisions) |

## 9. Regulatory posture (stated plainly)

- MamaSafe AI is **clinical decision support**, in development and simulation.
- It is **not** FDA cleared, **not** CE marked, **not** approved by NAFDAC or any regulator, **not** approved for clinical use, and **not** connected to real patients or devices.
- No mortality-reduction or outcome claims are made anywhere.
- Documentation follows medical-software discipline (intended use, failure modes, hazards, risk controls, verification per feature; alignment concepts from IEC 62304, ISO 14971, IEC 62366-1) so the design remains defensible as the product matures toward pilot and eventual regulatory engagement.

## 10. Safety incident response

If a safety issue is identified: **STOP** the affected development/testing → **ASSESS** scope and severity → **REPORT** to leadership → **DOCUMENT** in the safety register → **REMEDIATE** with verification → **REVIEW** for systemic causes. The governing rule: when a feature request conflicts with a safety requirement, safety wins, and we propose a safe alternative instead of weakening the control.

## Why this is a differentiator, not a cost center

For ministries of health, NGOs, and the Google Africa Applied AI Lab, the safety strategy *is* the product's credibility. Any team can connect an LLM to a chat box. Very few can show a deterministic clinical spine, a gated adversarial evaluation suite, a tamper-evident audit trail, and an honest regulatory posture — running, today, in a working demo.
