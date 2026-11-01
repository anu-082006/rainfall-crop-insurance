"""
Unit tests for models and evaluation splits.
Verifies:
- Chronological split purity and >= 120-day purge buffer.
- Models load and predict calibrated probabilities in [0, 1].
- Recommendation layer correctly ranks options and includes legal disclaimer.
"""

from pathlib import Path
import pandas as pd
import pytest

from ml.config import (
    TRAINING_DATASET_CSV,
    LOGISTIC_REGRESSION_MODEL_PATH,
    RANDOM_FOREST_MODEL_PATH,
)
from ml.training.split_data import split_chronologically, get_feature_and_target_columns
from ml.inference.predict_policy_risk import RiskPredictor, recommend_policies


def test_chronological_split_purity_and_purge_buffer():
    """
    Ensure no coverage window crosses split boundaries,
    and purge buffer of >= 120 days is maintained.
    """
    df = pd.read_csv(TRAINING_DATASET_CSV)
    train_df, val_df, test_df, split_info = split_chronologically(df)

    # 1. Non-empty splits
    assert len(train_df) > 0
    assert len(val_df) > 0
    assert len(test_df) > 0

    # 2. Maximum end date of Train must be <= 2014-12-31
    train_start = pd.to_datetime(train_df["start_date"])
    train_end = train_start + pd.to_timedelta(train_df["duration_days"] - 1, unit="D")
    assert train_end.max() <= pd.Timestamp("2014-12-31")

    # 3. Validation must be strictly within 2015-01-01 and 2019-12-31
    val_start = pd.to_datetime(val_df["start_date"])
    val_end = val_start + pd.to_timedelta(val_df["duration_days"] - 1, unit="D")
    assert val_start.min() >= pd.Timestamp("2015-01-01")
    assert val_end.max() <= pd.Timestamp("2019-12-31")

    # 4. Test must be strictly within 2020-01-01 and 2024-12-31
    test_start = pd.to_datetime(test_df["start_date"])
    test_end = test_start + pd.to_timedelta(test_df["duration_days"] - 1, unit="D")
    assert test_start.min() >= pd.Timestamp("2020-01-01")
    assert test_end.max() <= pd.Timestamp("2024-12-31")

    # 5. Purge buffer: latest train start to earliest val start >= 120 days
    purge_gap = (val_start.min() - train_start.max()).days
    assert purge_gap >= 120, f"Purge gap was {purge_gap} days, expected >= 120 days"


def test_models_predict_valid_probabilities():
    """Ensure both trained models output valid probabilities in [0.0, 1.0]."""
    for m_type in ["random_forest", "logistic_regression"]:
        predictor = RiskPredictor(model_type=m_type)
        query = {
            "latitude": 13.3379,
            "longitude": 77.1010,
            "start_date": "2024-06-15",
            "option_id": 5,
            "district": "Tumakuru",
        }
        res = predictor.predict_shortfall_probability(query)
        assert 0.0 <= res["shortfall_probability"] <= 1.0
        assert res["option_id"] == 5
        assert "disclaimer" in res


def test_recommendation_layer_ranking_and_disclaimer():
    """Ensure recommendation layer ranks all 12 options and attaches disclaimer."""
    profile = {
        "district": "Tumakuru",
        "crop": "Groundnut",
        "season": "Kharif",
        "sowing_date": "2026-06-15",
    }
    rec = recommend_policies(profile, top_k=3)

    assert len(rec["top_recommendations"]) == 3
    assert len(rec["all_ranked_options"]) == 12

    # Verify rank order
    top1 = rec["top_recommendations"][0]
    top2 = rec["top_recommendations"][1]
    assert top1["composite_score"] >= top2["composite_score"]
    assert "disclaimer" in rec
    assert "CRE" in rec["disclaimer"]
