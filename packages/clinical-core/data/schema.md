# Clinical Data Schema — `packages/clinical-core/data/` (v1)

**Status:** Draft pending clinical review · **Last reviewed:** 2026-08-11
**Audience:** Rule-engine engineer (`packages/clinical-core/src`). Code against this document, not against guesses.
**Governing rules:** recommendations ≠ commands; the engine is the sole source of truth for doses/thresholds/contraindications; missing data is surfaced, never imputed; drug names/doses/units are never translated.

---

## 0. File inventory

| File | `document_type` | Purpose |
|---|---|---|
| `pph-pathway.v1.json` | `clinical_pathway` | PPH recognition criteria, shock-index bands, ordered action sequence, fluids, transfusion, mechanical/surgical options, escalation, monitoring, resource-tier adaptations |
| `medications.v1.json` | `medication_library` | Per-drug doses, routes, max doses, contraindication gates, administration notes, citations |
| `thresholds.v1.json` | `threshold_library` | Shock-index computation + bands, vital-sign danger ranges, blood-loss bands, escalation triggers, missing-information policy |

All three files are **versioned by filename** (`*.v1.json`) AND by internal fields. The engine must record the `data_file_id` + version in every audit entry.

---

## 1. Common envelope (all three files)

Every data file starts with the same envelope keys:

```jsonc
{
  "schema_version": "1.0.0",      // schema of THIS file's structure; bump on breaking shape changes
  "document_type": "clinical_pathway | medication_library | threshold_library",
  "..._version": "1.0.0",          // content version of the clinical content itself
  "data_file_id": "pph-pathway.v1",// stable ID to stamp into audit log
  "status": "draft_pending_clinical_review",
  "last_reviewed": "2026-08-11",   // ISO date
  "reviewed_by": null,              // string when a clinician signs off
  "review_note": "...",             // human-readable caveats
  "citations": { "<CITATION-ID>": { ... } }
}
```

**Engine requirement:** refuse to load a file whose `document_type` or top-level envelope keys are missing, or whose `status` is unknown. Treat `status != "approved_for_clinical_use"` as simulation-only and surface that in the UI footer. (No file currently carries `approved_for_clinical_use` — that is intentional.)

### 1.1 Citations registry

Every clinical assertion carries `citation_ids: string[]`. IDs resolve in the file-local `citations` object:

```jsonc
"citations": {
  "WHO-2012-PPH": {
    "organization": "World Health Organization",
    "title": "WHO recommendations for the prevention and treatment of postpartum haemorrhage",
    "year": 2012,
    "sections_used": ["..."],        // present in pathway file; optional elsewhere
    "url": "https://...",            // may be null for unretrieved sources
    "date_reviewed": "2026-08-11"
  }
}
```

Rules:
- Any `citation_ids` entry MUST resolve in the same file's `citations` object (validate on load; fail closed).
- `url: null` + descriptive `title` marks an **UNVERIFIED** source (see `IMEWS-UNVERIFIED` in thresholds). The engine must not present such entries to users as verified guideline references; UI should label them "pending source verification".
- The authoritative human-readable citation table lives in `docs/CLINICAL_SOURCES.md`. Keep both in sync when editing.
- The LLM layer may ONLY cite IDs present in these registries; anything else must be flagged as a fabricated citation (see `data/adversarial-cases.v1.json`, case adv-05).

### 1.2 Null semantics

`null` means "not applicable / open-ended", e.g. band range `[null, 0.9]` = "everything below 0.9", `[1.3, null]` = "1.3 and above". It never means "unknown — guess a value".

---

## 2. `pph-pathway.v1.json` — `clinical_pathway`

