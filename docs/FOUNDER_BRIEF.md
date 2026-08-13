You are my senior AI product architect, clinical AI engineer, startup CTO, and Google Africa Applied AI Lab application strategist.

Your mission is to help me design and build a real, working healthcare AI product for my 2026 Google Africa Applied AI Lab application.

## Founder Background

I am a CRNA/anesthesia clinician, healthcare researcher, AI builder, and founder working on AnesthesiaOS, a safety-oriented perioperative AI platform. My strengths include:

* High-acuity anesthesia and perioperative medicine
* Clinical decision-making and emergency response
* AI safety, medical liability, and clinical governance
* Healthcare workflow design
* Research and scholarly writing
* Software/AI product development
* Strong interest in solving healthcare problems in Nigeria and across Africa

I want the Google Africa Applied AI Lab application to show that I am not merely proposing an idea. I want to demonstrate:

* Founder-market fit
* A working product
* Real clinical usefulness
* Responsible AI
* African relevance
* Technical credibility
* Commercial scalability

---

# PRIMARY PRODUCT

Build:

# MamaSafe AI / AnesthesiaOS Africa

An offline-first, multilingual, AI-powered clinical workflow and emergency escalation copilot for frontline healthcare workers in Nigeria and eventually across Africa.

The initial product should focus primarily on:

## Maternal, obstetric, newborn, and perioperative emergencies

Do NOT try to build every healthcare feature at once.

The MVP should prove one clear concept exceptionally well.

The initial flagship workflows should include:

1. Postpartum hemorrhage
2. Severe preeclampsia
3. Eclampsia
4. Maternal sepsis
5. Obstetric deterioration
6. Emergency cesarean preparation
7. Obstetric anesthesia preparation
8. Newborn resuscitation
9. Referral and escalation
10. Structured handoff

The platform must support clinicians rather than replace them.

It must be positioned as:

> AI-assisted clinical decision support, workflow execution, training, documentation, and referral coordination.

It must NOT be marketed as autonomous diagnosis or autonomous treatment.

---

# CORE PRODUCT EXPERIENCE

Design the system for use by:

* Midwives
* Nurses
* Community health officers
* CHEWs
* Physicians
* Anesthesia providers
* Rural health workers
* Primary healthcare centers
* Secondary hospitals
* Emergency units

A clinician should be able to enter or speak:

* Age
* Pregnancy status
* Gestational age
* Weight
* Blood pressure
* Heart rate
* Respiratory rate
* Oxygen saturation
* Temperature
* Mental status
* Symptoms
* Estimated bleeding
* Urine output
* Fetal heart rate where available
* Relevant laboratory values
* Medications already given
* Available resources
* Facility capabilities
* Transfer options

The system should generate:

1. Risk categorization
2. Immediate red flags
3. Missing critical information
4. Prioritized action checklist
5. Relevant verified guideline pathway
6. Medication calculations where appropriate
7. Fluid or transfusion calculations when appropriate
8. Monitoring recommendations
9. Escalation threshold
10. Referral recommendation
11. Structured referral note
12. SBAR-style handoff
13. Voice read-back
14. Patient/family explanation
15. Audit record

Human confirmation must be required before any consequential clinical action.

---

# GOOGLE AI INTEGRATION

The Google AI component must be meaningful enough to satisfy the Google Africa Applied AI Lab.

Design the architecture around:

## Gemini

Use Gemini for:

* Natural-language clinical intake
* Voice-to-structured-data conversion
* Multimodal interpretation of forms where appropriate
* Guideline-grounded question answering
* Handoff generation
* Referral-note generation
* Patient education
* Translation
* Clinical simulation
* Training scenarios
* Explaining protocol steps
* Identifying missing information

## Gemma

Explore Gemma for:

* Offline or edge inference
* Low-connectivity facilities
* Private processing
* Local clinical knowledge retrieval
* Small controlled models
* Offline educational functionality

