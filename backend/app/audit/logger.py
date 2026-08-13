"""
Audit logging for clinical safety and compliance.
"""
import json
from datetime import datetime
from typing import Optional


def log_action(user_id: str, action_type: str, patient_id: Optional[str] = None, assessment_id: Optional[str] = None, details: dict = None):
    log_entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "user_id": user_id,
        "action_type": action_type,
        "patient_id": patient_id,
        "assessment_id": assessment_id,
        "details": details or {},
    }
    print(f"[AUDIT] {json.dumps(log_entry)}")
    return log_entry
