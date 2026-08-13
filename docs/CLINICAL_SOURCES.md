# CLINICAL_SOURCES.md — MamaSafe AI Clinical Citation Register & Review Log

**Maintained by:** Clinical_Content_Author · **Date reviewed:** 2026-08-11
**Scope of this register:** every clinical rule encoded in `packages/clinical-core/data/*.json` and every test oracle in `data/*.json`.

> ## ⚠️ CLINICAL REVIEW REQUIRED BEFORE PILOT
>
> **All content in `packages/clinical-core/data/` and `data/` is in `draft_pending_clinical_review` status. Nothing in this repository has been reviewed by an independent qualified obstetric clinician, pharmacist, or the Nigerian Federal Ministry of Health. No file carries an `approved_for_clinical_use` status, and none may until:**
>
> 1. A qualified obstetric clinician reviews and signs off every dose, threshold, contraindication, and escalation rule;
> 2. A pharmacist reconciles `medications.v1.json` against the local formulary and Nigerian essential-medicines guidance;
> 3. The pathway is reconciled against current Nigerian FMOH national protocols (see UNVERIFIED log item U1);
> 4. Items marked UNVERIFIED below are resolved against primary sources.
>
> **MamaSafe AI is a clinical decision SUPPORT system in development/simulation. It produces recommendations for human clinicians, never commands. It is NOT FDA cleared, NOT CE marked, NOT approved by any regulator, and NOT approved for clinical use. All data in this repository are synthetic.**

---

## 1. Master citation table

