"""
Deterministic clinical rule engine.
NEVER uses LLM for clinical decisions.
"""
from typing import List, Optional, Any
from pydantic import BaseModel
from enum import Enum


class ValidationStatus(str, Enum):
    PASS = "pass"
    WARNING = "warning"
    REJECT = "reject"


class ValidationResult(BaseModel):
    status: ValidationStatus
    message: str
    field: Optional[str] = None
    suggested_value: Optional[Any] = None


class RuleEngine:
    """
    Executes deterministic clinical rules.
    All medication and dosing decisions flow through here.
    """

    MEDICATION_LIMITS = {
        "oxytocin_bolus_max_iu": 10.0,
        "oxytocin_infusion_max_iu_per_hour": 60.0,
        "oxytocin_infusion_max_total_iu": 120.0,
        "misoprostol_sublingual_max_single_dose_mcg": 800.0,
        "misoprostol_rectal_max_single_dose_mcg": 1000.0,
        "methylergonovine_max_dose_mg": 0.2,
        "carboprost_max_dose_mg": 0.25,
        "tranexamic_acid_max_dose_g": 1.0,
    }

    def validate_medication(self, drug: str, dose: float, route: str, patient_weight_kg: Optional[float] = None) -> ValidationResult:
        drug_lower = drug.lower().strip()

        if "oxytocin" in drug_lower:
            if route in ["iv", "intravenous"]:
                if dose > self.MEDICATION_LIMITS["oxytocin_bolus_max_iu"]:
                    return ValidationResult(
                        status=ValidationStatus.REJECT,
                        message=f"Oxytocin bolus {dose} IU exceeds MAXIMUM {self.MEDICATION_LIMITS['oxytocin_bolus_max_iu']} IU",
                        field="oxytocin_dose",
                        suggested_value=self.MEDICATION_LIMITS["oxytocin_bolus_max_iu"]
                    )

        elif "tranexamic" in drug_lower or "txa" in drug_lower:
            if dose > self.MEDICATION_LIMITS["tranexamic_acid_max_dose_g"]:
                return ValidationResult(
                    status=ValidationStatus.REJECT,
                    message=f"TXA dose {dose}g exceeds MAXIMUM {self.MEDICATION_LIMITS['tranexamic_acid_max_dose_g']}g",
                    field="txa_dose",
                    suggested_value=1.0
                )
            if patient_weight_kg:
                dose_per_kg = dose * 1000 / patient_weight_kg
                if dose_per_kg > 15:
                    return ValidationResult(
                        status=ValidationStatus.REJECT,
                        message=f"TXA dose exceeds 15 mg/kg for this patient ({round(dose_per_kg, 1)} mg/kg calculated)",
                        field="txa_dose"
                    )

        elif "misoprostol" in drug_lower:
            max_dose = self.MEDICATION_LIMITS["misoprostol_sublingual_max_single_dose_mcg"] if "sublingual" in route else self.MEDICATION_LIMITS["misoprostol_rectal_max_single_dose_mcg"]
            if dose > max_dose:
                return ValidationResult(
                    status=ValidationStatus.REJECT,
                    message=f"Misoprostol dose {dose} mcg exceeds maximum single dose ({max_dose} mcg)",
                    field="misoprostol_dose"
                )

        elif "methylergonovine" in drug_lower or "methergine" in drug_lower:
            if dose > self.MEDICATION_LIMITS["methylergonovine_max_dose_mg"]:
                return ValidationResult(
                    status=ValidationStatus.REJECT,
                    message=f"Methylergonovine dose {dose} mg exceeds maximum {self.MEDICATION_LIMITS['methylergonovine_max_dose_mg']} mg",
                    field="methylergonovine_dose"
                )

        elif "carboprost" in drug_lower:
            if dose > self.MEDICATION_LIMITS["carboprost_max_dose_mg"]:
                return ValidationResult(
                    status=ValidationStatus.REJECT,
                    message=f"Carboprost dose {dose} mg exceeds maximum {self.MEDICATION_LIMITS['carboprost_max_dose_mg']} mg",
                    field="carboprost_dose"
                )

        return ValidationResult(status=ValidationStatus.PASS, message="Medication within safe limits")

    def calculate_weight_based_dose(self, drug: str, mg_per_kg: float, patient_weight_kg: float, max_absolute_mg: Optional[float] = None) -> dict:
        calculated_dose = mg_per_kg * patient_weight_kg
        final_dose = min(calculated_dose, max_absolute_mg) if max_absolute_mg else calculated_dose
        return {
            "drug": drug,
            "mg_per_kg": mg_per_kg,
            "patient_weight_kg": patient_weight_kg,
            "calculated_dose_mg": round(calculated_dose, 2),
            "final_dose_mg": round(final_dose, 2),
            "max_applied": max_absolute_mg is not None and calculated_dose > max_absolute_mg,
            "formula": f"{mg_per_kg} mg/kg x {patient_weight_kg} kg = {round(calculated_dose, 2)} mg"
        }

    def check_contraindications(self, drug: str, patient_history: List[str], allergies: List[str]) -> List[str]:
        warnings = []
        drug_lower = drug.lower()
        history_lower = [h.lower() for h in patient_history]
        allergies_lower = [a.lower() for a in allergies]

        for a in allergies_lower:
            if drug_lower in a or any(part in drug_lower for part in a.split()):
                warnings.append(f"ALLERGY ALERT: Patient may have allergy to {drug}")

        if "oxytocin" in drug_lower:
            if any("hypersensitivity" in h and "oxytocin" in h for h in history_lower):
                warnings.append("Contraindicated: Known hypersensitivity to oxytocin")

        elif "misoprostol" in drug_lower:
            if any(x in h for h in history_lower for x in ["previous uterine surgery", "classical cesarean", "uterine rupture"]):
                warnings.append("CAUTION: Uterine scar — increased rupture risk with misoprostol")

        elif "methylergonovine" in drug_lower or "methergine" in drug_lower:
            if any(x in h for h in history_lower for x in ["hypertension", "preeclampsia", "severe hypertension"]):
                warnings.append("CONTRAINDICATED: Hypertension/preeclampsia — methylergonovine can cause severe BP elevation")
            if any(x in h for h in history_lower for x in ["cardiac disease", "angina", "mi"]):
                warnings.append("CONTRAINDICATED: Cardiac disease")

        elif "carboprost" in drug_lower:
            if any("asthma" in h for h in history_lower):
                warnings.append("CONTRAINDICATED: Asthma — carboprost can cause bronchospasm")
            if any(x in h for h in history_lower for x in ["pulmonary hypertension", "cardiac disease"]):
                warnings.append("CONTRAINDICATED: Pulmonary or cardiac disease")

        elif "tranexamic" in drug_lower:
            if any(x in h for h in history_lower for x in ["thromboembolic disease", "dvt", "pe", "stroke", "intravascular clotting"]):
                warnings.append("CAUTION: History of thromboembolism — weigh risks/benefits carefully")

        return warnings

    def evaluate_vitals(self, vitals: dict) -> List[ValidationResult]:
        results = []
        hr = vitals.get("heart_rate_bpm")
        sbp = vitals.get("systolic_bp")
        dbp = vitals.get("diastolic_bp")
        spo2 = vitals.get("spo2_percent")
        rr = vitals.get("respiratory_rate")
        temp = vitals.get("temperature_celsius")

        if hr and sbp:
            shock_index = hr / sbp if sbp > 0 else 0
            if shock_index > 1.0:
                results.append(ValidationResult(
                    status=ValidationStatus.REJECT,
                    message=f"CRITICAL: Shock index {round(shock_index, 2)} indicates severe hemorrhagic shock",
                    field="shock_index"
                ))
            elif shock_index > 0.9:
                results.append(ValidationResult(
                    status=ValidationStatus.WARNING,
                    message=f"WARNING: Shock index {round(shock_index, 2)} elevated",
                    field="shock_index"
                ))

        if hr and hr > 120:
            results.append(ValidationResult(
                status=ValidationStatus.WARNING,
                message=f"Tachycardia: HR {hr} bpm",
                field="heart_rate"
            ))
        if hr and hr > 140:
            results.append(ValidationResult(
                status=ValidationStatus.REJECT,
                message=f"CRITICAL TACHYCARDIA: HR {hr} bpm — severe shock likely",
                field="heart_rate"
            ))

        if sbp and sbp < 90:
            results.append(ValidationResult(
                status=ValidationStatus.REJECT,
                message=f"HYPOTENSION: SBP {sbp} mmHg — hemorrhagic shock",
                field="systolic_bp"
            ))
        elif sbp and sbp < 100:
            results.append(ValidationResult(
                status=ValidationStatus.WARNING,
                message=f"Low SBP: {sbp} mmHg",
                field="systolic_bp"
            ))

        if dbp and dbp < 60:
            results.append(ValidationResult(
                status=ValidationStatus.WARNING,
                message=f"Low DBP: {dbp} mmHg",
                field="diastolic_bp"
            ))

        if spo2 and spo2 < 92:
            results.append(ValidationResult(
                status=ValidationStatus.REJECT,
                message=f"CRITICAL HYPOXEMIA: SpO2 {spo2}%",
                field="spo2"
            ))
        elif spo2 and spo2 < 94:
            results.append(ValidationResult(
                status=ValidationStatus.WARNING,
                message=f"Hypoxemia: SpO2 {spo2}%",
                field="spo2"
            ))

        if rr and rr > 30:
            results.append(ValidationResult(
                status=ValidationStatus.WARNING,
                message=f"Tachypnea: RR {rr}/min",
                field="respiratory_rate"
            ))

        if temp and temp > 38.5:
            results.append(ValidationResult(
                status=ValidationStatus.WARNING,
                message=f"Fever: {temp}°C — consider sepsis",
                field="temperature"
            ))

        return results

    def calculate_shock_index(self, hr: int, sbp: int) -> float:
        return round(hr / sbp, 2) if sbp > 0 else 0.0

    def calculate_estimated_circulating_volume(self, weight_kg: float) -> float:
        return weight_kg * 70

    def calculate_blood_loss_percentage(self, ebl_ml: float, weight_kg: float) -> float:
        total_volume = self.calculate_estimated_circulating_volume(weight_kg)
        if total_volume > 0:
            return round((ebl_ml / total_volume) * 100, 1)
        return 0.0

    def calculate_fluid_resuscitation(self, ebl_ml: float, weight_kg: float) -> dict:
        crystalloid_needed = ebl_ml * 3
        return {
            "estimated_blood_loss_ml": ebl_ml,
            "crystalloid_3x_rule_ml": crystalloid_needed,
            "initial_bolus_ml": min(crystalloid_needed, 2000),
            "formula": "Crystalloid = EBL x 3 (3:1 replacement rule)",
            "rationale": "Replace blood loss with 3x crystalloid volume"
        }
