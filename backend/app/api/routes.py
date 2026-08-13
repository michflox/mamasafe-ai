"""
API routes for MamaSafe AI.
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import Optional, List
from datetime import datetime

from ..models.clinical import Patient, VitalSigns, ClinicalAssessment, ActionItem, SBARHandoff, ReferralNote
from ..rules.pph_pathway import PPHPathway
from ..audit.logger import log_action
from ..services.gemini_stub import extract_clinical_data_from_text

router = APIRouter(prefix="/api/v1", tags=["clinical"])
_assessments: dict = {}


@router.post("/assess/pph")
async def assess_pph(patient: Patient, vitals: VitalSigns, assessment_data: dict, background_tasks: BackgroundTasks, user_id: str = "demo-clinician"):
    pathway = PPHPathway()
    result = pathway.assess(patient, vitals, assessment_data)
    _assessments[result.assessment_id] = result

    background_tasks.add_task(log_action, user_id=user_id, action_type="assessment_created",
        patient_id=patient.patient_id, assessment_id=result.assessment_id,
        details={"risk_level": result.risk_level.value, "red_flags": result.red_flags, "facility_level": result.facility_level.value})

    return {
        "assessment_id": result.assessment_id,
        "patient": result.patient.model_dump(),
        "vitals": result.vitals.model_dump(),
        "risk_level": result.risk_level.value,
        "red_flags": result.red_flags,
        "missing_critical_info": result.missing_critical_info,
        "actions": [a.model_dump() for a in result.actions],
        "monitoring_recommendations": result.monitoring_recommendations,
        "escalation_threshold": result.escalation_threshold,
        "referral_recommended": result.referral_recommended,
        "guideline_source": result.guideline_source,
        "facility_resources": result.facility_resources.model_dump(),
        "created_at": result.created_at.isoformat()
    }


@router.post("/assess/{assessment_id}/confirm-action")
async def confirm_action(assessment_id: str, action_index: int, confirmed_by: str, background_tasks: BackgroundTasks):
    if assessment_id not in _assessments:
        raise HTTPException(status_code=404, detail="Assessment not found")
    assessment = _assessments[assessment_id]
    if action_index < 0 or action_index >= len(assessment.actions):
        raise HTTPException(status_code=400, detail="Invalid action index")
    action = assessment.actions[action_index]
    action.is_confirmed = True
    action.confirmed_by = confirmed_by
    action.confirmed_at = datetime.utcnow()
    background_tasks.add_task(log_action, user_id=confirmed_by, action_type="action_confirmed",
        assessment_id=assessment_id, details={"action_id": action.action_id, "description": action.description})
    return {"status": "confirmed", "action_id": action.action_id, "confirmed_by": confirmed_by, "confirmed_at": action.confirmed_at.isoformat()}


@router.post("/assess/{assessment_id}/sbar")
async def generate_sbar(assessment_id: str):
    if assessment_id not in _assessments:
        raise HTTPException(status_code=404, detail="Assessment not found")
    pathway = PPHPathway()
    sbar = pathway.generate_sbar(_assessments[assessment_id])
    return sbar.model_dump()


@router.post("/assess/{assessment_id}/referral")
async def generate_referral(assessment_id: str, destination_facility: Optional[str] = None):
    if assessment_id not in _assessments:
        raise HTTPException(status_code=404, detail="Assessment not found")
    pathway = PPHPathway()
    referral = pathway.generate_referral(_assessments[assessment_id], destination_facility)
    return referral.model_dump()


@router.post("/intake/nlp")
async def nlp_intake(text: str, background_tasks: BackgroundTasks):
    extracted = extract_clinical_data_from_text(text)
    background_tasks.add_task(log_action, user_id="nlp-pipeline", action_type="gemini_extraction",
        details={"input_text": text[:200], "extracted_fields": list(extracted.keys())})
    return {"extracted_data": extracted, "requires_verification": True,
        "disclaimer": "AI-extracted data must be verified by a clinician before use",
        "source": "Gemini-extracted (requires human verification)"}


@router.get("/simulation/cases")
async def get_simulation_cases() -> List[dict]:
    from ..simulation.cases import SIMULATION_CASES
    return [case.model_dump() for case in SIMULATION_CASES]


@router.post("/simulation/run/{case_id}")
async def run_simulation(case_id: str, background_tasks: BackgroundTasks):
    from ..simulation.cases import SIMULATION_CASES
    case = next((c for c in SIMULATION_CASES if c.case_id == case_id), None)
    if not case:
        raise HTTPException(status_code=404, detail="Simulation case not found")
    pathway = PPHPathway()
    result = pathway.assess(case.patient, case.vitals, case.assessment_data)
    _assessments[result.assessment_id] = result
    background_tasks.add_task(log_action, user_id="simulation", action_type="simulation_run",
        assessment_id=result.assessment_id, details={"case_id": case_id, "expected_risk": case.expected_risk_level.value})
    return {
        "case_id": case_id, "case_title": case.title, "teaching_points": case.teaching_points,
        "assessment": {"assessment_id": result.assessment_id, "risk_level": result.risk_level.value,
            "red_flags": result.red_flags, "actions": [a.model_dump() for a in result.actions],
            "escalation_threshold": result.escalation_threshold}
    }


@router.get("/health")
async def health_check():
    return {"status": "healthy", "version": "0.1.0-alpha", "timestamp": datetime.utcnow().isoformat(), "mode": "online"}