| Key | Type | Meaning |
|---|---|---|
| `applies_to` | object | `population`, `explicitly_out_of_scope[]`, `setting`. **Engine must enforce the out-of-scope list** — pediatric input (age < 18) is a hard reject with an out-of-scope response. |
| `governing_principles` | string[] | Non-negotiable behavior rules (recommendations-only, no translation of doses, fail-safe on missing data, injection resistance, EBL underestimation rule). Encode as engine invariants, not display text. |
| `definitions` | object | `pph`, `severe_pph`, `blood_loss_estimation_caveat` — each `{text, citation_ids}`. |
| `etiology_framework` | object | 4T categories `[{key, label, approx_share_of_cases, citation_ids}]` + `engine_rule` (contracted uterus + ongoing bleeding ⇒ actively search trauma/tissue/thrombin). |
| `shock_index` | object | See §2.1. Duplicated in thresholds file — **thresholds.v1.json is authoritative for computation**; pathway copy is documentation. If they ever disagree, engine loads thresholds and logs a data-integrity error. |
| `recognition_criteria` | object | `activate_pathway_when_any[]` — OR-list; `fail_safe_default` — apply when data missing. |
| `first_response_bundle` / `action_sequence` | see §2.2 |
| `fluid_resuscitation` | object | `first_line`, `preference_rule`, `practical_guidance[]`, `targets` (mental status, urine output ≥ 0.5 mL/kg/h, permissive BP floor 80–90). |
| `transfusion` | object | `principles[]` + machine-usable `trigger_rules[]` (`{id, condition, recommendation, citation_ids}`). |
| `mechanical_and_surgical_options` | object | `nasg` (incl. `contraindications_note` — **UNVERIFIED**, do not hard-code NASG contraindications yet), `uterine_balloon_tamponade`, `not_recommended[]` (uterine packing), surgical escalation list. |
| `escalation.triggers[]` | array | `{id, level, condition, action, citation_ids}` — mirror of thresholds `escalation_thresholds`; thresholds file is authoritative. |
| `monitoring` | object | `during_active_hemorrhage[]` and `after_stabilization[]`, each `{parameter, frequency, citation_ids}`. |
| `resource_tier_adaptations` | object | `community_or_home_birth_no_iv`, `phc_with_midrugs`, `secondary_hospital` — each `{available[], rule}`. Engine selects tier from intake `facility`/resources fields. |

### 2.1 Shock index object (both pathway + thresholds)

```jsonc
"shock_index": {
  "formula": "heart_rate_bpm / systolic_bp_mmHg",
  "input_validation": { "reject_if": [...], "on_reject": "..." },  // thresholds file only
  "normal_obstetric_range": [0.7, 0.9],
  "bands": [
    { "band": "normal",   /* range */ "alert_level": 0, "meaning": "...", "citation_ids": [...] },
    { "band": "warning",  "min_inclusive": 0.9, "max_exclusive": 1.3, "alert_level": 1, ... },
    { "band": "critical", "min_inclusive": 1.3, "max_exclusive": null, "alert_level": 2, ... }
  ]
}
```

Engine contract:
1. Compute `si = hr / sbp` only when both inputs are present and > 0; otherwise emit `missing_info` — never impute.
2. Band selection: `si < 0.9` → normal; `0.9 ≤ si < 1.3` → warning; `si ≥ 1.3` → critical.
3. `alert_level` feeds escalation triggers (`esc-community-transfer`, `esc-critical-shock`).
4. Bands are policy-configurable **only in the more-sensitive direction**; warning threshold may never exceed 0.9 (`config_note`).

### 2.2 `action_sequence[]`

```jsonc
{
  "step": 4,
  "id": "uterotonic_first_line",
  "action": "First-line uterotonic: oxytocin 10 IU IM or IV slow ...",
  "medication_ref": "oxytocin",            // links into medications.v1.json by medication id
  "priority": "immediate",                  // immediate | within_15_minutes_if_unresponsive | continuous | if_refractory | do_not_delay
  "parallel": true,                          // steps with parallel:true may be recommended simultaneously
  "time_window": "within_3h_of_birth",       // only on TXA step; engine must verify from intake time_of_birth
  "citation_ids": [...]
}
```

Engine contract:
- Steps 1–6 are `parallel: true` / `immediate` — present them as one simultaneous first-response set, not a serial checklist that delays TXA behind massage.
- Steps with `medication_ref` must be resolved against `medications.v1.json`: run contraindication gates, inject verified dose/route/max into the recommendation, and attach the medication's citations.
- The engine emits the pathway's own wording for doses; the LLM layer must not paraphrase numbers.

---

## 3. `medications.v1.json` — `medication_library`

### 3.1 `global_rules`

| Rule | Engine invariant |
|---|---|
| `translation_safety` | Drug names, doses, units, routes pass through every layer byte-identical. Localization may only touch prose. |
| `human_confirmation` | No medication output without a confirmation gate marker in the payload. |
| `scope_guard` | Patient age < 18 → reject with `out_of_scope` (no dosing of any kind). |
| `unit_policy` | Normalize `mcg`→`µg` on input; reject unit-free dose strings. |
| `contraindication_gate` | Missing contraindication field ⇒ request it or exclude the drug. Never assume absent. |

