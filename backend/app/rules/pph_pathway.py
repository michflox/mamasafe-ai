"""
Postpartum Hemorrhage Clinical Pathway.
Deterministic implementation based on WHO/FIGO guidelines.
"""
from typing import List, Optional
from datetime import datetime

from ..models.clinical import (
    Patient, VitalSigns, ClinicalAssessment, RiskLevel,
    ActionItem, SBARHandoff, ReferralNote, FacilityResources
)
from .engine import RuleEngine, ValidationStatus


class PPHPathway:
    """
    WHO/FIGO-based PPH management pathway.
    Source: WHO Recommendations on Prevention and Treatment of Postpartum Haemorrhage (2022)
    """

    GUIDELINE_SOURCE = "WHO/FIGO PPH Guidelines 2022"

    def __init__(self):
        self.rule_engine = RuleEngine()

    def assess(self, patient: Patient, vitals: VitalSigns, assessment_data: dict) -> ClinicalAssessment:
        facility_resources = FacilityResources(**assessment_data.get("facility_resources", {}))

        assessment = ClinicalAssessment(
            patient=patient,
            vitals=vitals,
            symptoms=assessment_data.get("symptoms", []),
            estimated_blood_loss_ml=assessment_data.get("estimated_blood_loss_ml"),
            time_since_delivery_minutes=assessment_data.get("time_since_delivery_minutes"),
            delivery_mode=assessment_data.get("delivery_mode"),
            placenta_delivered=assessment_data.get("placenta_delivered"),
            lacerations=assessment_data.get("lacerations"),
            iv_access=assessment_data.get("iv_access", False),
            available_blood_units=assessment_data.get("available_blood_units"),
            facility_level=assessment_data.get("facility_level", "phc"),
            facility_resources=facility_resources,
            available_medications=assessment_data.get("available_medications", []),
        )

        assessment.risk_level = self._determine_risk_level(assessment)
        assessment.red_flags = self._identify_red_flags(assessment)
        assessment.missing_critical_info = self._identify_missing_info(assessment)
        assessment.actions = self._generate_actions(assessment)
        assessment.monitoring_recommendations = self._generate_monitoring(assessment)
        assessment.escalation_threshold = self._determine_escalation(assessment)
        assessment.referral_recommended = assessment.risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]
        assessment.guideline_source = self.GUIDELINE_SOURCE

        return assessment

    def _determine_risk_level(self, assessment: ClinicalAssessment) -> RiskLevel:
        ebl = assessment.estimated_blood_loss_ml or 0
        vitals = assessment.vitals

        if ebl >= 1000:
            return RiskLevel.CRITICAL
        if vitals.systolic_bp and vitals.systolic_bp < 90:
            return RiskLevel.CRITICAL
        if vitals.heart_rate_bpm and vitals.heart_rate_bpm > 120:
            if vitals.systolic_bp and vitals.systolic_bp < 100:
                return RiskLevel.CRITICAL
        if vitals.mental_status and vitals.mental_status.value in ["responds_to_pain", "unresponsive"]:
            return RiskLevel.CRITICAL

        if ebl >= 500:
            return RiskLevel.HIGH
        if vitals.heart_rate_bpm and vitals.heart_rate_bpm > 110:
            return RiskLevel.HIGH
        if vitals.systolic_bp and vitals.systolic_bp < 100:
            return RiskLevel.HIGH

        if ebl >= 300:
            return RiskLevel.MODERATE
        if vitals.heart_rate_bpm and vitals.heart_rate_bpm > 100:
            return RiskLevel.MODERATE

        return RiskLevel.LOW

    def _identify_red_flags(self, assessment: ClinicalAssessment) -> List[str]:
        flags = []
        v = assessment.vitals
        ebl = assessment.estimated_blood_loss_ml or 0

        if ebl >= 1000:
            flags.append("SEVERE PPH: Estimated blood loss >= 1000 mL")
        elif ebl >= 500:
            flags.append("PPH: Estimated blood loss >= 500 mL")

        if v.systolic_bp and v.systolic_bp < 90:
            flags.append("Severe hypotension suggesting hemorrhagic shock")
        if v.heart_rate_bpm and v.heart_rate_bpm > 120:
            flags.append("Significant tachycardia")
        if v.spo2_percent and v.spo2_percent < 92:
            flags.append("Hypoxemia")
        if v.mental_status and v.mental_status.value in ["responds_to_pain", "unresponsive"]:
            flags.append("Altered mental status — severe shock")
        if not assessment.placenta_delivered:
            flags.append("Retained placenta")
        if v.uterine_tone == "boggy":
            flags.append("Atonic uterus (boggy)")
        if assessment.lacerations:
            flags.append("Lacerations identified")

        if v.heart_rate_bpm and v.systolic_bp:
            si = self.rule_engine.calculate_shock_index(v.heart_rate_bpm, v.systolic_bp)
            if si > 1.0:
                flags.append(f"Shock index {si} — severe hemorrhagic shock")
            elif si > 0.9:
                flags.append(f"Shock index {si} — elevated")

        return flags

    def _identify_missing_info(self, assessment: ClinicalAssessment) -> List[str]:
        missing = []
        if assessment.patient.weight_kg is None:
            missing.append("Patient weight (needed for medication calculations)")
        if assessment.vitals.heart_rate_bpm is None:
            missing.append("Heart rate")
        if assessment.vitals.systolic_bp is None:
            missing.append("Blood pressure")
        if assessment.estimated_blood_loss_ml is None:
            missing.append("Estimated blood loss")
        if assessment.placenta_delivered is None:
            missing.append("Placenta delivery status")
        if not assessment.iv_access:
            missing.append("IV access confirmation")
        if not assessment.patient.allergies:
            missing.append("Allergy history")
        if assessment.time_since_delivery_minutes is None:
            missing.append("Time since delivery")
        return missing

    def _generate_actions(self, assessment: ClinicalAssessment) -> List[ActionItem]:
        actions = []
        ebl = assessment.estimated_blood_loss_ml or 0
        risk = assessment.risk_level
        weight = assessment.patient.weight_kg
        resources = assessment.facility_resources

        if ebl >= 500 or risk in [RiskLevel.HIGH, RiskLevel.CRITICAL]:
            actions.append(ActionItem(
                priority=1,
                category="immediate",
                description="Call for help — activate emergency response team",
                detailed_steps=[
                    "Call for additional staff immediately",
                    "Notify senior midwife/nurse in charge",
                    "Alert available physician if present",
                    "Prepare for possible transfer"
                ],
                requires_confirmation=True,
                source_guideline=self.GUIDELINE_SOURCE,
                rationale="PPH is an obstetric emergency requiring immediate team response (WHO 2022)"
            ))

            iv_steps = ["Ensure large-bore IV access (14G or 16G) x 2"]
            if not resources.has_blood_bank:
                iv_steps.append("WARNING: No blood bank — aggressive crystalloid resuscitation essential")
            actions.append(ActionItem(
                priority=2,
                category="immediate",
                description="Establish/maintain large-bore IV access",
                detailed_steps=iv_steps,
                requires_confirmation=True,
                source_guideline=self.GUIDELINE_SOURCE
            ))

            actions.append(ActionItem(
                priority=3,
                category="immediate",
                description="Bimanual uterine massage and empty bladder",
                detailed_steps=[
                    "Perform bimanual uterine massage",
                    "Catheterize bladder if full",
                    "Reassess uterine tone"
                ],
                requires_confirmation=True,
                source_guideline=self.GUIDELINE_SOURCE,
                rationale="First-line non-pharmacological management of atonic PPH"
            ))

            oxytocin_calc = None
            if weight:
                oxytocin_calc = self.rule_engine.calculate_weight_based_dose("oxytocin", 10, weight, max_absolute_mg=10)

            oxy_steps = [
                "Oxytocin 10 IU IM (preferred route) OR",
                "Oxytocin 10 IU slow IV (over 1-2 minutes)",
                "Continue oxytocin infusion: 20-40 IU in 1L crystalloid at 150 mL/hr"
            ]
            if not resources.has_emergency_meds:
                oxy_steps.append("WARNING: Verify oxytocin availability — if unavailable, proceed to misoprostol")

            actions.append(ActionItem(
                priority=4,
                category="immediate",
                description="Administer Oxytocin 10 IU (first-line uterotonic)",
                medication_calculation=oxytocin_calc,
                detailed_steps=oxy_steps,
                contraindications=self.rule_engine.check_contraindications("oxytocin", assessment.patient.medical_history, assessment.patient.allergies),
                requires_confirmation=True,
                source_guideline=self.GUIDELINE_SOURCE,
                rationale="First-line uterotonic for PPH per WHO 2022 recommendations"
            ))

            txa_calc = None
            if weight:
                txa_dose_g = min(1.0, weight * 15 / 1000)
                txa_calc = {
                    "drug": "tranexamic acid",
                    "dose_g": round(txa_dose_g, 2),
                    "route": "IV",
                    "timing": "Within 3 hours of delivery",
                    "formula": f"15 mg/kg x {weight} kg = {round(weight * 15, 1)} mg (max 1g)",
                    "max_applied": weight * 15 > 1000
                }

            txa_steps = [
                "Tranexamic acid 1g in 10 mL IV slowly over 10 minutes",
                "If first dose within 3 hours of delivery: administer now",
                "If bleeding continues after 30 min: second dose 1g IV"
            ]
            if not resources.has_emergency_meds:
                txa_steps.append("WARNING: Verify TXA availability")

            actions.append(ActionItem(
                priority=5,
                category="immediate",
                description="Tranexamic acid 1g IV (if within 3 hours of delivery)",
                medication_calculation=txa_calc,
                detailed_steps=txa_steps,
                contraindications=self.rule_engine.check_contraindications("tranexamic acid", assessment.patient.medical_history, assessment.patient.allergies),
                requires_confirmation=True,
                source_guideline=self.GUIDELINE_SOURCE,
                rationale="TXA reduces mortality in PPH when given within 3 hours (WOMAN trial)"
            ))

            fluid_calc = None
            if weight:
                fluid_calc = self.rule_engine.calculate_fluid_resuscitation(ebl, weight)

            fluid_steps = [
                f"Warm crystalloid: up to {fluid_calc['initial_bolus_ml'] if fluid_calc else '2000'} mL rapidly",
                "Assess response after each 500 mL",
                "If no response after 2L: prepare blood products / urgent transfer",
                "Maintain urine output >30 mL/hr"
            ]
            if not resources.has_blood_bank:
                fluid_steps.append("CRITICAL: No blood bank available — maximize crystalloid + URGENT TRANSFER")

            actions.append(ActionItem(
                priority=6,
                category="calculation",
                description="Aggressive crystalloid resuscitation",
                medication_calculation=fluid_calc,
                detailed_steps=fluid_steps,
                requires_confirmation=True,
                source_guideline=self.GUIDELINE_SOURCE
            ))

            if weight:
                pct = self.rule_engine.calculate_blood_loss_percentage(ebl, weight)
                actions.append(ActionItem(
                    priority=7,
                    category="calculation",
                    description=f"Estimated blood loss: {ebl} mL ({pct}% of circulating volume)",
                    medication_calculation={
                        "estimated_circulating_volume_ml": self.rule_engine.calculate_estimated_circulating_volume(weight),
                        "blood_loss_ml": ebl,
                        "percentage_lost": pct,
                        "formula": f"EBL / (weight x 70) = {ebl} / ({weight} x 70) = {pct}%"
                    },
                    requires_confirmation=False,
                    source_guideline=self.GUIDELINE_SOURCE
                ))

        if risk == RiskLevel.CRITICAL:
            second_line_steps = ["If bleeding persists after oxytocin:"]
            if not resources.has_obstetrician:
                second_line_steps.append("WARNING: No obstetrician — second-line meds + URGENT TRANSFER for surgical management")
            second_line_steps.extend([
                "  Misoprostol 800 mcg sublingual OR",
                "  Methylergonovine 0.2 mg IM (AVOID if hypertensive) OR",
                "  Carboprost 0.25 mg IM (AVOID if asthmatic)"
            ])

            actions.append(ActionItem(
                priority=8,
                category="urgent",
                description="Second-line uterotonic if bleeding persists",
                detailed_steps=second_line_steps,
                contraindications=[
                    "CHECK BP before methylergonovine — contraindicated if hypertensive/preeclamptic",
                    "CHECK asthma history before carboprost — contraindicated in asthma"
                ],
                requires_confirmation=True,
                source_guideline=self.GUIDELINE_SOURCE
            ))

            escalation_steps = [
                "Notify surgeon/OB-GYN if available",
                "Cross-match blood if laboratory available",
                "Prepare for balloon tamponade if trained and supplies available",
            ]
            if not resources.has_operating_theatre:
                escalation_steps.append("CRITICAL: No operating theatre — URGENT TRANSFER to facility with surgical capability")
            if not resources.has_anesthesia_provider:
                escalation_steps.append("WARNING: No anesthesia provider — surgical intervention not possible at this facility")
            if not resources.has_ambulance:
                escalation_steps.append("CRITICAL: No ambulance — arrange emergency transport immediately")
            if not resources.has_blood_bank:
                escalation_steps.append("CRITICAL: No blood bank — patient needs transfer to facility with transfusion capability")

            actions.append(ActionItem(
                priority=9,
                category="escalation",
                description="URGENT: Prepare for surgical intervention / transfer",
                detailed_steps=escalation_steps,
                requires_confirmation=True,
                source_guideline=self.GUIDELINE_SOURCE
            ))

        actions.append(ActionItem(
            priority=10,
            category="documentation",
            description="Document all actions, times, and clinician names",
            detailed_steps=[
                "Record estimated blood loss with method",
                "Document all medications given with doses and times",
                "Record vital signs trend",
                "Document time of escalation/referral decision"
            ],
            requires_confirmation=True,
            source_guideline=self.GUIDELINE_SOURCE
        ))

        return sorted(actions, key=lambda x: x.priority)

    def _generate_monitoring(self, assessment: ClinicalAssessment) -> List[str]:
        recs = []
        risk = assessment.risk_level
        recs.append("Monitor vital signs every 15 minutes")
        recs.append("Quantify blood loss continuously")
        if risk in [RiskLevel.HIGH, RiskLevel.CRITICAL]:
            recs.append("Continuous pulse oximetry if available")
            recs.append("Strict input/output charting")
            recs.append("Monitor uterine tone and fundal height")
            recs.append("CBC and coagulation profile when stable and lab available")
        if risk == RiskLevel.CRITICAL:
            recs.append("Foley catheter for urine output monitoring")
            recs.append("Blood gas analysis if available")
            if not assessment.facility_resources.has_icu:
                recs.append("WARNING: No ICU — patient needs transfer for critical care monitoring")
        return recs

    def _determine_escalation(self, assessment: ClinicalAssessment) -> str:
        resources = assessment.facility_resources
        if assessment.risk_level == RiskLevel.CRITICAL:
            msg = "IMMEDIATE ESCALATION REQUIRED. "
            if resources.has_obstetrician and resources.has_operating_theatre and resources.has_anesthesia_provider:
                msg += "Senior obstetrician and anesthesia provider notified. Prepare for emergency surgery."
            else:
                missing = []
                if not resources.has_obstetrician: missing.append("obstetrician")
                if not resources.has_operating_theatre: missing.append("operating theatre")
                if not resources.has_anesthesia_provider: missing.append("anesthesia provider")
                if not resources.has_blood_bank: missing.append("blood bank")
                msg += f"URGENT TRANSFER to facility with: {', '.join(missing)}. "
                if not resources.has_ambulance:
                    msg += "CRITICAL: No ambulance available — arrange emergency transport NOW."
                else:
                    msg += "Arrange ambulance transport with IV fluids and monitoring."
            return msg
        elif assessment.risk_level == RiskLevel.HIGH:
            msg = "URGENT: Notify senior clinician immediately. "
            if not resources.has_obstetrician:
                msg += "No obstetrician available — prepare for possible transfer. "
            msg += "If no improvement within 30 minutes, escalate to CRITICAL and transfer."
            return msg
        elif assessment.risk_level == RiskLevel.MODERATE:
            return "Monitor closely. Escalate to senior clinician if no improvement within 30 minutes or if bleeding increases."
        return "Continue routine postpartum monitoring per standard protocol."

    def generate_sbar(self, assessment: ClinicalAssessment) -> SBARHandoff:
        p = assessment.patient
        v = assessment.vitals
        ebl = assessment.estimated_blood_loss_ml or "unknown"
        situation = f"Postpartum hemorrhage — {assessment.risk_level.value.upper()} RISK. EBL {ebl} mL. BP {v.systolic_bp or '?'}/{v.diastolic_bp or '?'} mmHg, HR {v.heart_rate_bpm or '?'} bpm. Requires immediate attention."
        background = f"{p.age or '?'} year-old postpartum woman. GA {p.gestational_age_weeks or '?'} weeks. Weight: {p.weight_kg or '?'} kg. Placenta delivered: {'Yes' if assessment.placenta_delivered else 'No/Unknown'}. Uterine tone: {v.uterine_tone or 'unknown'}. Allergies: {', '.join(p.allergies) if p.allergies else 'None known'}."
        assessment_str = f"Risk level: {assessment.risk_level.value}. "
        if assessment.red_flags:
            assessment_str += f"Red flags: {'; '.join(assessment.red_flags[:3])}. "
        if v.heart_rate_bpm and v.systolic_bp:
            si = self.rule_engine.calculate_shock_index(v.heart_rate_bpm, v.systolic_bp)
            assessment_str += f"Shock index: {si}. "
        recommendation = assessment.escalation_threshold or ""
        confirmed = [a.description for a in assessment.actions if a.is_confirmed]
        if confirmed:
            recommendation += f" Actions completed: {'; '.join(confirmed[:3])}."
        pending = [a.description for a in assessment.actions if not a.is_confirmed and a.priority <= 6]
        if pending:
            recommendation += f" Pending: {'; '.join(pending[:3])}."
        return SBARHandoff(situation=situation, background=background, assessment=assessment_str, recommendation=recommendation)

    def generate_referral(self, assessment: ClinicalAssessment, destination_facility: Optional[str] = None) -> ReferralNote:
        p = assessment.patient
        v = assessment.vitals
        ebl = assessment.estimated_blood_loss_ml or "unknown"
        return ReferralNote(
            patient_summary=f"{p.age or '?'}yo postpartum woman, GA {p.gestational_age_weeks or '?'}wks, weight {p.weight_kg or '?'}kg",
            clinical_findings=f"PPH with EBL {ebl}mL. BP {v.systolic_bp or '?'}/{v.diastolic_bp or '?'} mmHg, HR {v.heart_rate_bpm or '?'} bpm. Risk: {assessment.risk_level.value.upper()}.",
            actions_taken=[a.description for a in assessment.actions if a.is_confirmed],
            actions_pending=[a.description for a in assessment.actions if not a.is_confirmed],
            reason_for_referral=f"Postpartum hemorrhage — {assessment.risk_level.value} risk. Requires higher-level care.",
            urgency=assessment.risk_level,
            facility_from=assessment.facility_level.value,
            facility_to=destination_facility,
            transport_recommendation="Ambulance with IV access, oxygen, and continuous monitoring" if assessment.risk_level == RiskLevel.CRITICAL else "Accompanied transport with monitoring",
            iv_access=assessment.iv_access,
            blood_available=f"{assessment.available_blood_units} units" if assessment.available_blood_units else "No blood available",
            allergies=p.allergies
        )
