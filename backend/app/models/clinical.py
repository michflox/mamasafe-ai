"""
Clinical data models for MamaSafe AI.
Strict validation for patient safety.
"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Literal
from datetime import datetime
from enum import Enum


class RiskLevel(str, Enum):
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    CRITICAL = "critical"


class MentalStatus(str, Enum):
    ALERT = "alert"
    VERBAL = "responds_to_verbal"
    PAIN = "responds_to_pain"
    UNRESPONSIVE = "unresponsive"


class FacilityLevel(str, Enum):
    PHC = "phc"
    SECONDARY = "secondary"
    TERTIARY = "tertiary"


class Patient(BaseModel):
    patient_id: str = Field(default_factory=lambda: f"pt_{int(datetime.now().timestamp())}")
    age: Optional[int] = Field(None, ge=10, le=80)
    is_pregnant: bool = False
    gestational_age_weeks: Optional[int] = Field(None, ge=4, le=44)
    weight_kg: Optional[float] = Field(None, ge=30, le=200)
    height_cm: Optional[float] = None
    bmi: Optional[float] = None
    allergies: List[str] = []
    medications_current: List[str] = []
    medical_history: List[str] = []
    language_preference: str = "english"

    @field_validator("bmi", mode="before")
    @classmethod
    def calculate_bmi(cls, v, info):
        if v is not None:
            return v
        data = info.data
        if data.get("weight_kg") and data.get("height_cm"):
            return round(data["weight_kg"] / ((data["height_cm"] / 100) ** 2), 1)
        return None


class VitalSigns(BaseModel):
    recorded_at: datetime = Field(default_factory=datetime.utcnow)
    heart_rate_bpm: Optional[int] = Field(None, ge=30, le=220)
    systolic_bp: Optional[int] = Field(None, ge=50, le=300)
    diastolic_bp: Optional[int] = Field(None, ge=20, le=200)
    respiratory_rate: Optional[int] = Field(None, ge=4, le=60)
    spo2_percent: Optional[float] = Field(None, ge=40, le=100)
    temperature_celsius: Optional[float] = Field(None, ge=30, le=45)
    mental_status: Optional[MentalStatus] = None
    pain_score: Optional[int] = Field(None, ge=0, le=10)
    uterine_tone: Optional[Literal["firm", "boggy", "contracting"]] = None
    vaginal_bleeding_ml_estimated: Optional[float] = Field(None, ge=0, le=10000)
    fetal_heart_rate_bpm: Optional[int] = Field(None, ge=60, le=200)
    urine_output_ml_hr: Optional[float] = None


class FacilityResources(BaseModel):
    has_blood_bank: bool = False
    has_oxygen: bool = False
    has_operating_theatre: bool = False
    has_obstetrician: bool = False
    has_anesthesia_provider: bool = False
    has_laboratory: bool = False
    has_ultrasound: bool = False
    has_icu: bool = False
    has_ambulance: bool = False
    has_emergency_meds: bool = False


class ActionItem(BaseModel):
    action_id: str = Field(default_factory=lambda: f"act_{int(datetime.now().timestamp())}")
    priority: int = Field(..., ge=1, le=20)
    category: Literal["immediate", "urgent", "monitoring", "preparation", "documentation", "escalation", "calculation"] = "urgent"
    description: str
    detailed_steps: Optional[List[str]] = None
    medication_calculation: Optional[dict] = None
    requires_confirmation: bool = True
    is_confirmed: bool = False
    confirmed_by: Optional[str] = None
    confirmed_at: Optional[datetime] = None
    contraindications: List[str] = []
    source_guideline: Optional[str] = None
    rationale: Optional[str] = None


class ClinicalAssessment(BaseModel):
    assessment_id: str = Field(default_factory=lambda: f"asmt_{int(datetime.now().timestamp())}")
    patient: Patient
    vitals: VitalSigns
    symptoms: List[str] = []
    estimated_blood_loss_ml: Optional[float] = None
    time_since_delivery_minutes: Optional[int] = None
    delivery_mode: Optional[Literal["vaginal", "cesarean", "assisted"]] = None
    placenta_delivered: Optional[bool] = None
    lacerations: Optional[bool] = None
    iv_access: bool = False
    available_blood_units: Optional[int] = None
    facility_level: FacilityLevel = FacilityLevel.PHC
    facility_resources: FacilityResources = Field(default_factory=FacilityResources)
    available_medications: List[str] = []
    risk_level: RiskLevel = RiskLevel.LOW
    red_flags: List[str] = []
    missing_critical_info: List[str] = []
    actions: List[ActionItem] = []
    monitoring_recommendations: List[str] = []
    escalation_threshold: Optional[str] = None
    referral_recommended: bool = False
    guideline_source: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class SBARHandoff(BaseModel):
    situation: str
    background: str
    assessment: str
    recommendation: str
    generated_at: datetime = Field(default_factory=datetime.utcnow)


class ReferralNote(BaseModel):
    patient_summary: str
    clinical_findings: str
    actions_taken: List[str]
    actions_pending: List[str] = []
    reason_for_referral: str
    urgency: RiskLevel
    facility_from: str
    facility_to: Optional[str] = None
    transport_recommendation: Optional[str] = None
    accompanying_medications: List[str] = []
    iv_access: bool = False
    blood_available: Optional[str] = None
    allergies: List[str] = []
    generated_at: datetime = Field(default_factory=datetime.utcnow)


class SimulationCase(BaseModel):
    case_id: str
    title: str
    description: str
    patient: Patient
    vitals: VitalSigns
    assessment_data: dict
    expected_risk_level: RiskLevel
    teaching_points: List[str]
