# 23. Potential Interview Questions & Responses

Anticipated Google Africa Applied AI Lab interview questions, with the responses we would give. Tone: direct, evidence-cited, honest about limits.

---

**Q1. "Walk us through the problem in ninety seconds."**
Roughly every two minutes a woman dies of pregnancy or childbirth causes — about 260,000 deaths in 2023 [WHO, 2025]. Sub-Saharan Africa carries ~70% of global maternal deaths; Nigeria alone lost an estimated 82,000 mothers in 2020, MMR 1,047 per 100,000 [UN MMEIG, 2023]. Hemorrhage is the leading cause — ~27% of maternal deaths [WHO systematic analysis, Lancet GH 2025] — and it's treatable: TXA within three hours cut bleeding deaths by a third in the WOMAN trial [Lancet 2017]. The knowledge exists. What fails is delivery at 2 a.m. in a primary-health center: one worker, no time, no connectivity, no second checker. Everyone frames this as "train more doctors" — WHO projects we'll still be ~10 million health workers short by 2030 [WHO, 2023]. We attack the parallel lever: multiply the capability of the workers who are already there.

**Q2. "Why you? Why is your team the one to build this?"**
I'm a practicing CRNA. Hemorrhage resuscitation, hemodynamic crisis, medication safety, airway emergencies — that's my daily clinical substance, not a market I researched. I've spent years building AnesthesiaOS, a safety-first clinical AI platform, so the responsible-AI architecture here isn't aspiration — it's inheritance. And I write and publish research, which is why every number in our application is cited and every capability claim is labeled built-versus-designed. You can test all three claims in the demo today.

**Q3. "Show me the product. What actually works today?"**
The postpartum hemorrhage workflow, end to end, in simulation mode with synthetic cases: intake structuring with per-value confirmation; deterministic recognition — for our demo case, shock index 1.4, flagged critical; the prioritized PPH pathway with the TXA three-hour clock; contraindication screening that reacts in real time; escalation thresholds; a generated SBAR referral handoff with voice read-back; and a tamper-evident audit trail of everything. It runs fully offline — I'll switch the network off live. What's still in build: live Gemini calls (the demo runs on our mandatory offline fallback), the preeclampsia and sepsis modules, and the multilingual layers.

**Q4. "Everyone says 'AI for health.' Why is your use of AI responsible rather than reckless?"**
Because we separated the two things AI does well from the one thing it must never do. Gemini handles language — intake structuring, grounded Q&A, translation, documentation, simulation narration. A deterministic, version-controlled, guideline-cited rule engine owns every dose, threshold, contraindication, and escalation criterion. Outputs are stamped RULE-BASED or AI-GENERATED — VERIFY. Consequential actions need human confirmation with the rule and citation visible at the point of confirmation. Fabricated citations and rule conflicts are rejected automatically. And a gated adversarial evaluation suite — prompt injection, wrong-dose bait, fabricated-citation bait, translation attacks — must pass before any update ships.

**Q5. "What stops a hallucination from hurting a patient?"**
Architecture, not vigilance. The model cannot change a dose because it never computes one. It cannot invent guidance because answers must be grounded in retrieved, cited guideline passages, and citations not in the corpus are stripped and flagged. It cannot act because humans confirm. And it cannot hide because everything is in the hash-chained audit log. Hallucination becomes a contained language-layer defect that the safety spine catches — not a clinical event.

**Q6. "How is Google AI essential here — or is this a wrapper?"**
Meaningful in four places. Gemini: structuring messy multilingual intake, guideline-grounded Q&A with citations, SBAR and referral drafting, patient-facing explanation, translation across English, Pidgin, Hausa, Yoruba, Igbo, and simulation narration. Gemma: offline edge inference so zero-connectivity facilities get local retrieval and education — that's the roadmap tier for the exact environments we serve. Vertex AI: evaluation, guardrails, monitoring, and version control — our safety suite runs as a release gate. Maps, later and conditionally: referral routing where facility and road data are reliable. Remove the Google stack and the product still functions safely — that's deliberate — but it loses the language intelligence that makes it usable at scale.