## Vertex AI / Google Cloud

Use for:

* Model hosting
* Evaluation
* RAG
* Guardrails
* Monitoring
* Logging
* Version control
* Safety evaluation
* Model comparison
* Analytics

## Google Maps / geospatial capability

Potential future functionality:

* Referral routing
* Nearest capable facility
* Estimated transport time
* Facility capability mapping
* Emergency transfer coordination

Only use these when reliable local data are available.

---

# CRITICAL SAFETY ARCHITECTURE

The product must have a strict separation between:

## Generative AI layer

Used for:

* Language
* Explanation
* Translation
* Summarization
* Conversation
* Documentation
* Retrieval

AND

## Clinical rules / safety layer

Used for:

* Medication limits
* Critical thresholds
* Dosing formulas
* Emergency protocol sequencing
* Contraindications
* Escalation criteria
* Mandatory warning conditions

High-risk clinical calculations should NOT rely purely on unconstrained LLM generation.

Use:

* Deterministic functions
* Validated algorithms
* Version-controlled clinical rules
* Source-linked guidelines
* Human confirmation
* Audit logs
* Fail-safe defaults

Design for eventual regulatory scrutiny.

---

# OFFLINE-FIRST AFRICA DESIGN

Assume:

* Intermittent internet
* Low bandwidth
* Older Android devices
* Limited computing resources
* Variable literacy
* Multiple Nigerian languages
* Limited specialist availability
* Limited laboratory access
* Limited blood products
* Variable oxygen availability
* Referral delays
* Power instability

The product should continue providing essential functionality without internet.

Consider:

* Local storage
* Offline clinical pathways
* Local small-language models
* Deferred synchronization
* Cached protocols
* Low-data voice
* Progressive web app
* Android application
* SMS fallback where appropriate

---

# MULTILINGUAL DESIGN

Build the architecture to eventually support:

* English
* Nigerian Pidgin
* Hausa
* Yoruba
* Igbo

Clinical terminology must remain safe and unambiguous.

Provide separate:

* Clinician-facing language
* Patient-facing language

Do not allow casual translation to alter medication names, concentrations, doses, or clinical thresholds.

---

# MVP

For the Google application, prioritize a polished MVP rather than a giant unfinished platform.

Build the first complete end-to-end workflow around:

# Postpartum Hemorrhage

Create a realistic simulation:

Example:

A 29-year-old woman has just delivered.

Input:

* HR 124
* BP 88/52
* ongoing bleeding
* estimated blood loss 1,100 mL
* altered weakness/dizziness
* uterine tone information
* IV access information
* available medications
* available blood products

The system should:

* detect emergency features
* identify missing critical information
* launch the postpartum hemorrhage pathway
* provide prioritized actions
* calculate relevant weight-based values when clinically appropriate
* clearly distinguish guideline actions from AI-generated explanation
* document clinician confirmations
* generate referral/handoff documentation
* produce an audit trail

Use synthetic cases only for development.

---

# SECONDARY MATERNAL MODULES

Once PPH works, add:

## Severe preeclampsia/eclampsia

Support:

* severe-range BP recognition
* neurologic symptoms
* seizure-related workflow
* magnesium safety checks
* antihypertensive pathway
* fetal considerations
* transfer escalation
* monitoring
* toxicity warning signs

## Maternal sepsis

Support:

* early recognition
* infection risk
* physiologic deterioration
* escalation
* antibiotics pathway guidance based on configured local protocols
* fluids
* monitoring
* referral

## Obstetric anesthesia

Eventually integrate AnesthesiaOS functionality:

* preoperative assessment
* anesthetic risk identification
* neuraxial considerations
* difficult airway preparedness
* hemorrhage preparedness
* postoperative monitoring
* emergency conversion planning

---

# PEDIATRIC EMERGENCY EXPANSION

Design the underlying platform so we can later add:

