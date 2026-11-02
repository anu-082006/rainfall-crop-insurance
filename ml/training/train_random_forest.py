"""
Trains and saves the Baseline Random Forest Model for Rainfall Shortfall Risk.
Evaluated on chronological train, validation, and test splits with purge buffers.
Saves feature importance report to reports/feature_importance.json.
"""

import json
from pathlib import Path
from typing import Dict, Any, Optional
import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import roc_auc_score, average_precision_score, brier_score_loss, log_loss

from ml.config import (
    TRAINING_DATASET_CSV,
    RANDOM_FOREST_MODEL_PATH,
    FEATURE_IMPORTANCE_JSON,
    RANDOM_SEED,
)
from ml.training.split_data import split_chronologically, get_feature_and_target_columns


def train_random_forest(
    data_path: Optional[Path] = None,
    model_save_path: Optional[Path] = None,
    importance_save_path: Optional[Path] = None,
) -> Dict[str, Any]:
    """
    Trains Random Forest model on historical training split (<=2014)
    and evaluates on validation (2015-2019) and held-out test (2020-2024).
    """
    csv_path = data_path or TRAINING_DATASET_CSV
    out_model_path = model_save_path or RANDOM_FOREST_MODEL_PATH
    out_imp_path = importance_save_path or FEATURE_IMPORTANCE_JSON

    print(f"Loading training dataset from {csv_path}...")
    df = pd.read_csv(csv_path)

    feature_cols, target_col = get_feature_and_target_columns()
    train_df, val_df, test_df, split_info = split_chronologically(df)

    print(f"Dataset splits:\n  Train: {len(train_df):,} records ({split_info['train']['shortfall_pct']:.1f}% shortfall)")
    print(f"  Val:   {len(val_df):,} records ({split_info['val']['shortfall_pct']:.1f}% shortfall)")
    print(f"  Test:  {len(test_df):,} records ({split_info['test']['shortfall_pct']:.1f}% shortfall)")

    X_train = train_df[feature_cols]
    y_train = train_df[target_col].values

    X_val = val_df[feature_cols]
    y_val = val_df[target_col].values

    X_test = test_df[feature_cols]
    y_test = test_df[target_col].values

    rf = RandomForestClassifier(
        n_estimators=100,
        max_depth=12,
        min_samples_leaf=10,
        random_state=RANDOM_SEED,
        n_jobs=-1,
        class_weight="balanced"
    )

    print("Fitting Random Forest classifier...")
    rf.fit(X_train, y_train)

    val_probs = rf.predict_proba(X_val)[:, 1]
    test_probs = rf.predict_proba(X_test)[:, 1]

    # Feature importances
    importances = dict(sorted(
        zip(feature_cols, rf.feature_importances_.round(4).tolist()),
        key=lambda x: x[1],
        reverse=True
    ))

    metrics = {
        "model_name": "RandomForest",
        "split_info": split_info,
        "features": feature_cols,
        "feature_importances": importances,
        "validation_metrics": {
            "roc_auc": float(round(roc_auc_score(y_val, val_probs), 4)),
            "pr_auc": float(round(average_precision_score(y_val, val_probs), 4)),
            "brier_score": float(round(brier_score_loss(y_val, val_probs), 4)),
            "log_loss": float(round(log_loss(y_val, val_probs), 4)),
        },
        "test_metrics": {
            "roc_auc": float(round(roc_auc_score(y_test, test_probs), 4)),
            "pr_auc": float(round(average_precision_score(y_test, test_probs), 4)),
            "brier_score": float(round(brier_score_loss(y_test, test_probs), 4)),
            "log_loss": float(round(log_loss(y_test, test_probs), 4)),
        }
    }

    print("\nRandom Forest Test Performance:")
    print(f"  ROC-AUC:     {metrics['test_metrics']['roc_auc']:.4f}")
    print(f"  PR-AUC:      {metrics['test_metrics']['pr_auc']:.4f}")
    print(f"  Brier Score: {metrics['test_metrics']['brier_score']:.4f}")
    print(f"  Log Loss:    {metrics['test_metrics']['log_loss']:.4f}")

    joblib.dump(rf, out_model_path)
    print(f"Saved trained Random Forest to {out_model_path}")

    with open(out_imp_path, "w", encoding="utf-8") as f:
        json.dump(importances, f, indent=2)
    print(f"Saved feature importances to {out_imp_path}")

    return metrics


if __name__ == "__main__":
    train_random_forest()
