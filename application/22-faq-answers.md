# 22. FAQ Answers

Frequently asked questions about MamaSafe AI, with the answers we give consistently.

---

**Q1. Is MamaSafe AI a diagnostic tool?**
No. MamaSafe AI is clinical decision **support**: workflow execution, documentation, referral coordination, and training. It does not diagnose autonomously and does not treat. It produces recommendations grounded in cited guidelines; a qualified clinician reviews and confirms before any consequential action.

**Q2. Does the AI decide drug doses?**
No — and this is the core of our architecture. Every dose, threshold, contraindication, and escalation criterion comes from a deterministic, version-controlled rule engine cited to WHO/FIGO/FMOH/ACOG/RCOG sources. The language model (Gemini) handles language: structuring intake, explaining, translating, drafting documents, narrating simulations. It is architecturally prevented from altering any clinical value.

**Q3. What happens when there is no internet?**
The product keeps working. Pathways, calculations, escalation logic, documentation, and audit logging are fully local. Offline, explanations come from deterministic, rule-derived templates; when connectivity returns, Gemini enriches the language layer. AI is an enhancement, never a dependency — we demonstrate this live by switching off the network mid-emergency.

**Q4. Is this approved for clinical use?**
No. MamaSafe AI is in development and simulation. It is not FDA cleared, not CE marked, not approved by NAFDAC or any other regulator, and we make no such claim anywhere. Our staged pathway — simulation deployment, then shadow mode, then ethically approved supported-use pilots — is designed to earn that future responsibly.

**Q5. Whose guidelines does it follow?**
WHO (including the *Recommendations for the Prevention and Treatment of Postpartum Haemorrhage*, 2012, and the 2017 TXA update; *Managing Complications in Pregnancy and Childbirth*, 2nd ed., 2017), FIGO (PPH consensus guidelines, 2022), Nigerian Federal Ministry of Health protocols (configured at deployment), with ACOG Practice Bulletin No. 183 (2017) and RCOG Green-top No. 52 (2016/2017) as secondary references. Every rule carries organization, document, year/version, and section, and a review log is maintained in `docs/CLINICAL_SOURCES.md`.

**Q6. How do you prevent hallucinations from harming patients?**
Three structural controls: (1) the LLM never computes anything consequential — the deterministic core does; (2) every AI output is stamped AI-GENERATED — VERIFY and must cite sources present in the retrieved guideline corpus, with fabricated citations automatically rejected; (3) a gated clinical evaluation suite — hallucination, wrong doses, wrong calculations, omitted emergencies, wrong escalation, contraindication errors, prompt injection, fabricated citations, translation errors, pediatric dosing, pregnancy-specific errors — must pass before any model or rule update ships.

**Q7. Who is the product for?**
Midwives, nurses, community health officers, CHEWs, physicians, and anesthesia providers in primary healthcare centers, secondary hospitals, and emergency units — including facilities with intermittent power, low bandwidth, and older Android devices.

**Q8. What languages does it support?**
The architecture supports English and Nigerian Pidgin first, then Hausa, Yoruba, and Igbo, with separate clinician-facing and patient-facing layers. One hard invariant: drug names, concentrations, doses, and clinical thresholds are never translated — casual translation can never alter a dose.

**Q9. What about patient data privacy?**
Development and demos use synthetic data only — no real patient data exists in the project today. The governance design includes encryption in transit and at rest, role-based access, minimum-necessary collection, Nigerian data-protection alignment, and strict separation of clinical, analytics, research, and model-training data. Patient data is never automatically used for model training.

**Q10. What is simulation mode?**
A full training and demonstration environment where synthetic patients deteriorate or stabilize in response to clinician actions — PPH today, with eclampsia, sepsis, newborn resuscitation, and pediatric scenarios on the roadmap. It enables training, product evaluation, testing, and research with zero real-patient exposure.

**Q11. How is this different from asking a chatbot medical questions?**
A chatbot answers questions and can be fluently wrong. MamaSafe AI executes workflows: it computes risk from confirmed inputs, sequences protocol steps from cited guidelines, screens contraindications deterministically, tracks the TXA time window, generates the referral handoff, requires human confirmation, and logs everything tamper-evidently — offline.

**Q12. What is the business model?**
Facility subscriptions, government licensing, NGO-supported deployment, training licenses for education institutions, and later API licensing. Non-negotiable commitments: essential emergency functionality stays affordable, emergencies are never metered per use, and clinical data is never monetized.

**Q13. Why Nigeria first?**
The burden and the leverage: ~82,000 maternal deaths in 2020 (~28.5% of the global total) and MMR 1,047 per 100,000 [UN MMEIG, 2023]; ~7.8 million births a year; only 43% of births with a skilled provider and 39% in facilities [NDHS 2018]; plus active state health systems, NGO programs, and the languages that make multilingual AI genuinely valuable.

**Q14. What do you want from the Google Africa Applied AI Lab?**
Technical partnership: Gemini/Gemma multilingual clinical grounding (including Nigerian Pidgin, Hausa, Yoruba, Igbo), edge-inference engineering for low-end devices, and Vertex AI evaluation rigor for our safety suite — plus the credibility that helps open ministry, NGO, and academic pilot partnerships.

**Q15. Do you claim the product saves lives?**
No. We claim — and will measure — earlier recognition, more consistent protocol execution, and better referral communication, staged from simulation metrics to ethically governed pilot outcomes. Mortality-reduction claims require adequately powered studies we have not yet run, and we say so plainly.

**Q16. What happens if the clinician disagrees with the system?**
The clinician wins, always. Manual override is permanently available, overrides are audit-logged, and disagreement patterns are reviewed in pilots as safety signal. The product advises; humans decide.

**Q17. Could the system be used by untrained laypeople?**
It is designed and documented for trained frontline health workers. Intended-use and prohibited-use terms accompany every deployment, and the confirmation design assumes clinical review capability. Autonomous or lay diagnostic use is explicitly out of scope.

**Q18. What is AnesthesiaOS and how does it relate?**
AnesthesiaOS is the founder's safety-first perioperative AI platform — the engineering lineage MamaSafe AI inherits: simulation-only development, mandatory provider oversight, immutable audit, recommendations-never-commands, and regulatory honesty. MamaSafe AI is the maternal-health flagship on the AnesthesiaOS Africa platform.