# Pediatric Emergency Copilot

Potential modules:

1. Pediatric sepsis
2. Severe malaria
3. Respiratory distress
4. Pneumonia
5. Dehydration
6. Severe diarrhea
7. Hypoglycemia
8. Pediatric seizures
9. Meningitis danger signs
10. Shock
11. Severe anemia
12. Pediatric medication calculations
13. Pediatric emergency airway support
14. Neonatal emergencies
15. Malnutrition-related emergencies

Create reusable pediatric components for:

* age
* weight
* weight estimation
* dosing
* fluid calculations
* normal vital-sign ranges
* emergency thresholds

The system must aggressively protect against pediatric dosing errors.

---

# SICKLE-CELL PLATFORM

Future product/module:

# SickleSafe Nigeria

Create an AI-enabled sickle-cell management and prevention platform.

Functions may include:

## Patient management

* Crisis history
* Individual baseline
* Pain crisis plan
* Fever alerts
* Acute chest syndrome warning
* Stroke warning
* Anemia monitoring
* Transfusion history
* Medication history
* Hydroxyurea adherence
* Appointment reminders
* Vaccination reminders
* Infection prevention
* Pregnancy monitoring

## Pediatric sickle-cell care

* Newborn screening tracking
* Penicillin prophylaxis reminders where appropriate
* Vaccination adherence
* Growth tracking
* Fever escalation
* Stroke-risk follow-up
* Parent education

## Prevention and reproductive counseling

Create culturally appropriate education around:

* AS
* AC
* SS
* SC
* genotype inheritance

Build educational tools that explain inheritance probabilities clearly.

Do NOT stigmatize people living with sickle-cell disease or sickle-cell trait.

Consider an interactive genetic counseling tool that allows two people to enter genotype combinations and receive:

* possible offspring genotypes
* probability explanations
* genetic counseling recommendation
* educational resources

This is educational support, not reproductive coercion.

---

# MALARIA PLATFORM

Future module:

# MalariaShield AI

Do NOT build a symptom-only malaria diagnostic chatbot.

Instead build a broader malaria support platform.

Potential functions:

## Clinical support

* RDT result recording
* danger-sign recognition
* severe malaria referral
* pregnancy-related malaria support
* pediatric danger signs
* treatment adherence
* follow-up

## Public health

Use:

* rainfall
* temperature
* case reports
* vector trends
* medication inventory
* RDT supply
* geography

to help predict:

* outbreaks
* hotspots
* medicine demand
* RDT demand
* outreach priorities

Potential users:

* PHCs
* health ministries
* NGOs
* malaria programs

---

# IMMUNIZATION PLATFORM

Future module:

# VaxReach AI

Goal:

Reduce zero-dose and under-immunized children.

Potential features:

* Identify children likely to miss vaccination
* Predict dropout
* Generate outreach lists
* Optimize mobile vaccination routes
* Forecast vaccine demand
* Identify geographic gaps
* Parent reminders
* Multilingual educational messages
* Track missed appointments
* Detect incomplete records
* Community-health-worker dashboard

Privacy must be maintained.

---

# PRIMARY-CARE / FRONTLINE COPILOT

Eventually expand MamaSafe into:

# Africa Clinical Copilot

A broader frontline decision-support engine covering:

* Maternal health
* Pediatrics
* Malaria
* Sickle cell
* Hypertension
* Diabetes
* Sepsis
* Emergency triage
* Perioperative medicine
* Anesthesia
* Medication safety
* Referral

The core platform should therefore be modular.

Do not hard-code MamaSafe in a way that prevents expansion.

Create:

* shared patient data model
* shared rule engine
* shared RAG system
* shared audit system
* shared localization layer
* shared offline engine
* shared medication library
* shared referral engine

Then clinical packages should plug into the platform.

---

# CONFIDENTIAL CARE / KEY POPULATIONS

Design but DO NOT rush deployment of:

