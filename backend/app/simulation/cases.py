"""
Synthetic PPH simulation cases.
All cases are fictional and clearly labeled as simulation-only.
"""
from ..models.clinical import Patient, VitalSigns, MentalStatus, RiskLevel, SimulationCase

SIMULATION_CASES = [
    SimulationCase(
        case_id="pph-001",
        title="Severe PPH — Rural Secondary Facility",
        description="SIMULATION CASE — NOT A REAL PATIENT. 29-year-old woman, 20 minutes after vaginal delivery. Continued heavy vaginal bleeding. Patient reports dizziness and weakness. Rural Nigerian secondary care facility with limited resources.",
        patient=Patient(age=29, weight_kg=72, gestational_age_weeks=39, is_pregnant=False, allergies=[], medical_history=[], language_preference="english"),
        vitals=VitalSigns(heart_rate_bpm=124, systolic_bp=88, diastolic_bp=52, respiratory_rate=24, spo2_percent=96, mental_status=MentalStatus.VERBAL, uterine_tone="boggy"),
        assessment_data={
            "estimated_blood_loss_ml": 1100,
            "time_since_delivery_minutes": 20,
            "delivery_mode": "vaginal",
            "placenta_delivered": True,
            "lacerations": False,
            "iv_access": True,
            "available_blood_units": 0,
            "facility_level": "secondary",
            "facility_resources": {
                "has_blood_bank": False, "has_oxygen": True, "has_operating_theatre": False,
                "has_obstetrician": False, "has_anesthesia_provider": False, "has_laboratory": True,
                "has_ultrasound": False, "has_icu": False, "has_ambulance": True, "has_emergency_meds": True
            },
            "symptoms": ["dizziness", "weakness", "ongoing bleeding"],
            "available_medications": ["oxytocin", "tranexamic_acid", "misoprostol"]
        },
        expected_risk_level=RiskLevel.CRITICAL,
        teaching_points=[
            "Shock index > 1.0 (124/88 = 1.41) indicates severe hemorrhagic shock",
            "EBL > 1000 mL with hypotension = CRITICAL risk",
            "No blood bank + no operating theatre = URGENT TRANSFER",
            "TXA must be given within 3 hours of delivery for mortality benefit"
        ]
    ),
    SimulationCase(
        case_id="pph-002",
        title="Moderate PPH — PHC with Resources",
        description="SIMULATION CASE. 24-year-old woman, 45 minutes after vaginal delivery. Moderate ongoing bleeding, estimated 600 mL. Slightly tachycardic but normotensive. Primary health center with basic emergency medications.",
        patient=Patient(age=24, weight_kg=65, gestational_age_weeks=38, is_pregnant=False, allergies=[], medical_history=[], language_preference="english"),
        vitals=VitalSigns(heart_rate_bpm=108, systolic_bp=102, diastolic_bp=68, respiratory_rate=20, spo2_percent=98, mental_status=MentalStatus.ALERT, uterine_tone="boggy"),
        assessment_data={
            "estimated_blood_loss_ml": 600,
            "time_since_delivery_minutes": 45,
            "delivery_mode": "vaginal",
            "placenta_delivered": True,
            "lacerations": False,
            "iv_access": True,
            "facility_level": "phc",
            "facility_resources": {
                "has_blood_bank": False, "has_oxygen": False, "has_operating_theatre": False,
                "has_obstetrician": False, "has_anesthesia_provider": False, "has_laboratory": False,
                "has_ultrasound": False, "has_icu": False, "has_ambulance": False, "has_emergency_meds": True
            },
            "symptoms": ["ongoing bleeding", "mild weakness"],
            "available_medications": ["oxytocin", "misoprostol"]
        },
        expected_risk_level=RiskLevel.HIGH,
        teaching_points=[
            "EBL 500-1000 mL with tachycardia = HIGH risk",
            "No ambulance available — need to arrange transport early",
            "Oxytocin + uterine massage first line"
        ]
    ),
    SimulationCase(
        case_id="pph-003",
        title="Mild PPH — Well-Resourced Facility",
        description="SIMULATION CASE. 32-year-old woman, 30 minutes after vaginal delivery. Estimated blood loss 400 mL. Vitals stable, uterus firm after massage. Tertiary hospital with full resources.",
        patient=Patient(age=32, weight_kg=70, gestational_age_weeks=40, is_pregnant=False, allergies=[], medical_history=["gestational_diabetes"], language_preference="english"),
        vitals=VitalSigns(heart_rate_bpm=92, systolic_bp=118, diastolic_bp=76, respiratory_rate=18, spo2_percent=99, mental_status=MentalStatus.ALERT, uterine_tone="firm"),
        assessment_data={
            "estimated_blood_loss_ml": 400,
            "time_since_delivery_minutes": 30,
            "delivery_mode": "vaginal",
            "placenta_delivered": True,
            "lacerations": False,
            "iv_access": True,
            "facility_level": "tertiary",
            "facility_resources": {
                "has_blood_bank": True, "has_oxygen": True, "has_operating_theatre": True,
                "has_obstetrician": True, "has_anesthesia_provider": True, "has_laboratory": True,
                "has_ultrasound": True, "has_icu": True, "has_ambulance": True, "has_emergency_meds": True
            },
            "symptoms": ["mild bleeding"],
            "available_medications": ["oxytocin", "tranexamic_acid", "misoprostol", "methylergonovine"]
        },
        expected_risk_level=RiskLevel.MODERATE,
        teaching_points=[
            "EBL 300-500 mL with stable vitals = MODERATE risk",
            "Firm uterus after massage suggests response to first-line treatment"
        ]
    ),
    SimulationCase(
        case_id="pph-004",
        title="PPH with Contraindications",
        description="SIMULATION CASE. 28-year-old woman with history of severe preeclampsia. 15 minutes after vaginal delivery. Heavy bleeding, boggy uterus. BP still elevated.",
        patient=Patient(age=28, weight_kg=68, gestational_age_weeks=37, is_pregnant=False, allergies=["penicillin"], medical_history=["severe_preeclampsia", "gestational_hypertension"], language_preference="english"),
        vitals=VitalSigns(heart_rate_bpm=115, systolic_bp=95, diastolic_bp=58, respiratory_rate=22, spo2_percent=97, mental_status=MentalStatus.ALERT, uterine_tone="boggy"),
        assessment_data={
            "estimated_blood_loss_ml": 850,
            "time_since_delivery_minutes": 15,
            "delivery_mode": "vaginal",
            "placenta_delivered": True,
            "lacerations": False,
            "iv_access": True,
            "facility_level": "secondary",
            "facility_resources": {
                "has_blood_bank": True, "has_oxygen": True, "has_operating_theatre": True,
                "has_obstetrician": True, "has_anesthesia_provider": False, "has_laboratory": True,
                "has_ultrasound": False, "has_icu": False, "has_ambulance": True, "has_emergency_meds": True
            },
            "symptoms": ["heavy bleeding", "weakness"],
            "available_medications": ["oxytocin", "tranexamic_acid", "misoprostol", "methylergonovine"]
        },
        expected_risk_level=RiskLevel.HIGH,
        teaching_points=[
            "History of preeclampsia = methylergonovine CONTRAINDICATED",
            "System should flag contraindication automatically"
        ]
    ),
    SimulationCase(
        case_id="pph-005",
        title="Catastrophic PPH — No Resources",
        description="SIMULATION CASE. 35-year-old woman, 10 minutes after vaginal delivery at home. Brought to rural PHC. Massive bleeding, unresponsive. No IV access yet. No blood. No ambulance.",
        patient=Patient(age=35, weight_kg=75, gestational_age_weeks=41, is_pregnant=False, allergies=[], medical_history=[], language_preference="english"),
        vitals=VitalSigns(heart_rate_bpm=145, systolic_bp=72, diastolic_bp=40, respiratory_rate=32, spo2_percent=89, mental_status=MentalStatus.UNRESPONSIVE, uterine_tone="boggy"),
        assessment_data={
            "estimated_blood_loss_ml": 1500,
            "time_since_delivery_minutes": 10,
            "delivery_mode": "vaginal",
            "placenta_delivered": False,
            "lacerations": True,
            "iv_access": False,
            "facility_level": "phc",
            "facility_resources": {
                "has_blood_bank": False, "has_oxygen": False, "has_operating_theatre": False,
                "has_obstetrician": False, "has_anesthesia_provider": False, "has_laboratory": False,
                "has_ultrasound": False, "has_icu": False, "has_ambulance": False, "has_emergency_meds": False
            },
            "symptoms": ["massive bleeding", "unresponsive"],
            "available_medications": []
        },
        expected_risk_level=RiskLevel.CRITICAL,
        teaching_points=[
            "Shock index 2.0 = imminent cardiac arrest",
            "No IV access = first priority before any medication",
            "No ambulance = must arrange ANY transport immediately"
        ]
    ),
]
