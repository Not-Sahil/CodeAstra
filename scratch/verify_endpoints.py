import requests

BASE_URL = "http://127.0.0.1:8000"

def test_endpoints():
    print("1. Testing Causal Analysis Endpoint...")
    r = requests.get(f"{BASE_URL}/api/incident/INC_MUM_20260715_01/causal-analysis")
    assert r.status_code == 200, f"Status: {r.status_code}"
    data = r.json()
    print(f"   Success! Root Cause: {data['root_cause']['title']}")
    print(f"   Observed Symptoms count: {len(data['observed_symptoms'])}")

    print("\n2. Testing Timeline Scrubber Endpoint...")
    r = requests.get(f"{BASE_URL}/api/incident/INC_MUM_20260715_01/timeline-scrubber")
    assert r.status_code == 200
    events = r.json()["events"]
    print(f"   Success! Total Scrubber Events: {len(events)}")
    delayed_ev = next(e for e in events if e["is_delayed"])
    print(f"   Delayed event detected: {delayed_ev['title']} (Observed: {delayed_ev['event_timestamp']}, Ingested: {delayed_ev['ingestion_timestamp']})")

    print("\n3. Testing Reconstruct Step Endpoint (Step 5 - Delayed arrival)...")
    r = requests.get(f"{BASE_URL}/api/incident/INC_MUM_20260715_01/reconstruct-step?step=5")
    assert r.status_code == 200
    step_data = r.json()
    print(f"   Success! Confidence at Step 5: {step_data['confidence_score']}, Nodes: {step_data['nodes_count']}")

    print("\n4. Testing Before vs. After Comparison Endpoint (Hackathon Centerpiece)...")
    r = requests.get(f"{BASE_URL}/api/incident/INC_MUM_20260715_01/comparison")
    assert r.status_code == 200
    comp = r.json()
    print(f"   Success! Conventional Alerts count: {comp['conventional_view']['alerts_count']}")
    print(f"   Fusion Incident count: {comp['fusion_view']['incident_count']}")
    print(f"   Delta noise reduction: {comp['delta_summary']['noise_reduction']}")

    print("\n5. Testing Explainable Operator Briefing Endpoint...")
    r = requests.post(f"{BASE_URL}/api/incident/INC_MUM_20260715_01/operator-briefing", json={
        "query": "Explain why confidence dropped and why Sensor BMC_FLD_MALAD_NORTH was ignored"
    })
    assert r.status_code == 200
    briefing = r.json()
    print(f"   Success! Confidence: {briefing['confidence_score']}")
    print(f"   Targeted Query Response: {briefing['query_response'][:120]}...")

    print("\n6. Testing Municipal Work Order Generation & Approval Endpoint...")
    r = requests.post(f"{BASE_URL}/api/work-orders/draft", json={
        "incident_id": "INC_MUM_20260715_01",
        "operator_name": "COMMISSIONER_PATIL"
    })
    assert r.status_code == 200
    wo = r.json()
    wo_id = wo["work_order_id"]
    print(f"   Success! Draft Created: {wo_id}, Status: {wo['status']}")

    # Approve
    r_app = requests.post(f"{BASE_URL}/api/work-orders/{wo_id}/approve", json={
        "actor": "COMMISSIONER_PATIL",
        "role": "ADMIN",
        "notes": "Emergency municipal clearance granted."
    })
    assert r_app.status_code == 200
    print(f"   Success! Approved: {r_app.json()['work_order']['status']}, Approved by: {r_app.json()['work_order']['approved_by']}")

    # Fetch audit
    r_audit = requests.get(f"{BASE_URL}/api/work-orders/{wo_id}/audit-trail")
    assert r_audit.status_code == 200
    audit_trail = r_audit.json()["audit_trail"]
    print(f"   Success! Audit records count: {len(audit_trail)}")

    print("\n>>> ALL 6 LIVE REST API ENDPOINTS VERIFIED 100% OPERATIONAL! <<<")

if __name__ == "__main__":
    test_endpoints()
