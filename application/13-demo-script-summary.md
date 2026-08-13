# 13. Demo Script Summary

**Full script:** [`../docs/DEMO_SCRIPT.md`](../docs/DEMO_SCRIPT.md) — a 5–7 minute live walkthrough of the postpartum hemorrhage (PPH) simulation, with narration beats mapped to exactly what the reviewer sees on screen.

## The demo in one paragraph

A synthetic 29-year-old woman, immediately post-delivery, is bleeding: HR 124, BP 88/52, estimated blood loss 1,100 mL, boggy uterus, one IV line, no blood products on site. The presenter runs the complete MamaSafe AI workflow in front of the reviewers — intake structuring with per-value confirmation, deterministic emergency recognition (shock index 1.4), the prioritized PPH pathway with a live TXA three-hour countdown and real-time contraindication screening, escalation with a generated SBAR referral handoff and voice read-back — and two signature moments: the **offline moment** (network toggled off on camera; the product keeps working without interruption) and the **audit-trail reveal** (the tamper-evident, hash-chained log of every value, rule, citation, and human confirmation).

## Beat map

| # | Beat | Time | What the reviewer sees | The point it lands |
|---|------|------|------------------------|--------------------|
| 0 | Frame the stakes | 0:00–0:45 | Home screen, simulation banner, synthetic case library | Real software, honest scope, the mortality burden with cited figures |
| 1 | The case walks in | 0:45–1:45 | Intake structuring from spoken/typed findings; per-value confirmation | AI structures, human confirms — nothing silently trusted |
| 2 | Engine recognizes emergency | 1:45–2:45 | Shock index 1.4 = CRITICAL; red flags with citations; missing-info prompt | Deterministic core, not the LLM, does the medicine |
| 3 | Pathway runs | 2:45–4:00 | Prioritized checklist; TXA 3-hour countdown; live contraindication flip on ergometrine; confirmations logged; simulated patient responds | Protocol fidelity under pressure, evidence-linked |
| 4 | **Offline moment** | 4:00–4:45 | Network killed on camera; product keeps running on local rules and templates | Offline-first is real, not a slide |
| 5 | Escalation & handoff | 4:45–5:45 | Referral recommendation; generated SBAR note; voice read-back | Referral quality is the product, too |
| 6 | **Audit-trail reveal** | 5:45–6:30 | Hash-chained log: values, rules, versions, citations, confirmations, offline interval | Engineered accountability for ministries, ethics boards, regulators |
| 7 | Close | 6:30–7:00 | Case summary, simulation banner | One workflow excellent; the platform vision; the Google fit |

## Why these two signature moments

- **The offline moment** is the Africa argument made physical: connectivity is a luxury, emergencies are not. Reviewers watch the product shrug off a network kill — the single most convincing proof that the architecture matches the mission.
- **The audit-trail reveal** is the responsible-AI argument made physical: provenance, versioning, human confirmation, and tamper-evidence are not policy prose — they are a visible, scrollable artifact of the emergency that just ran.

## Presenter guardrails (built into the script)

- Everything shown is simulation mode with synthetic cases; the banner is never hidden.
- No dose is ever attributed to the LLM; the presenter explicitly points at RULE-BASED stamps.
- Fallbacks are scripted: device failure → narrate from audit export; running long → compress Beats 1 and 3, never 4 and 6; "is the AI doing the medicine?" → "the rule engine does the medicine; the AI does the language."