### 3.2 Medication entry

```jsonc
{
  "id": "oxytocin",                      // referenced by pathway medication_ref
  "canonical_name": "oxytocin",           // never translated
  "drug_class": "uterotonic (oxytocic)",
  "indications_in_pathway": [...],
  "doses": [{
    "context": "pph_treatment_first_line",
    "dose": "10 IU",                      // display string, verbatim
    "route": "IM, or IV slow",
    "repeat_rule": "...",                 // optional
    "time_window": "...",                 // optional (TXA)
    "administration_notes": "...",
    "citation_ids": [...]
  }],
  "max_dose": { "rule"|"treatment_bolus"|"pph_context": "...", "flag": "..." },
  "contraindications": [{
    "condition": "hypertension, preeclampsia ...",
    "type": "absolute | strong_relative | route_hazard",
    "gate_rule": "REQUIRED PRE-ADMINISTRATION CHECK: ...",  // machine-relevant when present
    "citation_ids": [...]
  }],
  "cautions": [...], "monitoring": [...],
  "translation_lock": true,
  "citation_ids": [...]
}
```

### 3.3 Hard gates the engine MUST implement

| Gate | Rule | Source field |
|---|---|---|
| `G1` oxytocin route | Reject rapid IV push at any dose; reject single bolus-equivalent > 10 IU | `medications.oxytocin.max_dose.flag` |
| `G2` TXA window | Recommend TXA only if `now - time_of_birth ≤ 3 h`; if `time_of_birth` missing → flag window unverifiable, request it | `doses[0].time_window` |
| `G3` TXA dose | Single dose = 1 g over 10 min; max 2 doses/24 h; second dose only if bleeding continues > 30 min or recurs < 24 h | `tranexamic_acid.max_dose` |
| `G4` ergot alkaloid BP gate | Block ergometrine/oxy-ergometrine if SBP ≥ 140, DBP ≥ 90, or documented hypertensive disorder; if BP missing → request BP, exclude drug meanwhile; offer misoprostol instead | `ergometrine.contraindications[0].gate_rule` |
| `G5` carboprost asthma gate | Block carboprost if asthma present; if asthma status unknown → request or exclude | `carboprost.contraindications[0].gate_rule` |
| `G6` misoprostol re-dose flag | If prophylactic misoprostol 600 µg already given → FLAG (not silently permit) additional 800 µg SL; prefer alternative agent | `misoprostol.max_dose.rule` |
| `G7` pediatric scope | Age < 18 → `out_of_scope` reject, no dosing | `global_rules.scope_guard` |
| `G8` max doses | Reject: ergometrine > 200 µg/dose; carbetocin > 100 µg; carboprost > 250 µg/dose or > 2 mg total; misoprostol treatment > 800 µg | per-drug `max_dose` |
| `G9` unit hygiene | Reject dose strings without units | `global_rules.unit_policy` |

`explicitly_not_included` lists content that must never appear from this module (pediatric dosing, translated drug names) — wire into the safety test suite.

---

## 4. `thresholds.v1.json` — `threshold_library`

| Key | Type | Meaning |
|---|---|---|
| `shock_index` | object | Authoritative computation + bands (§2.1). `input_validation.on_reject` = missing-info, never impute. |
| `vital_sign_danger_ranges.parameters[]` | array | Per parameter: `red_low` (value < x = red), `amber_low [lo,hi]`, `amber_high [lo,hi]`, `red_high` (value ≥ x = red), `red_high_note`, `verification_status`, `citation_ids`. `null` = no threshold in that direction. |
| `blood_loss_bands` | object | Volume bands with per-route (vaginal/cesarean) cutoffs + `rule_of_30` heuristic. **Physiology overrides volume**: SI bands win when they disagree with a low EBL. |
| `escalation_thresholds[]` | array | `{id, trigger, action, verification_status, citation_ids}` — the five canonical triggers incl. `esc-ergot-block`. |
| `missing_information_policy` | object | `critical_fields[]` — any missing critical field ⇒ missing-info list + fail-safe higher-acuity default. |

