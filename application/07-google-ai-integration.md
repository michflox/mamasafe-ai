# 7. Google AI Integration

## Design principle: meaningful, not decorative

Google AI is not a wrapper around this product — it is the division of labor the architecture is built on. MamaSafe AI separates clinical work into two kinds:

- **What must be deterministic** — doses, thresholds, contraindications, escalation criteria, protocol sequencing — owned exclusively by the version-controlled clinical rule engine, cited to WHO/FIGO/FMOH/ACOG/RCOG sources.
- **What language models do uniquely well** — understanding messy human input, explaining, translating, drafting documents, retrieving grounded knowledge, and generating realistic training scenarios — owned by Google's AI stack.

This separation is the responsible-AI story: Gemini makes the product dramatically more usable by frontline workers; the rule engine makes it safe enough to matter.

## Gemini (cloud, when connectivity exists)

| Use case in the product | Why Gemini specifically |
|---|---|
| **Natural-language and voice intake structuring** — a midwife speaks "she just delivered, bleeding plenty, BP 88 over 52, pulse 124" and receives a structured intake record for confirmation | Multimodal, multilingual speech and language understanding; converts unstructured frontline reality into the structured inputs the rule engine requires |
| **Voice-to-structured-data conversion** for hands-busy emergency documentation | Speech understanding in noisy clinical environments; clinician confirms every extracted value before it enters the record |
| **Guideline-grounded question answering** — "why TXA now?" returns an explanation grounded in the retrieved WHO/FIGO passage, with the citation shown | Retrieval-augmented generation with source attribution; every answer displays the source guideline, organization, year/version, and section — fabricated citations are treated as safety failures in our eval suite |
| **Handoff and referral-note generation** — SBAR drafts assembled from the confirmed clinical record | Long-context synthesis of the case timeline into a structured document the clinician reviews and signs |
| **Patient/family explanation** — plain-language, compassionate explanation of what is happening and why transfer is needed | Tone and literacy adaptation; strictly separate from clinician-facing terminology |
| **Translation** — clinician-facing and patient-facing layers across English, Nigerian Pidgin, Hausa, Yoruba, Igbo | Multilingual capability; **architectural guarantee:** drug names, concentrations, doses, and clinical thresholds pass through untranslated tokens so casual translation can never alter a dose |
| **Clinical simulation and training scenarios** — evolving patient states, realistic complications, debrief narration | Generative scenario diversity on top of deterministic physiology rules; the rule engine decides whether the patient deteriorates — Gemini narrates and explains |
| **Protocol-step explanation and missing-information identification** | Conversational clarity over the deterministic pathway ("we still need her weight to check this dose") |

**Guardrail contract for every Gemini call:** the model receives structured context from the rule engine and the retrieved guideline corpus; it is prompt-constrained against generating doses, thresholds, or contraindications; its outputs are stamped **AI-GENERATED — VERIFY**; and post-processing checks reject any output that conflicts with rule-engine values or fabricates citations.

## Gemma (edge, for offline and private inference)

| Use case | Rationale |
|---|---|
| **Offline clinical knowledge retrieval** — local Q&A against the cached guideline corpus with no network | Small open models run on-device or on a facility edge box; keeps guideline access alive in zero-connectivity PHCs |
| **Offline educational functionality** — protocol walkthroughs, quiz modes, simulation debriefs without connectivity | Training value must not depend on bandwidth |
| **Private processing** — sensitive intake text processed locally, with only de-identified, consented data ever leaving the device | Data-minimization posture aligned with Nigerian data-protection requirements and our governance model |
| **Low-connectivity facilities and older Android devices** | Model-size tiers matched to device capability; graceful degradation to templated rule-derived text when no model can run |

**Honest status:** Gemma edge deployment is in the design/active-build stage. The shipping demo's offline path uses deterministic, templated explanations derived from the rule engine — functional with zero models, zero keys, zero network. Gemma upgrades that offline path from "correct and clear" to "conversational and adaptive."

## Vertex AI / Google Cloud (evaluation, guardrails, operations)

| Capability | Role in MamaSafe AI |
|---|---|
| **Model hosting and versioning** | Managed Gemini endpoints with model-version stamps written into the audit log — every AI-generated output is traceable to the exact model and rule version that produced it |
| **Evaluation infrastructure** | Our clinical safety evaluation suite (hallucination, incorrect medication recommendations, incorrect calculations, omitted emergencies, wrong escalation, incorrect contraindications, prompt injection, fabricated citations, translation errors, pediatric dosing errors, pregnancy-specific errors) runs as a gated pipeline — **no model update ships without passing** |
| **RAG and grounding** | Managed retrieval over the versioned guideline corpus with source attribution |
| **Guardrails and safety filters** | Defense-in-depth layered under our own clinical guardrails (which remain authoritative) |
| **Monitoring, logging, analytics** | Aggregated, de-identified usage and safety telemetry; clinical, analytics, research, and training data kept strictly separate |
| **Model comparison** | Controlled A/B evaluation of Gemini/Gemma versions against the golden synthetic-case set before any upgrade |

## Google Maps Platform / geospatial (future, conditional)

Referral routing, nearest-capable-facility lookup, estimated transport time, facility-capability mapping, and emergency transfer coordination — **deployed only where reliable local facility and road data exist**, and always as decision support with the human making the referral decision. In the interim, the product's referral workflow is data-driven from configured facility directories maintained with partner ministries/NGOs.

## What the Africa Applied AI Lab specifically unlocks

1. **Gemini/Gemma optimization for low-resource, multilingual clinical grounding** — especially Nigerian Pidgin, Hausa, Yoruba, and Igbo, where community-validated clinical phrasing is a genuine research problem.
2. **Vertex AI evaluation rigor** — co-developing evaluation harnesses for clinical LLM safety in emergency workflows, a contribution reusable across African health AI.
3. **Edge deployment engineering** — squeezing safe Gemma inference onto the devices frontline workers actually carry.
4. **Responsible-AI credibility** — a partner whose guardrail philosophy matches our deterministic-spine architecture.

## Integration honesty statement

The demo reviewers see today runs end-to-end **without any live Google AI calls** — deliberately, because frontline Africa cannot depend on connectivity, and neither should a demo. Gemini integration is wired through the AI gateway behind a feature flag with the offline fallback as the default; Vertex AI evaluation runs in our development pipeline; Gemma and Maps are roadmap items. We describe designed-vs-built status precisely in every asset of this application, and `docs/BUILD_STATUS.md` is kept honest as code lands.