# SafeAccess

A privacy-preserving health-navigation product for marginalized and key populations, including people who may experience discrimination when seeking healthcare.

Potential services:

* Confidential HIV information
* STI information
* PrEP education
* PEP education
* HIV testing navigation
* Trusted provider referral
* Medication reminders
* Mental-health navigation
* Anonymous telehealth intake

Safety requirements:

* Data minimization
* No unnecessary legal names
* Avoid precise location storage
* Discreet notifications
* Neutral app branding
* Encryption
* User-controlled deletion
* Threat modeling
* Community co-design
* Human-rights review
* Trusted NGO partnership

Do NOT deploy this population-specific functionality without community partners and a formal privacy/safety review.

---

# HYPERTENSION / NCD MODULE

Future capabilities:

* Hypertension screening
* BP trend monitoring
* Medication adherence
* Stroke-risk warning
* Diabetes monitoring
* Kidney-risk screening
* Pregnancy hypertension
* Community health worker follow-up

Maternal hypertension should be part of MamaSafe first.

---

# CLINICAL KNOWLEDGE SYSTEM

Build a guideline-grounded knowledge architecture.

Every clinical answer should ideally indicate:

* source guideline
* guideline organization
* guideline version/year
* relevant section
* date last reviewed

Use authoritative sources such as:

* WHO
* Nigerian Federal Ministry of Health
* UNICEF where applicable
* recognized professional societies
* internationally accepted specialty guidelines

Never allow the system to silently invent guidance.

Implement RAG with source attribution.

---

# DATA GOVERNANCE

Design for:

* encryption in transit
* encryption at rest
* role-based access
* audit logs
* minimum necessary information
* deidentification
* research consent where relevant
* local data governance
* Nigerian data-protection requirements
* eventual cross-border expansion

Separate:

* clinical operations data
* analytics data
* research data
* model-training data

Do not automatically use patient data for model training.

---

# MODEL EVALUATION

Create an AI safety evaluation suite.

Test:

* hallucination
* incorrect medication recommendations
* incorrect calculations
* omitted emergencies
* wrong escalation
* incorrect contraindications
* prompt injection
* fabricated guideline citations
* translation errors
* pediatric dosing errors
* pregnancy-specific errors

Create synthetic adversarial cases.

Every model update should run through this test suite.

---

# SIMULATION MODE

Because this is a healthcare product, build an impressive simulation environment.

Simulation should allow clinicians to practice:

* PPH
* eclampsia
* maternal sepsis
* newborn resuscitation
* pediatric shock
* severe malaria
* sickle-cell emergencies

The AI can change patient status based on actions.

Use simulation mode as:

* training
* product demonstration
* testing
* research
* validation

This gives us a powerful Google demo without exposing real patients.

---

# RESEARCH COMPONENT

Design prospective research studies that could eventually measure:

## Simulation phase

* emergency recognition time
* critical action completion
* medication calculation accuracy
* guideline adherence
* referral-note completion
* usability
* clinician workload
* unsafe AI outputs

## Pilot phase

Later evaluate:

* referral quality
* workflow completion
* time to escalation
* documentation
* treatment delays

Do NOT claim mortality reduction without sufficient evidence.

---

# COMMERCIAL MODEL

Help me explore realistic customers:

* Private hospitals
* Nigerian health systems
* State ministries of health
* Federal programs
* NGOs
* Maternal health organizations
* Nursing schools
* Medical schools
* anesthesia training programs
* development organizations

Potential models:

* facility subscription
* enterprise contracts
* government licensing
* NGO-supported deployment
* training licenses
* freemium clinician education
* API licensing

Keep essential emergency functionality affordable.

---

# GOOGLE AFRICA APPLIED AI LAB APPLICATION

While building the system, maintain an application folder containing:

