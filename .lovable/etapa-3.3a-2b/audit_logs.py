import requests
import uuid
import json

API_URL = "http://localhost:8080/api/public/av-create-order"
EVENT_ID = "ba5036d2-eb2d-4a1a-96f6-8c586eeede10"
MODEL_ID = "68b9babb-d4e3-40d3-bb1a-f76dc1a512b7"

def run_log_audit():
    headers = {
        "Content-Type": "application/json",
        "Origin": "http://localhost:8080"
    }
    
    # Fazemos uma request com dados "sensíveis"
    payload = {
        "event_id": EVENT_ID,
        "customer_name": "LOG_AUDIT_TEST",
        "whatsapp": "67999999999",
        "idempotency_key": "secret-ik-" + str(uuid.uuid4()),
        "turnstile_token": "secret-token-12345",
        "items": [{"shirt_model_id": MODEL_ID, "size_option": "M", "quantity": 1}]
    }
    
    requests.post(API_URL, json=payload, headers=headers)
    print("Request enviada para auditoria de logs.")

if __name__ == "__main__":
    run_log_audit()
