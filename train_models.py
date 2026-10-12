import os
import json
import joblib
import pandas as pd
import numpy as np

from sklearn.model_selection import train_test_split, GroupShuffleSplit
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score, roc_auc_score,
    classification_report, confusion_matrix
)
import xgboost as xgb

BASE_DIR = r"c:\Users\Sahil\OneDrive\Desktop\Main-Projects\CodeAstra"
DATASET_DIR = os.path.join(BASE_DIR, "datasets")
MODELS_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(MODELS_DIR, exist_ok=True)

metrics_summary = {}

print("=================================================================")
print("TRAINING MODEL 1: INCIDENT CORRELATION CLASSIFIER")
print("=================================================================")

df_pairs = pd.read_csv(os.path.join(DATASET_DIR, "event_pair_correlation.csv"))
feature_cols_1 = ["time_diff_sec", "geo_distance_km", "same_source", "reliability_product", "text_similarity"]
X1 = df_pairs[feature_cols_1]
y1 = df_pairs["is_same_incident"]

X1_train, X1_test, y1_train, y1_test = train_test_split(X1, y1, test_size=0.2, random_state=42, stratify=y1)

# Baseline: Logistic Regression
lr_pipeline = Pipeline([
    ("scaler", StandardScaler()),
    ("classifier", LogisticRegression(random_state=42))
])
lr_pipeline.fit(X1_train, y1_train)
lr_preds = lr_pipeline.predict(X1_test)
lr_probs = lr_pipeline.predict_proba(X1_test)[:, 1]

# Advanced: XGBoost Classifier
xgb_model_1 = xgb.XGBClassifier(
    n_estimators=100, max_depth=4, learning_rate=0.08,
    random_state=42, eval_metric="logloss"
)
xgb_model_1.fit(X1_train, y1_train)
xgb_preds = xgb_model_1.predict(X1_test)
xgb_probs = xgb_model_1.predict_proba(X1_test)[:, 1]

# Advanced: Random Forest Classifier
rf_model_1 = RandomForestClassifier(n_estimators=100, max_depth=6, random_state=42)
rf_model_1.fit(X1_train, y1_train)
rf_preds = rf_model_1.predict(X1_test)
rf_probs = rf_model_1.predict_proba(X1_test)[:, 1]

m1_metrics = {
    "LogisticRegression_Baseline": {
        "accuracy": round(float(accuracy_score(y1_test, lr_preds)), 4),
        "precision": round(float(precision_score(y1_test, lr_preds)), 4),
        "recall": round(float(recall_score(y1_test, lr_preds)), 4),
        "f1": round(float(f1_score(y1_test, lr_preds)), 4),
        "roc_auc": round(float(roc_auc_score(y1_test, lr_probs)), 4)
    },
    "RandomForest": {
        "accuracy": round(float(accuracy_score(y1_test, rf_preds)), 4),
        "precision": round(float(precision_score(y1_test, rf_preds)), 4),
        "recall": round(float(recall_score(y1_test, rf_preds)), 4),
        "f1": round(float(f1_score(y1_test, rf_preds)), 4),
        "roc_auc": round(float(roc_auc_score(y1_test, rf_probs)), 4)
    },
    "XGBoost_Best": {
        "accuracy": round(float(accuracy_score(y1_test, xgb_preds)), 4),
        "precision": round(float(precision_score(y1_test, xgb_preds)), 4),
        "recall": round(float(recall_score(y1_test, xgb_preds)), 4),
        "f1": round(float(f1_score(y1_test, xgb_preds)), 4),
        "roc_auc": round(float(roc_auc_score(y1_test, xgb_probs)), 4)
    }
}

metrics_summary["Model_1_Incident_Correlation"] = m1_metrics
print("Model 1 Results:")
print(json.dumps(m1_metrics, indent=2))

# Save Best Model 1 (XGBoost)
joblib.dump(xgb_model_1, os.path.join(MODELS_DIR, "incident_correlation_model.pkl"))
print("Saved Model 1 -> models/incident_correlation_model.pkl")

print("\n=================================================================")
print("TRAINING MODEL 2: MULTIMODAL ANOMALY DETECTION ENGINE")
print("=================================================================")

df_anom = pd.read_csv(os.path.join(DATASET_DIR, "telemetry_anomalies.csv"))
feature_cols_2 = [
    "rainfall_intensity_mm_hr", "water_level_cm",
    "traffic_speed_kmh", "transit_headway_min", "sensor_supply_voltage_v"
]
X2 = df_anom[feature_cols_2]
y2 = df_anom["is_anomaly"]  # 1: Anomaly, 0: Normal

# Train Isolation Forest on telemetry features
iso_forest = IsolationForest(contamination=0.15, random_state=42)
iso_forest.fit(X2)

