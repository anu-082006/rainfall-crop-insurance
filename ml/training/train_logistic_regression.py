"""
Trains and saves the Baseline Logistic Regression Model for Rainfall Shortfall Risk.
Uses a StandardScaler preprocessing pipeline and class-weight balancing.
Evaluated on chronological train, validation, and test splits with purge buffers.
"""

from pathlib import Path
from typing import Dict, Any, Optional
import joblib
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import roc_auc_score, average_precision_score, brier_score_loss, log_loss

from ml.config import (
    TRAINING_DATASET_CSV,
    LOGISTIC_REGRESSION_MODEL_PATH,
    RANDOM_SEED,
)
from ml.training.split_data import split_chronologically, get_feature_and_target_columns


def train_logistic_regression(
    data_path: Optional[Path] = None,
    model_save_path: Optional[Path] = None,
) -> Dict[str, Any]:
    """
    Trains Logistic Regression model pipeline on historical training split (<=2014)
    and evaluates on validation (2015-2019) and held-out test (2020-2024).
    """
    csv_path = data_path or TRAINING_DATASET_CSV
    out_model_path = model_save_path or LOGISTIC_REGRESSION_MODEL_PATH

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

    # Preprocessing and model pipeline
    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("classifier", LogisticRegression(
            max_iter=1000,
            class_weight="balanced",
            random_state=RANDOM_SEED,
            solver="lbfgs"
        ))
    ])

    print("Fitting Logistic Regression pipeline...")
    pipeline.fit(X_train, y_train)

    # Predictions
    val_probs = pipeline.predict_proba(X_val)[:, 1]
    test_probs = pipeline.predict_proba(X_test)[:, 1]

    # Compute metrics
    metrics = {
        "model_name": "LogisticRegression",
        "split_info": split_info,
        "features": feature_cols,
        "coefficients": dict(zip(feature_cols, pipeline.named_steps["classifier"].coef_[0].round(4).tolist())),
        "intercept": float(round(pipeline.named_steps["classifier"].intercept_[0], 4)),
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

    print("\nLogistic Regression Test Performance:")
    print(f"  ROC-AUC:     {metrics['test_metrics']['roc_auc']:.4f}")
    print(f"  PR-AUC:      {metrics['test_metrics']['pr_auc']:.4f}")
    print(f"  Brier Score: {metrics['test_metrics']['brier_score']:.4f}")
    print(f"  Log Loss:    {metrics['test_metrics']['log_loss']:.4f}")

    # Save model pipeline
    joblib.dump(pipeline, out_model_path)
    print(f"Saved trained pipeline to {out_model_path}")

    return metrics


if __name__ == "__main__":
    train_logistic_regression()