| ID | Organization | Document title | Year / Version | Section(s) used | URL | Date reviewed | Verification |
|---|---|---|---|---|---|---|---|
| WHO-2012-PPH | World Health Organization | WHO recommendations for the prevention and treatment of postpartum haemorrhage | 2012 | Definitions (>500 mL vaginal / >1000 mL cesarean; severe >1000 mL); uterotonics for treatment (oxytocin first-line; ergometrine / oxytocin-ergometrine / misoprostol 800 µg SL second-line); uterine massage for treatment; isotonic crystalloids over colloids; balloon tamponade; temporizing measures (bimanual/aortic compression, NASG); uterine packing not recommended; surgical interventions | https://iris.who.int/bitstream/handle/10665/75411/9789241548502_eng.pdf?sequence=1 | 2026-08-11 | ✅ Primary document located (WHO IRIS) |
| WHO-2017-TXA | World Health Organization | WHO recommendation on tranexamic acid for the treatment of postpartum haemorrhage | 2017 | TXA 1 g (100 mg/mL) IV at 1 mL/min (over 10 min), within 3 h of birth; second 1 g dose if bleeding continues after 30 min or restarts within 24 h; 3-h window anchored to TIME OF BIRTH (WOMAN trial evidence) | https://www.who.int/reproductivehealth/publications/tranexamic-acid-pph-treatment/en/ · summary table: https://www.ncbi.nlm.nih.gov/books/NBK493072/table/executivesummary.t1/ | 2026-08-11 | ✅ Verified via WHO publication + NCBI Bookshelf summary table |
| WHO-2018-UTEROTONICS | World Health Organization | WHO recommendations: uterotonics for the prevention of postpartum haemorrhage | 2018 | Oxytocin 10 IU IM/IV first-line prevention for all births; carbetocin 100 µg (heat-stable), ergot alkaloids, oral misoprostol as alternatives; misoprostol where injectables contraindicated (e.g., hypertension vs ergometrine); community/lay health worker misoprostol | https://iris.who.int/handle/10665/277276 | 2026-08-11 | ✅ Cited and summarized within FIGO 2022 review (section 6.1); handle verified |
| FIGO-2022-PPH | FIGO Safe Motherhood and Newborn Health Committee (Escobar MF et al.) | FIGO recommendations on the management of postpartum hemorrhage 2022, Int J Gynaecol Obstet 2022;157(Suppl 1):3-50 | 2022 | §2 prevention & treatment recommendations; §3.3 definitions; §3.4 etiology (4T, atony ~70%, trauma 15-20%); §4 PPH bundle care; §5 shock index — Box 2: SI ≥ 0.9 alert; normal obstetric SI 0.7-0.9; SI ≥ 0.9 → urgent transfer alert for community providers; rule of 30; §7 carbetocin vs oxytocin; §8 TXA (1 g over 10 min, second dose rule); §9 NASG + uterine balloon tamponade; misoprostol re-dose evidence gap; §10 surgical treatment; §11 resuscitation (hemostatic resuscitation, massive transfusion) | https://pmc.ncbi.nlm.nih.gov/articles/PMC9313855/ | 2026-08-11 | ✅ Primary full text retrieved and read |
| FIGO-2015-NASG | FIGO Safe Motherhood and Newborn Health Committee | Non-pneumatic anti-shock garment to stabilize women with hypovolemic shock secondary to obstetric hemorrhage, Int J Gynaecol Obstet 2015;128:194-195 | 2015 | NASG as stabilization/temporizing measure for obstetric hemorrhage shock | https://pubmed.ncbi.nlm.nih.gov/25637000/ | 2026-08-11 | ✅ Listed in FIGO 2022 Table 1; PubMed record identified |
| WOMAN-2017 | WOMAN Trial Collaborators | Effect of early tranexamic acid administration on mortality, hysterectomy, and other morbidities in women with post-partum haemorrhage (WOMAN): an international, randomised, double-blind, placebo-controlled trial. Lancet 2017;389:2105-2116 | 2017 | Evidence base for TXA dosing and the 3-hour treatment window | https://pubmed.ncbi.nlm.nih.gov/28456509/ | 2026-08-11 | ✅ Cited by WHO 2017 and FIGO 2022; trial record identified |
| NATHAN-2015-BJOG | Nathan HL et al. (King's College London / UCSF Safe Motherhood) | Shock index: an effective predictor of outcome in postpartum haemorrhage? BJOG 2015;122:268-275 | 2015 | SI ≥ 0.9 alert threshold for low-resource settings; SI outperforms conventional vital signs for predicting adverse outcomes in PPH | https://pubmed.ncbi.nlm.nih.gov/25546050/ | 2026-08-11 | ✅ Abstract retrieved; cited by FIGO 2022 §5 |
| NATHAN-2018-BMJINNOV | Nathan HL et al. | Development and evaluation of a novel Vital Signs Alert device for use in pregnancy in low-resource settings. BMJ Innovations 2018;4:192-198 | 2018 | Traffic-light alert design underpinning amber (SI ≥ 0.9) / red (SI ≥ 1.3) banding | https://pubmed.ncbi.nlm.nih.gov/30397523/ | 2026-08-11 | ✅ Record identified via citation chain |
| NATHAN-2019-AOGS | Nathan HL et al. | Shock index thresholds to predict adverse outcomes in maternal hemorrhage and sepsis: a prospective cohort study. Acta Obstet Gynecol Scand 2019;98:1178-1186 | 2019 | Prospective validation of SI thresholds, including the 1.3 critical threshold used for the engine's critical band | https://pubmed.ncbi.nlm.nih.gov/30927469/ · https://obgyn.onlinelibrary.wiley.com/doi/pdf/10.1111/aogs.13626 | 2026-08-11 | ✅ Abstract/record identified |
| RCOG-2016-GT52 | Royal College of Obstetricians and Gynaecologists | Prevention and management of postpartum haemorrhage. Green-top Guideline No. 52. BJOG 2017;124:e106-e149 | 2016 (pub. 2017) | Minor (500-1000 mL) / major (>1000 mL) classification; fluid volume discipline (~2 L crystalloid, ~1.5 L colloid, ~3.5 L total clear fluids before blood); Hb > 8 g/dL target during major hemorrhage; monitoring cadence; carboprost context | https://pubmed.ncbi.nlm.nih.gov/27981719/ | 2026-08-11 | ⚠️ Verified via FIGO 2022 Table 2 cross-citation and secondary clinical summaries; primary PDF not directly read this session |
| ACOG-2017-PB183 | American College of Obstetricians and Gynecologists | ACOG Practice Bulletin No. 183: Postpartum Hemorrhage. Obstet Gynecol 2017;130:e168-e186 | 2017 | Definition: cumulative blood loss ≥ 1000 mL OR bleeding with signs/symptoms of hypovolemia within 24 h regardless of delivery route; carboprost 250 µg IM, repeat ≥ 15 min, max 2 mg, asthma contraindication | https://pubmed.ncbi.nlm.nih.gov/28937571/ | 2026-08-11 | ⚠️ Definition verified via FIGO 2022 Table 2; carboprost details from standard obstetric references — confirm against primary bulletin during clinical review |
| ALTHABE-2020-BUNDLE | WHO technical consultation (Althabe F et al.) | Postpartum hemorrhage care bundles to improve adherence to guidelines: a WHO technical consultation. Int J Gynaecol Obstet 2020;148:290-299 | 2020 | First response PPH bundle (uterotonics, isotonic crystalloids, TXA, uterine massage); Response to refractory PPH bundle (compression measures, UBT, NASG, continued uterotonics, second TXA dose) | https://pubmed.ncbi.nlm.nih.gov/31222831/ | 2026-08-11 | ✅ Reproduced in FIGO 2022 §4 Table 4 (read directly) |

---

## 2. Rule-by-rule traceability (key figures)

| Rule / figure | Value encoded | Primary source(s) |
|---|---|---|
| PPH definition | ≥ 500 mL vaginal / ≥ 1000 mL cesarean, or bleeding + hypovolemia signs | WHO-2012-PPH; FIGO-2022-PPH; ACOG-2017-PB183 |
| Severe PPH | ≥ 1000 mL | WHO-2012-PPH; RCOG-2016-GT52 |
| Shock index formula | HR / SBP | FIGO-2022-PPH §5 |
| SI normal (obstetric) | 0.7-0.9 | FIGO-2022-PPH §5.1 |
| SI warning band | ≥ 0.9 (alert; urgent transfer trigger in community settings) | FIGO-2022-PPH Box 2; NATHAN-2015-BJOG |
| SI critical band | ≥ 1.3 | NATHAN-2019-AOGS; NATHAN-2018-BMJINNOV (CRADLE VSA red-alert lineage). **Note: FIGO 2022 explicitly endorses only the 0.9 alert; 1.3 comes from the Nathan/CRADLE threshold literature. Engine config may not raise the warning threshold above 0.9.** |
| Rule of 30 | SBP ↓30 mmHg, HR ↑30/min, Hct ↓30%, Hb ↓~3 g/dL ≈ 30% volume loss | FIGO-2022-PPH §5.1 |
| Uterine atony share | ~70% of PPH (4T: Tone/Trauma/Tissue/Thrombin; trauma 15-20%) | FIGO-2022-PPH §3.4 |
| Oxytocin treatment | 10 IU IM or IV slow, first-line; never rapid IV push | WHO-2012-PPH; FIGO-2022-PPH |
| Oxytocin prevention (AMTSL) | 10 IU IM/IV all births; cold-chain attention | WHO-2012-PPH; WHO-2018-UTEROTONICS; FIGO-2022-PPH |
| TXA | 1 g (100 mg/mL) IV at 1 mL/min over 10 min, within 3 h of birth; 2nd 1 g dose if bleeding continues >30 min or recurs <24 h | WHO-2017-TXA; WOMAN-2017; FIGO-2022-PPH §8 |
| Misoprostol treatment | 800 µg sublingual | WHO-2012-PPH; FIGO-2022-PPH |
| Misoprostol prevention (community) | 400-600 µg oral | FIGO-2022-PPH; WHO-2018-UTEROTONICS |
| Misoprostol re-dose | NO EVIDENCE for additional 800 µg after 600 µg prophylactic — flag, don't default | FIGO-2022-PPH §2.2 |
| Ergometrine | 200 µg IM/IV; CONTRAINDICATED in hypertension/preeclampsia (exclude hypertensive disorders before use) | WHO-2012-PPH; FIGO-2022-PPH; WHO-2018-UTEROTONICS |
| Carbetocin | 100 µg IM/IV, heat-stable; where cost comparable / cold chain unreliable | WHO-2018-UTEROTONICS; FIGO-2022-PPH §7 |
| Carboprost | 250 µg IM, repeat ≥15 min, max 2 mg; asthma = absolute contraindication | ACOG-2017-PB183; RCOG-2016-GT52 |
| Fluids | Isotonic crystalloids preferred over colloids (strong rec, low-quality evidence); warm fluids | WHO-2012-PPH; FIGO-2022-PPH |
| Fluid volume discipline | ~2 L crystalloid / ~1.5 L colloid / ~3.5 L total before blood | RCOG-2016-GT52 |
| Transfusion target | Hb > 8 g/dL during major hemorrhage; no universal numeric trigger from WHO/FIGO | RCOG-2016-GT52; FIGO-2022-PPH §11 |
| Balloon tamponade | When uterotonics fail/unavailable, after ruling out retained POC + rupture; packing NOT recommended | WHO-2012-PPH; FIGO-2022-PPH §9.2 |
| NASG | Temporizing measure until definitive care; useful in transport | FIGO-2015-NASG; FIGO-2022-PPH §9.1 |
| First response bundle | Uterotonics + isotonic crystalloids + TXA + uterine massage (parallel, not serial) | ALTHABE-2020-BUNDLE; FIGO-2022-PPH §4 |
| Refractory bundle | Compression (bimanual/aortic) + UBT + NASG + continued uterotonics + 2nd TXA | ALTHABE-2020-BUNDLE; FIGO-2022-PPH §4 |
| Surgical escalation | Compression sutures → artery ligation → embolization → hysterectomy; stop bleeding before coagulopathy | WHO-2012-PPH; FIGO-2022-PPH §10 |
| Escalation (community) | SI ≥ 0.9 → urgent transfer alert | FIGO-2022-PPH §5; NATHAN-2015-BJOG |

---

## 3. UNVERIFIED log — figures NOT fully verified during authoring

> **Rule: anything here must be resolved against a primary source and signed off by the clinical reviewer before pilot. The engine marks affected parameters `verification_status: requires_clinical_review` or treats them as clinician-confirmation items. Nothing below was silently invented; it is flagged.**

| # | Item | Status | What is encoded meanwhile | Action required |
|---|---|---|---|---|
| U1 | **Nigerian FMOH national PPH / EmONC protocol** | **UNVERIFIED** — no current Nigerian national protocol URL or document was retrievable/verified this session | Pathway is WHO/FIGO-aligned only; a `resource_tier_adaptations` structure anticipates local adaptation | Clinical team must obtain the current FMOH/NSCHE/MNH national guideline, reconcile every dose/threshold/referral rule, and record it as a first-class citation before pilot |
| U2 | **MEOWS/IMEWS exact amber/red band values** (RR, SpO2, temperature bands; HR/SBP amber bands) | **UNVERIFIED** — primary NCEC IMEWS chart not retrieved (source page JS-rendered); bands encoded from widely published MEOWS-style charts | Bands present in `thresholds.v1.json` with `verification_status: "requires_clinical_review"` and citation placeholder `IMEWS-UNVERIFIED` | Confirm against the deployment site's national maternity early-warning chart (e.g., NCEC IMEWS 2014/2023 or site-specific MEOWS); adjust bands per site policy |
| U3 | **NASG device-level contraindications** (FIGO 2022 §9.1.7) | **UNVERIFIED** — FIGO 2022 §9.1.7 content truncated in retrieval; not encoded | NASG recommended only as "temporizing measure" with mandatory senior-clinician confirmation; `contraindications_note` flags the gap | Retrieve FIGO 2022 §9.1.7 + device manufacturer guidance; encode contraindications with citations |
| U4 | **RCOG GT52 primary text** (fluid volumes 2 L/1.5 L/3.5 L; Hb > 8 g/dL target) | ⚠️ Verified via FIGO 2022 cross-citation + secondary summaries, primary PDF not read this session | Encoded with `RCOG-2016-GT52` citation and RCOG-aligned framing | Pull primary Green-top 52 PDF during clinical review; confirm numbers verbatim |
| U5 | **ACOG PB 183 carboprost regimen** (250 µg IM, ≥15-min interval, 2 mg max, asthma contraindication) | ⚠️ Standard-reference knowledge consistent with ACOG/RCOG practice; primary bulletin not read this session | Encoded; asthma gate (G5) hard-coded because contraindication is unambiguous across references | Confirm against primary bulletin during clinical review |
| U6 | **Oxytocin maintenance infusion range** (10-40 IU in 500-1000 mL) | ⚠️ Range reflects RCOG/bundle practice; WHO/FIGO do not fix a single regimen | Encoded as a policy RANGE; engine must surface chosen regimen for clinician confirmation, never silently select | Fix facility-level regimen during clinical governance; consider Nigerian formulary alignment |
| U7 | **PubMed IDs for NATHAN-2018 and ALTHABE-2020** | ⚠️ URLs constructed from known citation metadata; not clicked through this session | — | Verify both URLs resolve during clinical review; correct if mismatched |
| U8 | **Nigerian drug availability assumptions in test cases** (e.g., TXA stocked at PHC in case-01/02) | Assumption — based on WHO EML listing and Nigeria MNH program direction, not on verified facility stock data | Test cases carry explicit `resources.medications_available` fields so the engine reads availability from input, never assumes | Validate against real facility assessments in pilot design |

---

## 4. Review log

| Date | Reviewer | Action | Result |
|---|---|---|---|
| 2026-08-11 | Clinical_Content_Author (AI agent, supervised) | Initial authoring of `pph-pathway.v1.json`, `medications.v1.json`, `thresholds.v1.json`, `schema.md`, `data/pph-case-01..03.json`, `data/adversarial-cases.v1.json`; web verification of WHO 2012, WHO 2017 TXA, FIGO 2022 (primary full text read), shock-index threshold literature, fluid-resuscitation recommendation | Draft created; UNVERIFIED log opened (U1-U8). **No human clinical sign-off yet — required before pilot.** |

*Next review due: upon human clinician review, or when any dose/threshold changes, or before any simulation demo that external parties will treat as clinically representative.*

---

## 5. Standing disclaimer for all derivative artifacts

Any report, UI string, simulation, or application material derived from these data files must carry: *"Clinical content is guideline-aligned draft pending independent clinical review; MamaSafe AI is a decision-support system in development — recommendations, never commands; not cleared or approved for clinical use; all patient data are synthetic."*