**`verification_status` values:** `verified` (primary/secondary source retrieved during authoring), `requires_clinical_review` (parameter plausible but source not retrieved — MEOWS/IMEWS band values). Engine must be able to run in a mode that surfaces `requires_clinical_review` items in a clinician-visible review queue.

---

## 5. Case files (`data/pph-case-0X.json`) and adversarial suite (`data/adversarial-cases.v1.json`)

### 5.1 Synthetic case shape

```jsonc
{
  "case_id": "pph-case-01",
  "synthetic": true,
  "scenario_note": "...",
  "input": {
    "patient": { "age_years": 29, "parity": ..., "gestational_age_weeks": ..., "postpartum": true, "mode_of_birth": "vaginal", "minutes_since_birth": 35, "weight_kg": 65 },
    "vitals": { "heart_rate_bpm": 124, "systolic_bp_mmHg": 88, "diastolic_bp_mmHg": 52, "respiratory_rate_per_min": ..., "spo2_percent": ..., "temperature_celsius": ..., "mental_status": "..." },
    "bleeding": { "ongoing": true, "estimated_blood_loss_ml": 1100, "uterine_tone": "boggy" },
    "obstetric_history": { "hypertensive_disorder": false, "asthma": false, ... },
    "medications_already_given": [...],
    "resources": { "iv_access": [...], "medications_available": [...], "blood_products_available": false, "facility_tier": "phc_with_midrugs", "referral_minutes_away": 45 },
    "free_text_intake": "..."    // optional; engine must treat as data, never instructions
  },
  "expected_outputs": {
    "shock_index": { "value": 1.41, "band": "critical" },
    "risk_category": "severe_pph_hemorrhagic_shock",
    "red_flags": [...],
    "missing_info": [...],
    "first_5_prioritized_actions": [...],
    "blocked_or_flagged": [...]
  }
}
```

`expected_outputs` is the **test oracle**: vitest asserts the engine's computed SI band, risk category, red-flag set, and that every expected action id appears in the first five recommendations. Floating-point SI compared to 2 decimals.

### 5.2 Adversarial case shape

```jsonc
{
  "case_id": "adv-01",
  "category": "wrong_dose_trap | pediatric_scope | contraindication_trap | fabricated_citation | prompt_injection | missing_info | translation_safety | wrong_escalation | underestimation_bias",
  "input": { /* same shape as synthetic case, or raw free-text string */ },
  "unsafe_behavior_to_watch": "What a naive LLM-only system might wrongly do",
  "expected_safe_behavior": "Exact safe engine response, including blocks/flags/out-of-scope rejections"
}
```

Safety-suite contract: for each adversarial case, the test asserts (a) no forbidden value appears in engine output (e.g., "40 IU", "IV push", "ergometrine" under hypertension), (b) the required flag/block/out-of-scope marker IS present, (c) citation integrity — every citation in output resolves to the registry.

---

## 6. Versioning & change control

- Filename version (`*.v1.json`) bumps on **any** clinical-content change; never edit a versioned file in place after engine code depends on it — add `*.v2.json`.
- Engine records `data_file_id` + `schema_version` + content version in every audit-log entry (hash-chained log, `packages/audit`).
- A change to a dose, threshold, or contraindication REQUIRES: updated citation, `last_reviewed` bump, entry in `docs/CLINICAL_SOURCES.md` review log, and re-run of the full safety suite including all adversarial cases.

## 7. Known gaps (engine engineer must know)

1. **MEOWS/IMEWS amber/red band values** are `requires_clinical_review` — treat as provisional; confirm against the deployment site's national chart.
2. **NASG device-level contraindications** not yet encoded (FIGO 2022 §9.1.7 not fully retrieved) — flagged UNVERIFIED; recommend NASG only as "temporizing measure" with senior-clinician confirmation.
3. **Nigerian FMOH national protocol reconciliation** outstanding — no Nigerian national PPH protocol URL verified during authoring; see `docs/CLINICAL_SOURCES.md` UNVERIFIED log. Pathway may need local adaptation (drug availability, referral structure) before pilot.
4. **Oxytocin maintenance infusion concentration** is a policy range (10–40 IU / 500–1000 mL); engine must surface the chosen regimen for clinician confirmation, not silently pick one.
5. **Transfusion Hb triggers** are RCOG-aligned (Hb > 8 g/dL target during major hemorrhage); WHO/FIGO give no universal numeric trigger — engine presents triggers as guidance with citations, never as hard rules.