1. Executive summary
2. Problem statement
3. Product description
4. Founder story
5. Founder-market fit
6. Africa impact thesis
7. Google AI integration
8. Competitive landscape
9. Safety strategy
10. Business model
11. Product roadmap
12. Technical architecture
13. Demo script
14. Pilot proposal
15. Research proposal
16. Pitch-deck content
17. Two-minute application video script
18. One-sentence company description
19. 50-word description
20. 100-word description
21. 250-word description
22. FAQ answers
23. Potential interview questions and responses

---

# APPLICATION STORY

The central narrative should be:

> Africa does not only face a shortage of clinicians. Frontline health workers frequently work under severe time, information, staffing, referral, and connectivity constraints. MamaSafe AI turns verified medical knowledge into offline, actionable clinical workflows that help existing healthcare workers recognize emergencies earlier, execute critical protocols more consistently, and communicate referrals more effectively.

Do not describe AI as replacing African healthcare workers.

Describe it as multiplying their capabilities.

---

# PRODUCT VISION

The long-term story is:

## Phase 1

MamaSafe AI

Maternal + newborn emergencies.

## Phase 2

Pediatric Emergency AI

Pediatric emergencies and severe malaria.

## Phase 3

SickleSafe

Sickle-cell care, screening, follow-up, emergency support, and genetic education.

## Phase 4

MalariaShield

Clinical + public-health malaria intelligence.

## Phase 5

VaxReach

Immunization and zero-dose outreach.

## Phase 6

Africa Clinical Copilot

Unified frontline healthcare platform.

These should share the same underlying infrastructure.

---

# WHAT I WANT YOU TO DO NOW

Do not merely write a business plan.

Build this project.

Start by inspecting the development environment and existing AnesthesiaOS files if available.

Then:

1. Create the repository architecture.
2. Produce the product requirements document.
3. Design the system architecture.
4. Create the clinical module architecture.
5. Create the safety architecture.
6. Define the database schema.
7. Define API contracts.
8. Build the frontend.
9. Build the backend.
10. Implement the postpartum hemorrhage MVP.
11. Create synthetic clinical cases.
12. Implement the clinical rule engine.
13. Implement Gemini integration.
14. Implement offline capability.
15. Implement source-linked RAG.
16. Implement audit logging.
17. Create simulation mode.
18. Create automated clinical safety tests.
19. Write technical documentation.
20. Create deployment instructions.
21. Build the Google Lab application assets.
22. Create a demo script.
23. Produce a roadmap for the remaining modules.

Keep the code modular, secure, testable, and production-oriented.

Do not fabricate completed features.

Maintain:

* BUILD_STATUS.md
* ROADMAP.md
* SAFETY.md
* CLINICAL_SOURCES.md
* GOOGLE_AI_LAB_APPLICATION.md
* TEST_RESULTS.md

Update these documents as development proceeds.

---

# DEVELOPMENT PRIORITY

If time is constrained, prioritize in this exact order:

1. Beautiful functional postpartum hemorrhage demo
2. Safety and clinical rule engine
3. Gemini integration
4. Offline functionality
5. Auditability
6. Simulation testing
7. Strong Google application materials
8. Preeclampsia/eclampsia
9. Maternal sepsis
10. Newborn resuscitation
11. Pediatric emergency architecture
12. Sickle-cell architecture
13. Malaria architecture
14. Immunization architecture
15. Other modules

One excellent working workflow is more valuable than 15 partially functional modules.

---

# DESIGN PRINCIPLE

The final product should make a Google reviewer think:

> “This founder understands a massive African healthcare problem, has authentic clinical expertise, has built something real, understands responsible medical AI, knows exactly where Google AI creates value, and has a credible pathway from one focused product to a continent-scale platform.”

Begin by producing:

A. a concise assessment of this vision,
B. the recommended final product name,
C. repository structure,
D. technology stack,
E. system architecture,
F. MVP scope,
G. development sequence,
H. the first working implementation.

Then immediately begin implementation rather than stopping at planning.
