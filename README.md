# ⚡ CodeAstra: Multimodal Urban Incident Intelligence Engine

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB.svg?logo=python&logoColor=white)](https://python.org)
[![Scikit-Learn](https://img.shields.io/badge/scikit--learn-1.4+-F7931E.svg?logo=scikit-learn&logoColor=white)](https://scikit-learn.org)
[![XGBoost](https://img.shields.io/badge/XGBoost-2.0+-EB5424.svg)](https://xgboost.readthedocs.io)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9.4-199900.svg?logo=leaflet&logoColor=white)](https://leafletjs.com)
[![Vis.js](https://img.shields.io/badge/Vis.js-Network-1e88e5.svg)](https://visjs.org)

An end-to-end, production-grade **Multimodal Urban Incident Intelligence Engine** that ingests heterogeneous, noisy, out-of-order time-stamped urban signals (weather feeds, ultrasonic water-level sensors, traffic speed radars, railway track telemetry, citizen social reports, and 112 emergency calls) to construct an **evolving causal incident graph**, perform **anomaly detection**, evaluate an **inspectable confidence ledger**, and protect commuters with **personalized multi-modal route rerouting**.

Engineered and calibrated for the high-density **Mumbai Western Suburbs Corridor** (**Dahisar – Borivali – Kandivali – Malad – Goregaon – Jogeshwari – Andheri – Versova**).

---

## 🌟 The 4 Key Innovations

### 1. Cascading Incident Intelligence (Evolving Evidence Graph)
Instead of displaying disconnected alerts, CodeAstra reconstructs developing causal chains across urban systems:
$$\text{Heavy Cloudburst} \longrightarrow \text{Track Submergence} \longrightarrow \left\{ \begin{aligned} &\text{Rail Slow/Fast Line Halt} \\ &\text{Malad Subway Closure} \longrightarrow \text{BEST Bus Diversion} \end{aligned} \right. \longrightarrow \text{Personal Commute Alert}$$
* **NetworkX Directed Graph Engine** distinguishing **Observed Sensor Events**, **Inferred Causal Mechanisms**, and **Cascading Downstream Consequences**.

### 2. Personal Commute Impact Fingerprint
Tailored commute evaluation for our primary demonstration persona:
* **Student:** Sahil (`USR_001`) commuting from **Ashokvan, Borivali East** $\longrightarrow$ **Rajiv Gandhi Institute of Technology (RGIT, Versova)**.
* Continuously evaluates all 4 transit modes:
  1. **Motorcycle (Personal Road):** Monitored for WEH flyover accidents & subway flooding.
  2. **Western Railway Local Train:** Monitored for track water submergence at Malad & OHE power trips.
  3. **Metro (Line 2A / 7 / 1):** Elevated viaduct transit providing resilient, unaffected alternative.
  4. **BEST Bus:** Monitored for road closures and diversions.
* Dynamically alerts the student and suggests exact transfer points (e.g., auto to Borivali West Metro Line 2A to save **43 minutes**).

### 3. Evidence Confidence Ledger
Transparent, inspectable AI reasoning rather than black-box probability predictions. Every incident explains:
* 🟢 **Supporting Evidence:** Sensor corroboration with source reliability weighting.
* 🟠 **Conflicting Evidence:** Contradictory reports down-weighted but preserved.
* 🟣 **Duplicate Evidence:** Redundant citizen reports consolidated to prevent false panic.
* ⚪ **Missing Evidence:** Sensor dropouts / blackouts explicitly penalizing confidence.

### 4. Interactive Incident Replay Lab (Judges Signature Demo)
An interactive simulation engine allowing evaluators to inject chaos into the streaming pipeline:
1. **Delay Incoming Event:** Tests out-of-order arrival and retroactive incident fusion.
2. **Inject Duplicate Tweet:** Verifies deduplication logic.
3. **Kill Sensor (Blackout):** Simulates sensor failure and observes confidence penalty.
4. **Inject Contradictory Claim:** Introduces false "Road is clear" tweet and observes ledger response.
5. **Restore Sensor:** Reconnects telemetry and recovers confidence score.
6. **Block Alternative Route:** Triggers secondary disruption and tests dynamic multi-modal rerouting.

---

## 🧠 The 3 Core Machine Learning Models

| Model | Architecture | Task & Target | Performance Metrics |
|---|---|---|---|
| **Model 1: Incident Correlation** | **XGBoost Classifier** vs Logistic Regression baseline | Predicts if observation pair $(E_1, E_2)$ belongs to same incident | **F1: 99.7%**, Precision: **100.0%**, ROC-AUC: **1.000** |
| **Model 2: Anomaly Detection** | **Isolation Forest** + Dynamic Domain Thresholds | Multimodal telemetry anomaly detection (water, speed, rain, headway, voltage) | **Precision: 99.4%**, Recall: **92.3%**, F1: **95.7%** |
| **Model 3: Route Impact Classifier** | **Weighted Random Forest / XGBoost** | Multiclass disruption prediction (`HIGH`, `MODERATE`, `MINIMAL`) on **Incident-Stratified Group Split** | **Macro F1: 98.6%**, High-Disruption Recall: **100.0%** (vs Rule Baseline F1: 22.3%) |

> **Data Leakage Safeguards:**
> Target columns (`is_duplicate`, `contradiction_flag`, `ground_truth_incident_id`, `known_cause`) were **strictly excluded** from input features. Model 3 was validated using `GroupShuffleSplit(groups=incident_id)` to guarantee zero cross-incident data contamination.

---

## 📁 Reconciled Dataset Inventory

All 16 CSV datasets reside in [`datasets/`](./datasets/):

| Dataset | Rows | Description |
|---|---|---|
| `urban_incident_events.csv` | **2,321** | Central raw stream with `event_timestamp` vs `received_timestamp` (simulated latency). |
| `incident_ground_truth.csv` | **2,321** | Ground-truth causal labels (`PARENT_TRIGGER`, `PRIMARY_OBSERVATION`, `CONTRADICTORY_NOISE`, etc.). |
| `event_pair_correlation.csv` | **3,680** | Balanced pairwise dataset used for training Model 1 without target leakage. |
| `telemetry_anomalies.csv` | **1,200** | Multi-sensor numerical stream with controlled injected anomalies for Model 2. |
| `route_impact_labels.csv` | **591** | Commuter journey disruption labels with expected delays and impact categories. |
| `citizen_emergency_reports.csv` | **477** | Twitter/X citizen complaint text and Maharashtra Police 112 CAD emergency call dispatches. |
| `public_transport_status.csv` | **364** | Real Western Railway 90xxx train numbers and Metro Lines 2A, 7, and 1 headways. |
| `route_recommendations.csv` | **291** | Multi-modal alternatives comparing disrupted modes vs resilient switches and net time saved. |
| `incident_severity_labels.csv` | **46** | 14-day multi-incident ground truth (Severity 1–5, radius, commuters affected, confidence). |
| `weather_events.csv` | **2,016** | 14-day rainfall rate (mm/hr), accumulation, and ultrasonic flood gauge readings. |
| `traffic_incidents.csv` | **1,680** | Doppler traffic radars across WEH, Link Road, SV Road, and flooded subways. |
| `multimodal_stations_geo.csv` | **70** | GPS nodes for Western Railway, Metro 2A, Metro 7, Metro 1, and highway bottlenecks. |
| `route_network.csv` | **41** | Road segments, rail tracks, and metro viaducts with flood-prone tags and distance (km). |
| `user_profiles.csv` | **25** | Multi-commuter profiles (Students, Doctors, Engineers, Lawyers) across all travel modes. |
| `sensor_metadata.csv` | **20** | Physical sensor inventory with polling rates and reliability weights. |
| `baseline_travel_times.csv` | **18** | Baseline travel durations across Morning Peak, Afternoon, and Evening slots. |

---

## 🚀 Quickstart & Running the Working Demo

### 1. Clone & Set Up
```bash
git clone https://github.com/Not-Sahil/CodeAstra.git
cd CodeAstra
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
# Core: fastapi uvicorn scikit-learn xgboost networkx pandas numpy joblib
```

### 3. Train ML Models (Optional - Models pre-trained in `models/`)
```bash
python train_models.py
```

### 4. Start the Application & Working Demo
```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

Open your browser at **[http://127.0.0.1:8000](http://127.0.0.1:8000)** to explore:
* **Corridor Map & Telemetry:** Real-time geospatial view of Mumbai Western Suburbs.
* **Cascading Evidence Graph (Vis.js):** Interactive causal tree of active incidents.
* **Student Commute Fingerprint:** 4-mode comparative analysis for Sahil with live rerouting advice.
* **Evidence Confidence Ledger:** Detailed inspectable reasoning quad-cards.
* **Incident Replay Lab:** Live buttons to inject late events, duplicates, and sensor dropouts.
* **ML Models Lab:** Accuracy, Precision, Recall, and ROC-AUC curves.

---

## 🏛️ Project Architecture

```
CodeAstra/
├── backend/
│   ├── engine.py           # Fusion engine, NetworkX evidence graph, Confidence ledger, Replay lab
│   └── main.py             # FastAPI REST API + static web server
├── datasets/
│   ├── generate_datasets.py            # Reproducible synthetic dataset generator
│   ├── expand_datasets_and_reconcile.py # Pairwise generator & reconciliation
│   ├── *.csv                           # 16 production-scale reconciled datasets
│   └── README.md                       # Comprehensive dataset documentation
├── frontend/
│   ├── index.html          # Single-page dashboard with 6 views & tabs
│   ├── style.css           # Modern dark-mode glassmorphic design system
│   └── app.js              # Leaflet map, Vis.js graph, and Replay controller
├── models/
│   ├── incident_correlation_model.pkl  # Trained Model 1 (XGBoost)
│   ├── telemetry_anomaly_model.pkl     # Trained Model 2 (Isolation Forest)
│   ├── route_impact_classifier.pkl     # Trained Model 3 (XGBoost)
│   └── evaluation_report.json          # Metrics report & confusion matrices
├── train_models.py         # Full ML training & evaluation script
├── requirements.txt        # Python dependency manifest
└── README.md               # Repository documentation
```

---

## 👥 Contributors & Hackathon Team
* **CodeAstra Team** — Mumbai Hackathon Project
* Repository: [https://github.com/Not-Sahil/CodeAstra](https://github.com/Not-Sahil/CodeAstra)
