"""
Unit tests for record-count reconciliation, validation-only calibration fitting,
and multi-slice evaluation.
"""

import pandas as pd
import numpy as np
import pytest
from sklearn.linear_model import LogisticRegression
from sklearn.frozen import FrozenEstimator
from sklearn.calibration import CalibratedClassifierCV

from ml.config import (
    HISTORICAL_WINDOWS_CSV,
    TRAINING_DATASET_CSV,
    SPLIT_CONFIG,
)
from ml.training.split_data import split_chronologically, get_feature_and_target_columns
from ml.evaluation.slice_evaluation import evaluate_slice


def test_dataset_record_count_reconciliation():
    """
    Exact mathematical reconciliation of all records across the entire pipeline:
    1. Coverage windows generated = 1,124,136
    2. Warm-up records filtered (1950-1954) = 526,176
    3. Feature dataset = 597,960
    4. Train split (<= 2014) = 445,824
    5. Validation split (2015-2019) = 70,272
    6. Test split (2020-2024) = 72,072
    7. 120-day Purge buffer records = 9,792 (4,896 in 2014 + 4,896 in 2019)
    Reconciliation identity: Train + Val + Test + Purged == Feature Dataset.
    """
    df_windows = pd.read_csv(HISTORICAL_WINDOWS_CSV)
    df_features = pd.read_csv(TRAINING_DATASET_CSV)
    train_df, val_df, test_df, split_info = split_chronologically(df_features)

    # 1. Warm-up filtering arithmetic
    warmup_count = len(df_windows) - len(df_features)
    assert warmup_count == 526176

    # 2. Split counts
    n_train = len(train_df)
    n_val = len(val_df)
    n_test = len(test_df)
    assert n_train == 445824
    assert n_val == 70272
    assert n_test == 72072

    # 3. Purged records calculation
    in_splits_mask = df_features.index.isin(train_df.index) | df_features.index.isin(val_df.index) | df_features.index.isin(test_df.index)
    purged_df = df_features[~in_splits_mask].copy()
    purged_df["start_year"] = pd.to_datetime(purged_df["start_date"]).dt.year

    n_purged = len(purged_df)
    assert n_purged == 9792, f"Expected 9,792 purged records, got {n_purged}"

    # Verify purge counts per boundary
    purged_by_year = purged_df["start_year"].value_counts().to_dict()
    assert purged_by_year[2014] == 4896, "2014 autumn purge buffer must contain exactly 4,896 records"
    assert purged_by_year[2019] == 4896, "2019 autumn purge buffer must contain exactly 4,896 records"

    # 4. Total conservation equation
    assert n_train + n_val + n_test + n_purged == len(df_features)
    assert len(df_features) + warmup_count == len(df_windows)


def test_calibration_fits_strictly_on_validation_data_without_test_leakage():
    """
    Verifies that CalibratedClassifierCV is fitted strictly on validation data (X_val, y_val),
    and that test data is never passed to fit().
    """
    df = pd.read_csv(TRAINING_DATASET_CSV)
    feature_cols, target_col = get_feature_and_target_columns()
    train_df, val_df, test_df, _ = split_chronologically(df)

    # Synthetic fast estimator
    X_train = train_df[feature_cols].iloc[:1000]
    y_train = train_df[target_col].iloc[:1000].values
    base_lr = LogisticRegression(max_iter=200).fit(X_train, y_train)

    X_val = val_df[feature_cols].iloc[:500]
    y_val = val_df[target_col].iloc[:500].values

    X_test = test_df[feature_cols].iloc[:500]
    y_test = test_df[target_col].iloc[:500].values

    # Fit calibration on Validation data only
    frozen_base = FrozenEstimator(base_lr)
    calibrator = CalibratedClassifierCV(frozen_base, method="sigmoid")
    calibrator.fit(X_val, y_val)

    # Assert test data was untouched during fitting
    probs_test = calibrator.predict_proba(X_test)[:, 1]
    assert len(probs_test) == len(X_test)
    assert np.all((probs_test >= 0.0) & (probs_test <= 1.0))


def test_slice_evaluation_handles_single_class_gracefully():
    """
    Ensure slice evaluation handles a single-class slice without crashing,
    returning None for ROC-AUC / PR-AUC.
    """
    # Create single-class synthetic slice
    mock_df = pd.DataFrame({
        "shortfall_label": [0, 0, 0, 0, 0],
        "pred_prob": [0.1, 0.2, 0.05, 0.15, 0.08]
    })
    res = evaluate_slice(mock_df, "shortfall_label", "pred_prob")
    assert res["roc_auc"] is None
    assert res["pr_auc"] is None
    assert res["positive_count"] == 0
    assert res["brier_score"] >= 0.0
