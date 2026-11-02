"""
Multi-slice performance evaluation module for Karnataka Rainfall-Risk ML models.
Evaluates model across:
1. Agro-climatic Zones (Coastal, Malnad, Northern Interior, Central, Southern Interior)
2. Policy Durations (30, 60, 90, 120 days)
3. Policy Severity Levels (Severe, Moderate, Mild)
4. Seasons (Kharif, Rabi, Summer/Dry)
"""

import json
from pathlib import Path
from typing import Dict, Any, List, Optional
import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import (
    roc_auc_score,
    average_precision_score,
    brier_score_loss,
    log_loss,
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
)

from ml.config import (
    TRAINING_DATASET_CSV,
    RANDOM_FOREST_MODEL_PATH,
    LOCATIONS_CSV,
    REPORTS_DIR,
)
from ml.training.split_data import split_chronologically, get_feature_and_target_columns
from ml.evaluation.calibration import compute_expected_calibration_error

SLICE_REPORT_JSON = REPORTS_DIR / "slice_evaluation_report.json"


def evaluate_slice(subset_df: pd.DataFrame, target_col: str, prob_col: str) -> Dict[str, Any]:
    """
    Computes performance metrics on a specific data slice.
    """
    n = len(subset_df)
    if n == 0:
        return {"error": "Empty slice"}

    y = subset_df[target_col].values
    p = subset_df[prob_col].values
    positives = int(y.sum())
    pos_pct = round((positives / n) * 100, 2)
    pred_labels = (p >= 0.5).astype(int)

    # If single class in slice, ROC-AUC / PR-AUC cannot be calculated
    if positives == 0 or positives == n:
        roc_auc = None
        pr_auc = None
    else:
        roc_auc = float(round(roc_auc_score(y, p), 4))
        pr_auc = float(round(average_precision_score(y, p), 4))

    # Binary log loss requires labels=[0, 1] when only 1 class is present in y
    ll_val = float(round(log_loss(y, p, labels=[0, 1]), 4))

    return {
        "records": n,
        "positive_count": positives,
        "shortfall_prevalence_pct": pos_pct,
        "roc_auc": roc_auc,
        "pr_auc": pr_auc,
        "brier_score": float(round(brier_score_loss(y, p), 4)),
        "log_loss": ll_val,
        "accuracy": float(round(accuracy_score(y, pred_labels), 4)),
        "precision": float(round(precision_score(y, pred_labels, zero_division=0), 4)),
        "recall": float(round(recall_score(y, pred_labels, zero_division=0), 4)),
        "f1": float(round(f1_score(y, pred_labels, zero_division=0), 4)),
        "ece": float(round(compute_expected_calibration_error(y, p), 4)),
    }


def run_slice_evaluation(
    data_path: Optional[Path] = None,
    model_path: Optional[Path] = None,
    output_json_path: Optional[Path] = None,
) -> Dict[str, Any]:
    """
    Runs systematic slice evaluation on held-out test data (2020-2024).
    """
    csv_path = data_path or TRAINING_DATASET_CSV
    rf_path = model_path or RANDOM_FOREST_MODEL_PATH
    out_json = output_json_path or SLICE_REPORT_JSON

    df = pd.read_csv(csv_path)
    locs = pd.read_csv(LOCATIONS_CSV)
    loc_to_region = locs.set_index("location_id")["region"].to_dict()
    df["region"] = df["location_id"].map(loc_to_region)

    feature_cols, target_col = get_feature_and_target_columns()
    _, _, test_df, _ = split_chronologically(df)

    model = joblib.load(rf_path)
    probs = model.predict_proba(test_df[feature_cols])[:, 1]
    test_df["pred_prob"] = probs

    # Seasonal mapping: Kharif (Jun-Sep), Rabi (Oct-Dec), Summer/Dry (Jan-May)
    test_df["season"] = pd.cut(
        test_df["start_month"],
        bins=[0, 5, 9, 12],
        labels=["Summer/Dry (Jan-May)", "Kharif (Jun-Sep)", "Rabi (Oct-Dec)"]
    )

    # 1. By Agro-climatic Zone
    zone_results = {}
    for region in ["coastal", "malnad", "northern_interior", "central", "southern_interior"]:
        sub = test_df[test_df["region"] == region]
        zone_results[region] = evaluate_slice(sub, target_col, "pred_prob")

    # 2. By Policy Duration
    duration_results = {}
    for dur in [30, 60, 90, 120]:
        sub = test_df[test_df["duration_days"] == dur]
        duration_results[f"{dur}_days"] = evaluate_slice(sub, target_col, "pred_prob")

    # 3. By Policy Severity Level
    severity_results = {}
    for level in ["severe", "moderate", "mild"]:
        sub = test_df[test_df["policy_level"] == level]
        severity_results[level] = evaluate_slice(sub, target_col, "pred_prob")

    # 4. By Seasonal Period
    season_results = {}
    for season in ["Kharif (Jun-Sep)", "Rabi (Oct-Dec)", "Summer/Dry (Jan-May)"]:
        sub = test_df[test_df["season"] == season]
        season_results[season] = evaluate_slice(sub, target_col, "pred_prob")

    report = {
        "evaluation_period": "2020-01-01 to 2024-12-31",
        "total_test_records": len(test_df),
        "slices": {
            "by_agro_climatic_zone": zone_results,
            "by_duration": duration_results,
            "by_severity": severity_results,
            "by_season": season_results,
        },
        "spatial_limitations_statement": (
            "Model training and evaluation are conducted on 24 representative district-center coordinates "
            "derived from ECMWF ERA5 reanalysis grid cells (~31 km resolution). Predictions represent "
            "district-scale regional climatology and do NOT provide village-level microclimate resolution "
            "or field-specific terrain variations."
        )
    }

    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    print(f"Saved slice evaluation report to {out_json}")

    return report


if __name__ == "__main__":
    run_slice_evaluation()