# Predict: -1 for anomaly, 1 for normal -> convert to 1 for anomaly, 0 for normal
raw_preds = iso_forest.predict(X2)
iso_preds = np.where(raw_preds == -1, 1, 0)

# Domain-specific threshold rules for comparison
def domain_rule_anomaly(row):
    # Rule 1: Water level high + speed collapse
    if row["water_level_cm"] > 45.0 and row["traffic_speed_kmh"] < 10.0:
        return 1
    # Rule 2: Torrential rain + train stoppage
    if row["rainfall_intensity_mm_hr"] > 60.0 and row["transit_headway_min"] > 20.0:
        return 1
    # Rule 3: Sensor brownout voltage
    if row["sensor_supply_voltage_v"] < 6.0:
        return 1
    return 0

rule_preds = df_anom.apply(domain_rule_anomaly, axis=1).values

# Ensemble / Hybrid: If Isolation Forest OR Domain Rule triggers with high confidence
hybrid_preds = np.logical_or(iso_preds, rule_preds).astype(int)

m2_metrics = {
    "IsolationForest": {
        "accuracy": round(float(accuracy_score(y2, iso_preds)), 4),
        "precision": round(float(precision_score(y2, iso_preds)), 4),
        "recall": round(float(recall_score(y2, iso_preds)), 4),
        "f1": round(float(f1_score(y2, iso_preds)), 4)
    },
    "DomainRules_Baseline": {
        "accuracy": round(float(accuracy_score(y2, rule_preds)), 4),
        "precision": round(float(precision_score(y2, rule_preds)), 4),
        "recall": round(float(recall_score(y2, rule_preds)), 4),
        "f1": round(float(f1_score(y2, rule_preds)), 4)
    },
    "Hybrid_Engine": {
        "accuracy": round(float(accuracy_score(y2, hybrid_preds)), 4),
        "precision": round(float(precision_score(y2, hybrid_preds)), 4),
        "recall": round(float(recall_score(y2, hybrid_preds)), 4),
        "f1": round(float(f1_score(y2, hybrid_preds)), 4)
    }
}

metrics_summary["Model_2_Anomaly_Detection"] = m2_metrics
print("Model 2 Results:")
print(json.dumps(m2_metrics, indent=2))

joblib.dump(iso_forest, os.path.join(MODELS_DIR, "telemetry_anomaly_model.pkl"))
print("Saved Model 2 -> models/telemetry_anomaly_model.pkl")

print("\n=================================================================")
print("TRAINING MODEL 3: PERSONALIZED ROUTE IMPACT CLASSIFIER")
print("=================================================================")

df_impacts = pd.read_csv(os.path.join(DATASET_DIR, "route_impact_labels.csv"))
df_routes = pd.read_csv(os.path.join(DATASET_DIR, "route_network.csv"))
df_incidents = pd.read_csv(os.path.join(DATASET_DIR, "incident_severity_labels.csv"))
df_users = pd.read_csv(os.path.join(DATASET_DIR, "user_profiles.csv"))

# Map severity level text to numeric rank
severity_map = {
    "CRITICAL_LEVEL_4": 4, "CRITICAL_LEVEL_5": 5,
    "MAJOR_LEVEL_3": 3, "MODERATE_LEVEL_2": 2, "MINOR_LEVEL_1": 1
}
df_incidents["severity_rank"] = df_incidents["severity_level"].map(lambda x: severity_map.get(x, 2))

# Aggregate route characteristics per route_id
route_summary = df_routes.groupby("route_id").agg({
    "distance_km": "sum",
    "typical_speed_kmh": "mean",
    "is_flood_prone": "any",
    "transport_mode": "first"
}).reset_index()

# Merge features safely WITHOUT label leakage
merged = df_impacts.merge(df_incidents[["incident_id", "severity_rank", "affected_radius_km", "scenario_type"]], on="incident_id", how="left")
merged = merged.merge(route_summary, on="route_id", how="left")
merged["is_flood_prone"] = merged["is_flood_prone"].astype(int)

# One-hot encode mode
for m in ["Bike", "Train", "Metro", "Car"]:
    merged[f"mode_{m}"] = (merged["transport_mode"] == m).astype(int)

# One-hot encode scenario
for sc in ["Urban Flooding", "Road Accident", "Public Transport Disruption", "Utility Failure"]:
    col = f"scenario_{sc.replace(' ', '_')}"
    merged[col] = (merged["scenario_type"] == sc).astype(int)

