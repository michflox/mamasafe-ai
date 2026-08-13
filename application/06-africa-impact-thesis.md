# 6. Africa Impact Thesis

## Thesis statement

Africa's maternal-mortality crisis will not be solved by knowledge generation — the knowledge already exists — nor by workforce expansion alone, which WHO projections show will remain ~10 million workers short globally by 2030 [WHO, 2023]. It will be solved by **knowledge delivery**: converting verified guidelines into executable, offline, patient-specific workflows that multiply the capability of every existing frontline health worker. MamaSafe AI is built precisely on that thesis.

## The multiplier logic

The standard framing — "Africa needs more doctors" — implies a decades-long training pipeline as the only path. The African Region already has the lowest doctor density of any WHO region, around 2 physicians per 10,000 population [WHO health workforce data, 2023–2024]. MamaSafe AI pursues a parallel, faster lever: raise the effective emergency-care capability of the midwives, nurses, community health officers, and CHEWs who are **already present** at the point of care.

Multiplication happens along five axes, each mapped to a documented constraint:

1. **Time** — emergency recognition in seconds (shock index, early-warning scoring computed instantly from vitals), not after a protocol is found and read.
2. **Information** — the correct action sequence, dose, contraindication screen, and escalation threshold for *this* patient, delivered at the bedside, cited to WHO/FIGO/FMOH sources.
3. **Staffing** — a tireless second pair of eyes: the checklist runs in parallel with the worker's hands; the system asks for missing critical information; read-backs replace an absent second checker.
4. **Referral** — structured, complete SBAR handoffs and referral notes generated in seconds, so receiving facilities can prepare and care continuity survives transport.
5. **Connectivity** — everything above works offline; synchronization is deferred, never blocking.

## Why Nigeria first

- **Burden:** ~82,000 maternal deaths in 2020, ~28.5% of the global total; MMR 1,047 per 100,000 (UN MMEIG 2020 estimates) [UN MMEIG country profile for Nigeria, 2023]; NDHS 2018 estimated 512 per 100,000 [NPC & ICF, 2019]. Both figures describe an extreme burden by any measure.
- **Volume:** ~7.8 million births annually [UN MMEIG country profile, 2020 data] — the highest in Africa — so even marginal per-birth improvements yield large absolute gains.
- **Coverage gap:** only 43% of births are attended by a skilled provider and 39% occur in health facilities [NDHS 2018] — meaning facility-based workers face concentrated, high-acuity caseloads and community-level workers need escalation support most.
- **Ecosystem:** a large primary-health-center network, active state ministries of health, major NGO and development-partner maternal-health programs, and multiple languages (English, Nigerian Pidgin, Hausa, Yoruba, Igbo) that make multilingual AI capability genuinely valuable rather than decorative.

## Alignment with global and continental agendas

- **SDG 3.1** — global MMR below 70 per 100,000 by 2030. Current progress is badly off track; knowledge-delivery tools are among the few interventions that can scale within the remaining window.
- **WHO Global Roadmap for Postpartum Haemorrhage (2024)** — WHO and partners' PPH Roadmap identifies research, norms, and implementation priorities for exactly the emergency MamaSafe AI operationalizes first.
- **WHO PPH recommendations** — the product encodes WHO's uterotonic and TXA guidance (1 g IV TXA within 3 hours of birth [WHO, 2017], supported by the WOMAN trial's ~one-third reduction in bleeding deaths when given early [Lancet 2017]) as deterministic, time-tracked workflow steps.
- **Health-workforce strengthening** — WHO's call to protect, support, and expand the health workforce includes equipping existing workers with better tools; simulation mode doubles as a training asset for nursing, medical, midwifery, and anesthesia programs.

## What impact we will claim — and what we will not

We commit to honest, staged impact measurement (see the research proposal, asset 15):

- **Simulation phase (now):** emergency recognition time, critical-action completion, medication-calculation accuracy, guideline adherence, referral-note completeness, usability, clinician workload, and rate of unsafe AI outputs.
- **Pilot phase (ethically governed, later):** referral quality, workflow completion, time to escalation, documentation quality, treatment delays.
- **Explicitly not claimed:** mortality reduction. We will not assert lives saved until a properly designed study with adequate power and ethical oversight supports it. Anyone claiming otherwise for a product at our stage should not be believed.

## The continent-scale pathway

MamaSafe AI's architecture is deliberately modular — shared patient data model, rule engine, knowledge/retrieval system, audit system, localization layer, offline engine, medication library, referral engine — so that proven workflows extend in sequence: Phase 1 maternal/newborn emergencies (Nigeria) → Phase 2 pediatric emergencies and severe malaria → Phase 3 sickle-cell care (SickleSafe) → Phase 4 malaria clinical + public-health intelligence (MalariaShield) → Phase 5 immunization outreach (VaxReach) → Phase 6 a unified Africa Clinical Copilot. Geographic expansion follows the same shared infrastructure into other African markets, with local guideline configuration (FMOH-equivalent protocols per country), local-language packs, and local data-governance compliance. The impact thesis scales because the platform, not any single module, is the product.
