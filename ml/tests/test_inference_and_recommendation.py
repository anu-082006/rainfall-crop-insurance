"""
Deterministic unit tests for inference date handling, antecedent validation,
unsupported crops/locations, and crop-stage overlap calculations.
Uses zero external network calls.
"""

from datetime import datetime, timedelta
import pytest

from ml.inference.predict_policy_risk import (
    RiskPredictor,
    recommend_policies,
    UnsupportedInferenceDateError,
    UnsupportedCropError,
    UnsupportedLocationError,
    InvalidFeatureValueError,
)


def test_inference_rejects_future_dates_when_antecedent_missing():
    """
    In standard mode, when start_date is beyond historical data (2024-12-31)
    and antecedent rainfall features are missing, UnsupportedInferenceDateError must be raised.
    Never silently substitute arbitrary numbers!
    """
    predictor = RiskPredictor(model_type="random_forest")
    future_query = {
        "latitude": 13.3379,
        "longitude": 77.1010,
        "district": "Tumakuru",
        "start_date": "2026-06-15",
        "option_id": 1,
    }
    with pytest.raises(UnsupportedInferenceDateError) as exc_info:
        predictor.predict_shortfall_probability(future_query, mode="standard")
    assert "2026-06-15" in str(exc_info.value)
    assert "antecedent observations" in str(exc_info.value).lower()


def test_inference_accepts_future_dates_with_explicit_antecedent_features():
    """
    When the caller explicitly provides validated recent antecedent observations,
    future inference succeeds and returns a valid probability in [0, 1].
    """
    predictor = RiskPredictor(model_type="random_forest")
    query_with_antecedent = {
        "latitude": 13.3379,
        "longitude": 77.1010,
        "district": "Tumakuru",
        "start_date": "2026-06-15",
        "option_id": 1,
        "rainfall_prev_30d": 35.0,
        "rainfall_prev_90d": 120.0,
        "rainfall_prev_365d": 680.0,
    }
    res = predictor.predict_shortfall_probability(query_with_antecedent, mode="standard")
    assert 0.0 <= res["shortfall_probability"] <= 1.0
    assert res["features_used"]["rainfall_prev_30d_mm"] == 35.0
    assert res["features_used"]["rainfall_prev_90d_mm"] == 120.0
    assert res["features_used"]["rainfall_prev_365d_mm"] == 680.0


def test_inference_rejects_negative_rainfall():
    """Verify that negative rainfall values are rejected immediately."""
    predictor = RiskPredictor(model_type="random_forest")
    invalid_query = {
        "latitude": 13.3379,
        "longitude": 77.1010,
        "district": "Tumakuru",
        "start_date": "2026-06-15",
        "option_id": 1,
        "rainfall_prev_30d": -10.0,
        "rainfall_prev_90d": 50.0,
        "rainfall_prev_365d": 200.0,
    }
    with pytest.raises(InvalidFeatureValueError):
        predictor.predict_shortfall_probability(invalid_query, mode="standard")


def test_climatology_only_mode_provides_explicit_notice():
    """
    When mode='climatology_only', future date inference succeeds using empirical climatology,
    and returns an explicit warning/notice in the output payload.
    """
    predictor = RiskPredictor(model_type="random_forest")
    future_query = {
        "latitude": 13.3379,
        "longitude": 77.1010,
        "district": "Tumakuru",
        "start_date": "2026-06-15",
        "option_id": 5,
    }
    res = predictor.predict_shortfall_probability(future_query, mode="climatology_only")
    assert 0.0 <= res["shortfall_probability"] <= 1.0
    assert "warning" in res
    assert "climatology_only" in res["warning"]


def test_unsupported_crop_rejection():
    """Ensure that requesting an unsupported crop raises UnsupportedCropError."""
    with pytest.raises(UnsupportedCropError) as exc_info:
        recommend_policies({
            "district": "Tumakuru",
            "crop": "Pineapple",
            "sowing_date": "2024-06-15"
        })
    assert "Pineapple" in str(exc_info.value)


def test_unsupported_location_rejection():
    """Ensure coordinates outside Karnataka are rejected."""
    predictor = RiskPredictor(model_type="random_forest")
    delhi_query = {
        "latitude": 28.6139,
        "longitude": 77.2090,
        "start_date": "2024-06-15",
        "option_id": 1,
    }
    with pytest.raises(UnsupportedLocationError):
        predictor.predict_shortfall_probability(delhi_query)


def test_crop_stage_overlap_calculation():
    """
    Agronomic verification:
    Groundnut sown June 15:
    Critical pegging phase is 40-70 DAS -> July 25 to August 24 (31 days).
    - 30-day policy (June 15 to July 14): 0% overlap with critical stage!
    - 90-day policy (June 15 to September 12): 100% overlap with critical stage!
    """
    rec = recommend_policies({
        "district": "Tumakuru",
        "crop": "Groundnut",
        "sowing_date": "2024-06-15",
        "candidate_start_date": "2024-06-15"
    }, top_k=12)

    options = {item["duration_days"]: item for item in rec["all_ranked_options"]}
    opt_30d = [item for item in rec["all_ranked_options"] if item["duration_days"] == 30][0]
    opt_90d = [item for item in rec["all_ranked_options"] if item["duration_days"] == 90][0]

    assert opt_30d["critical_stage_overlap_pct"] == 0.0, "30-day policy starting on sowing date cannot cover 40-70 DAS!"
    assert opt_90d["critical_stage_overlap_pct"] == 100.0, "90-day policy starting on sowing date must cover 100% of 40-70 DAS!"
