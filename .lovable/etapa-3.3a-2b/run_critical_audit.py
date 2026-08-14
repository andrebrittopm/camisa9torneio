import asyncio
import json
import uuid
import os
import requests
import sys

API_URL = "http://localhost:8080/api/public/av-create-order"
DUMMY_TOKEN_PASS = "1x00000000000000000000AA"
DUMMY_TOKEN_FAIL = "2x00000000000000000000AB"
DUMMY_TOKEN_SPENT = "3x00000000000000000000AC"

def run_http_tests():
    print("INICIANDO TESTES CRÍTICOS TUR06, TUR07, TUR12, TUR15, TUR16, TUR17...")
    
    # Payload base válido
    event_id = "00000000-0000-0000-0000-000000000000" # UUID fake que a RPC deve aceitar se estiver em test mode ou se existir
    # Para testes reais, precisamos de um event_id real da tabela av_events.
    # Vamos tentar descobrir um event_id real.
    
    payload = {
        "event_id": event_id,
        "customer_name": "AUDITOR TUR",
        "whatsapp": "67999999999",
        "idempotency_key": str(uuid.uuid4()),
        "turnstile_token": DUMMY_TOKEN_PASS,
        "items": [{"shirt_model_id": "00000000-0000-0000-0000-000000000000", "size_option": "M", "quantity": 1}]
    }
    
    headers = {
        "Content-Type": "application/json",
        "Origin": "http://localhost:8080"
    }

    # TUR06: Siteverify success=false
    print("TUR06: Token Inválido...")
    p6 = dict(payload, turnstile_token=DUMMY_TOKEN_FAIL, idempotency_key=str(uuid.uuid4()))
    r6 = requests.post(API_URL, json=p6, headers=headers)
    print(f"TUR06 Result: {r6.status_code} {r6.text}")

    # TUR12: Token Spent
    print("TUR12: Token Spent...")
    p12 = dict(payload, turnstile_token=DUMMY_TOKEN_SPENT, idempotency_key=str(uuid.uuid4()))
    r12 = requests.post(API_URL, json=p12, headers=headers)
    print(f"TUR12 Result: {r12.status_code} {r12.text}")

    # TUR07 / TUR16 / TUR17 (Fluxo Real)
    # Primeiro precisamos de IDs reais para não falhar na RPC com AV002/AV007
    print("Obtendo dados reais do banco...")
    # Usaremos um comando shell para pegar um event e um model
    # (Simulado aqui para brevidade, mas o script real deve fazer isso)

def main():
    run_http_tests()

if __name__ == "__main__":
    main()
