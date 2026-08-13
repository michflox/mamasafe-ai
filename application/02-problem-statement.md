# 2. Problem Statement

## The headline numbers

A woman dies from causes related to pregnancy or childbirth roughly every two minutes. In 2023 there were an estimated 260,000 maternal deaths worldwide [WHO maternal mortality fact sheet, 2025; UN MMEIG, *Trends in maternal mortality 2000 to 2023*, 2025]. The burden is not evenly distributed: sub-Saharan Africa accounts for about 70% of global maternal deaths — approximately 202,000 of 287,000 deaths in 2020, with a regional maternal mortality ratio (MMR) of 545 per 100,000 live births against a global average of 223 [UN MMEIG, *Trends in maternal mortality 2000 to 2020*, 2023].

Nigeria sits at the epicenter. The country recorded an estimated **82,000 maternal deaths in 2020 — about 28.5% of the entire global total** — with an estimated MMR of **1,047 per 100,000 live births** [UN MMEIG country profile for Nigeria, 2023]. Nigeria's own 2018 Demographic and Health Survey estimated an MMR of 512 per 100,000 [NDHS 2018, NPC & ICF, 2019]; the two estimates differ in method, but both describe one of the heaviest maternal-mortality burdens on earth. With roughly **7.8 million births per year** [UN MMEIG country profile, based on UN World Population Prospects 2022], even small improvements in emergency care quality have outsized absolute impact. The Sustainable Development Goal target 3.1 — a global MMR below 70 per 100,000 by 2030 — is badly off track.

## The leading killer is treatable — and time-critical

Haemorrhage is the leading cause of maternal death, responsible for about **27% of maternal deaths globally between 2009 and 2020**, with the highest regional proportion in sub-Saharan Africa [Cresswell JA et al., *Global and regional causes of maternal deaths 2009–20: a WHO systematic analysis*, Lancet Global Health, 2025 — confirming the 27.1% estimate of Say L et al., Lancet Global Health, 2014]. Postpartum hemorrhage (PPH) is exactly the kind of emergency where outcomes are decided by minutes and by protocol fidelity:

- The WOMAN trial (>20,000 women, 21 countries) showed that tranexamic acid (TXA) given **within 3 hours** of birth reduced death due to bleeding by about one third (RR 0.69, 95% CI 0.52–0.91) [WOMAN Trial Collaborators, *Lancet* 2017;389:2105–2116].
- WHO recommends 1 g IV TXA as early as possible, within 3 hours, for diagnosed PPH [WHO, *Recommendation on tranexamic acid for the treatment of postpartum haemorrhage*, 2017].

The knowledge to save these lives exists. The tragedy is the **know-do gap**: at the moment of crisis, in an understaffed primary-health center, the right action sequence, the right dose, the right escalation threshold, and a complete referral note must all be produced under extreme time pressure — often by a single junior worker, at night, without specialist backup.

## It is not only a shortage of clinicians

The conventional framing — "Africa needs more doctors" — is true but incomplete and unhelpfully slow. WHO projects a global shortfall of **~10 million health workers by 2030**, concentrated in low- and lower-middle-income countries [WHO, 2023], and the WHO African Region already has the lowest medical-doctor density of any region — around **2 doctors per 10,000 population** [WHO health workforce data, 2023–2024]. Training pipelines cannot close this gap within any mother's lifetime.

The deeper, more actionable problem is that the health workers who **are** present — midwives, nurses, community health officers, CHEWs — work under five compounding constraints:

1. **Time constraint.** Emergencies like PPH, eclampsia, and sepsis deteriorate in minutes. There is no time to search for a protocol, phone a referral center that may not answer, or reconstruct a drug calculation from memory.
2. **Information constraint.** Guidelines exist as PDFs, posters, and memory aids — not as executable, patient-specific instructions. Weight-based dosing, contraindication screening (e.g., ergometrine in hypertension), and shock-index interpretation are error-prone under stress.
3. **Staffing constraint.** A single frontline worker may cover an entire labor ward overnight. There is no second clinician to double-check a dose or run the checklist while the first performs uterine massage.
4. **Referral constraint.** Referrals fail through poor communication: incomplete handoffs, missing observations, no structured documentation of what was given and when. Receiving facilities cannot prepare. In Nigeria, only 43% of births are attended by a skilled provider and 39% occur in a health facility at all [NDHS 2018, NPC & ICF, 2019], so the facilities that do exist carry enormous, uneven emergency loads.
5. **Connectivity constraint.** Intermittent internet, low bandwidth, power instability, and older Android devices mean that any tool requiring a live cloud connection fails precisely when and where it is needed most.

## Why existing solutions fall short

- **Generic LLM chatbots** answer questions but do not run workflows; they can hallucinate doses, invent guideline citations, and give fluent, confident, wrong answers — unacceptable in an emergency. They also typically require connectivity.
- **Static mHealth apps and PDF protocols** put the cognitive work back on an already overloaded worker.
- **EMR/hospital information systems** document care after the fact; they do not escalate during the emergency, and they are built for connected, well-resourced hospitals.
- **High-fidelity mannequin simulation centers** train effectively but are scarce, expensive, and urban.

## The gap MamaSafe AI fills

There is no widely deployed tool that (a) encodes verified maternal-emergency guidelines as **executable, deterministic clinical logic**, (b) uses modern AI for what it is genuinely good at — language, structuring, explanation, documentation — without letting it touch doses or thresholds, (c) works **fully offline** on modest devices, (d) speaks the languages frontline workers and patients actually speak, and (e) produces the structured referral documentation that makes escalation succeed. That is the product-space MamaSafe AI occupies: turning verified medical knowledge into offline, actionable clinical workflows that multiply the capabilities of the health workers Africa already has.
