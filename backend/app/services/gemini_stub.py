"""
Gemini integration stub.
FALLBACK MODE: Regex-based extraction with clear labeling.
"""
import re


def extract_clinical_data_from_text(text: str) -> dict:
    text_lower = text.lower()
    extracted = {}

    age_match = re.search(r'(\d+)[\s-]*year[\s-]*old|age\s+(\d+)', text_lower)
    if age_match:
        extracted["age"] = int(age_match.group(1) or age_match.group(2))

    weight_match = re.search(r'(\d+)[\s]*kg|weight\s+(\d+)', text_lower)
    if weight_match:
        extracted["weight_kg"] = float(weight_match.group(1) or weight_match.group(2))

    bp_match = re.search(r'bp[\s]+(\d+)[\s]*[/\s]+[\s]*(\d+)', text_lower)
    if bp_match:
        extracted["systolic_bp"] = int(bp_match.group(1))
        extracted["diastolic_bp"] = int(bp_match.group(2))

    hr_match = re.search(r'(?:pulse|hr|heart\s*rate)[\s:]+[\s]*(\d+)', text_lower)
    if hr_match:
        extracted["heart_rate_bpm"] = int(hr_match.group(1))

    spo2_match = re.search(r'spo2[\s:]+[\s]*(\d+)', text_lower)
    if spo2_match:
        extracted["spo2_percent"] = int(spo2_match.group(1))

    ebl_match = re.search(r'(\d+)[\s]*ml[\s]*blood|blood\s*loss[\s]+(\d+)', text_lower)
    if ebl_match:
        extracted["estimated_blood_loss_ml"] = int(ebl_match.group(1) or ebl_match.group(2))

    if "boggy" in text_lower:
        extracted["uterine_tone"] = "boggy"
    elif "firm" in text_lower:
        extracted["uterine_tone"] = "firm"

    if "vaginal" in text_lower:
        extracted["delivery_mode"] = "vaginal"
    elif "cesarean" in text_lower or "c-section" in text_lower:
        extracted["delivery_mode"] = "cesarean"

    time_match = re.search(r'(\d+)[\s]*minutes?', text_lower)
    if time_match:
        extracted["time_since_delivery_minutes"] = int(time_match.group(1))

    extracted["extraction_method"] = "regex_fallback"
    extracted["requires_human_verification"] = True
    return extracted