**Q7. "Offline-first sounds expensive and hard. How real is it?"**
Real enough to demo by killing the network on camera. The clinical pathways are cached data; the rule engine is pure functions with zero runtime dependencies; storage is local with deferred sync; offline explanations are deterministic templates derived from rule outputs. The expensive part — conversational AI offline — is exactly the Gemma edge problem we'd like the Lab's help with. But safety never depended on connectivity, by design.

**Q8. "What's your regulatory strategy?"**
Honesty first: we're development-stage, simulation-only, clinical decision support — no FDA, CE, or NAFDAC claims, and we market nothing autonomous. Structurally, we document every feature with intended use, failure modes, hazards, and risk controls, aligned with IEC 62304 / ISO 14971 / IEC 62366-1 thinking, so the evidence trail exists before regulators ask. Deployment stages — simulation, shadow mode, then supported-use pilots under Nigerian ethics approval — generate the real-world evidence a future regulatory conversation will need.

**Q9. "How do you make money without pricing out the clinics that need you most?"**
Facility subscriptions tiered so the entry tier — the emergency workflows themselves — is priced for small PHCs; government licensing for scale; NGO-sponsored deployments; training licenses for nursing and medical schools; later, API licensing. Two commitments are absolute: we never meter an emergency per use, and we never monetize clinical data. Premium tiers and institutional contracts cross-subsidize the front line.

**Q10. "What could kill this company?"**
Three honest answers. Clinical-content governance at scale — each module needs expert-reviewed, cited pathways; we mitigate with versioned data-driven rules and external clinical review. Partnership velocity — pilots need a ministry or NGO anchor; we mitigate with a staged proposal that de-risks their participation, starting at simulation with zero patient exposure. And trust — one overhyped competitor harming someone could poison the category; our answer is to be the counterexample: audited, cited, honest about limits.

**Q11. "What would you measure to prove this works — and what won't you claim?"**
Simulation phase: recognition time, critical-action completion, calculation accuracy, guideline adherence, referral-note completeness, usability, workload, unsafe-output rate. Pilot phase: referral quality, workflow completion, time to escalation, documentation, treatment delays. What we won't claim until an adequately powered, ethically approved study exists: mortality reduction. Anyone at our stage claiming it should not be believed.

**Q12. "Where does this go in five years?"**
Maternal emergencies proven in Nigeria — PPH, preeclampsia/eclampsia, sepsis, newborn resuscitation — then the platform phases on shared infrastructure: pediatric emergencies, SickleSafe for sickle-cell care, MalariaShield for clinical and public-health malaria intelligence, VaxReach for immunization outreach, and ultimately the Africa Clinical Copilot: one offline-capable, multilingual, safety-audited platform for frontline care across the continent. The module is the proof; the platform is the company.

**Q13. "Why should the Lab choose you over fifty other health-AI applicants?"**
Three things you can verify this week. A working demo — not a deck — that runs the leading cause of maternal death end to end, offline, on synthetic cases. A safety architecture a clinician-engineer built because he's administered these drugs himself: deterministic spine, human confirmation, tamper-evident audit, adversarial test gates. And radical honesty: every statistic cited, every capability labeled built or designed, every limit stated before you ask. We are not asking the Lab to believe in an idea. We're asking it to accelerate something that already exists.

**Q14. "What do you need from Google that you can't do yourselves?"**
Multilingual clinical grounding done right — Nigerian Pidgin, Hausa, Yoruba, Igbo — with community validation; that is a genuine research problem, not a settings toggle. Edge inference on the devices frontline workers actually carry. Vertex-grade evaluation infrastructure for our safety suite. And the convening credibility that turns a good pilot proposal into signed ministry and NGO partnerships.

**Q15. "If you remember one thing from this interview?"**
MamaSafe AI doesn't bring AI to replace African health workers. It brings the world's verified emergency knowledge — offline, in their language, under their command — to multiply the health workers Africa already has.