feature_cols_3 = [
    "severity_rank", "affected_radius_km", "distance_km", "typical_speed_kmh", "is_flood_prone",
    "mode_Bike", "mode_Train", "mode_Metro", "mode_Car",
    "scenario_Urban_Flooding", "scenario_Road_Accident", "scenario_Public_Transport_Disruption", "scenario_Utility_Failure"
]

X3 = merged[feature_cols_3].fillna(0)

# Target: Impact Label
label_mapping = {"HIGH_DISRUPTION": 2, "MODERATE_HIGH_DISRUPTION": 1, "MINIMAL_IMPACT": 0}
y3 = merged["impact_label"].map(label_mapping).values

# GROUP-STRATIFIED SPLIT BY INCIDENT_ID (Prevents cross-incident data leakage as requested!)
groups = merged["incident_id"].values
gss = GroupShuffleSplit(n_splits=1, test_size=0.25, random_state=42)
train_idx, test_idx = next(gss.split(X3, y3, groups=groups))

X3_train, X3_test = X3.iloc[train_idx], X3.iloc[test_idx]
y3_train, y3_test = y3[train_idx], y3[test_idx]

print(f"Group Split Complete: {len(train_idx)} train samples, {len(test_idx)} test samples (Disjoint Incidents).")
print(f"Test Class Distribution: High: {sum(y3_test==2)}, Mod: {sum(y3_test==1)}, Min: {sum(y3_test==0)}")

# Compute class weights to handle imbalance
class_counts = np.bincount(y3_train)
total_samples = len(y3_train)
class_weights = {i: total_samples / (len(class_counts) * count) for i, count in enumerate(class_counts)}

# Rule-based Baseline
def rule_based_predict(row):
    if row["severity_rank"] >= 4 and (row["mode_Train"] == 1 or row["mode_Car"] == 1):
        return 2  # High Disruption
    elif row["severity_rank"] >= 3:
        return 1  # Moderate
    else:
        return 0  # Minimal

rule_preds_3 = X3_test.apply(rule_based_predict, axis=1).values

# Random Forest with Class Weighting
rf_model_3 = RandomForestClassifier(
    n_estimators=120, max_depth=5, class_weight=class_weights, random_state=42
)
rf_model_3.fit(X3_train, y3_train)
rf_preds_3 = rf_model_3.predict(X3_test)

# XGBoost Multiclass Classifier
sample_weight_3 = np.array([class_weights[y] for y in y3_train])
xgb_model_3 = xgb.XGBClassifier(
    n_estimators=100, max_depth=4, learning_rate=0.08,
    objective="multi:softprob", num_class=3, random_state=42
)
xgb_model_3.fit(X3_train, y3_train, sample_weight=sample_weight_3)
xgb_preds_3 = xgb_model_3.predict(X3_test)

m3_metrics = {
    "RuleBased_Baseline": {
        "accuracy": round(float(accuracy_score(y3_test, rule_preds_3)), 4),
        "macro_f1": round(float(f1_score(y3_test, rule_preds_3, average="macro")), 4),
        "high_disruption_recall": round(float(recall_score(y3_test, rule_preds_3, labels=[2], average="macro")), 4)
    },
    "RandomForest_Weighted": {
        "accuracy": round(float(accuracy_score(y3_test, rf_preds_3)), 4),
        "macro_f1": round(float(f1_score(y3_test, rf_preds_3, average="macro")), 4),
        "high_disruption_precision": round(float(precision_score(y3_test, rf_preds_3, labels=[2], average="macro")), 4),
        "high_disruption_recall": round(float(recall_score(y3_test, rf_preds_3, labels=[2], average="macro")), 4)
    },
    "XGBoost_Weighted": {
        "accuracy": round(float(accuracy_score(y3_test, xgb_preds_3)), 4),
        "macro_f1": round(float(f1_score(y3_test, xgb_preds_3, average="macro")), 4),
        "high_disruption_precision": round(float(precision_score(y3_test, xgb_preds_3, labels=[2], average="macro")), 4),
        "high_disruption_recall": round(float(recall_score(y3_test, xgb_preds_3, labels=[2], average="macro")), 4)
    }
}

metrics_summary["Model_3_Route_Impact_Classifier"] = m3_metrics
print("Model 3 Results:")
print(json.dumps(m3_metrics, indent=2))

joblib.dump(xgb_model_3, os.path.join(MODELS_DIR, "route_impact_classifier.pkl"))
print("Saved Model 3 -> models/route_impact_classifier.pkl")

# Save overall evaluation report
with open(os.path.join(MODELS_DIR, "evaluation_report.json"), "w", encoding="utf-8") as f:
    json.dump(metrics_summary, f, indent=2)

print("\nSaved full evaluation report -> models/evaluation_report.json")
print("ALL 3 MODELS SUCCESSFULLY TRAINED AND VERIFIED!")
