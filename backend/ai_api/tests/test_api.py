"""test_api.py

Comprehensive test suite for AgriShield AI Recommendation Service.
Adheres to RPD Version 2.0 Section 5.1 (M3-AI01 through M3-AI12), Appendix A.4,
and Phase 3 integration requirements:
- M3-AI01: GET /health returns status and verifies loaded artifacts.
- M3-AI02 & M3-AI08: POST /recommend generates recommendation adhering to Appendix A.4 schema.
- Actual Groundnut model integration (Person 2's Random Forest classifier).
- Other-crop fallback (rice, wheat, maize, etc., retaining advisory logic).
- Option 0 exclusion (2-hour Demo is NEVER applicable and NEVER recommended).
- Invalid input handling (lat/lon out of bounds, unsupported crops, empty options).
- Model unavailable fallback (graceful degradation when ML artifact is missing).
- Lifespan singleton initialization (loads model once during application startup).
- Response schema compatibility (preserves frontend contract).
"""

import sys
import os
import pytest
from pydantic import ValidationError

# Add parent directory to path so imports resolve cleanly
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app, health_check, recommend, swagger_ui_html, redoc_html, lifespan
from schemas import RecommendRequest, OptionInput, RecommendResponse
from weather_client import fetch_historical_rainfall
from model_loader import ArtifactManager, MODEL_METADATA, PRODUCTION_METADATA, MOCK_METADATA


def test_health_check_endpoint():
    """M3-AI01: GET /health returns service status and verifies loaded artifacts."""
    health = health_check()
    assert health.status == "healthy"
    assert health.model_loaded is True
    assert health.crop_table_loaded is True
    assert health.recommendation_rule_loaded is True
    assert health.model_name in ("random_forest", "logistic_regression")
    assert health.mode in ("production", "mock")


def test_actual_groundnut_model_integration():
    """Phase 3 Requirement 10: Tests real Random Forest model integration for Groundnut."""
    # Ensure real model is loaded
    ArtifactManager.load()
    if not ArtifactManager.is_production_ready():
        pytest.skip("Person 2's Random Forest model artifact not found.")

    req = RecommendRequest(
        latitude=13.3379,
        longitude=77.1010,
        crop="groundnut",
        sowing_date="2025-06-15",
        as_of_date="2025-06-15",
        options=[
            OptionInput(option_id=0, duration_seconds=7200, trigger_mm=1, payout=10),
            OptionInput(option_id=1, duration_seconds=2592000, trigger_mm=30, payout=90),
            OptionInput(option_id=3, duration_seconds=7776000, trigger_mm=90, payout=270),
            OptionInput(option_id=11, duration_seconds=7776000, trigger_mm=270, payout=90),
        ],
    )

    resp = recommend(req)

    # 1. Verify production metadata
    assert resp.model_name == "random_forest"
    assert resp.model_version == "1.0-production"
    assert resp.trained_on_range == "1950-01-01 to 2024-12-31"
    assert resp.advisory is True

    # 2. Verify Option 0 exclusion
    opt_0 = next(o for o in resp.options if o.option_id == 0)
    assert opt_0.applicable is False
    assert opt_0.probability_below_trigger is None
    assert "too short" in (opt_0.reason or "").lower()

    # 3. Verify real probabilities for seasonal options
    opt_3 = next(o for o in resp.options if o.option_id == 3)
    assert opt_3.applicable is True
    assert opt_3.probability_below_trigger is not None
    assert 0.0 <= opt_3.probability_below_trigger <= 1.0

    opt_11 = next(o for o in resp.options if o.option_id == 11)
    assert opt_11.applicable is True
    assert opt_11.probability_below_trigger is not None
    assert 0.0 <= opt_11.probability_below_trigger <= 1.0

    # 4. Recommended option is selected from applicable options and is not Option 0
    assert resp.recommended_option_id in [1, 3, 11]
    assert resp.recommended_option_id != 0

    # 5. Suggested start date is aligned to Groundnut 40 DAS (2025-06-15 + 40d = 2025-07-25)
    assert resp.suggested_start_date == "2025-07-25"
    assert "Pegging and Pod Formation" in resp.rationale or "Groundnut" in resp.rationale


def test_other_crop_fallback():
    """Phase 3 Requirement 7 & 10: Other supported crops (e.g. rice) retain advisory fallback."""
    req = RecommendRequest(
        latitude=16.30,
        longitude=80.43,
        crop="rice",
        sowing_date="2026-06-01",
        options=[
            OptionInput(option_id=0, duration_seconds=7200, trigger_mm=1, payout=10),
            OptionInput(option_id=1, duration_seconds=2592000, trigger_mm=30, payout=90),
            OptionInput(option_id=2, duration_seconds=5184000, trigger_mm=60, payout=180),
        ],
    )

    resp = recommend(req)

    # Uses fallback metadata
    assert resp.model_name == "logistic_regression"
    assert resp.model_version == "0.1-mock"
    assert resp.advisory is True
    assert resp.recommended_option_id in [1, 2]
    assert resp.recommended_option_id != 0
    assert "panicle initiation" in resp.rationale.lower()


def test_option_zero_never_recommended():
    """M3-AI06: Option 0 (2-hour Demo) is NEVER selected as the recommended option."""
    for crop in ["groundnut", "maize", "cotton"]:
        req = RecommendRequest(
            latitude=13.3379,
            longitude=77.1010,
            crop=crop,
            sowing_date="2025-06-15",
            options=[
                OptionInput(option_id=0, duration_seconds=7200, trigger_mm=1, payout=10),
                OptionInput(option_id=5, duration_seconds=2592000, trigger_mm=60, payout=60),
            ],
        )
        resp = recommend(req)
        assert resp.recommended_option_id != 0
        assert resp.recommended_option_id == 5
        opt_0 = next(o for o in resp.options if o.option_id == 0)
        assert opt_0.applicable is False


def test_validation_latitude_out_of_bounds():
    """M3-AI09: Rejects latitude > 90 with ValidationError."""
    with pytest.raises(ValidationError):
        RecommendRequest(
            latitude=105.0,
            longitude=77.0,
            crop="wheat",
            sowing_date="2026-10-01",
            options=[OptionInput(option_id=1, duration_seconds=2592000, trigger_mm=30, payout=50)],
        )


def test_validation_longitude_out_of_bounds():
    """M3-AI09: Rejects longitude < -180 with ValidationError."""
    with pytest.raises(ValidationError):
        RecommendRequest(
            latitude=20.0,
            longitude=-195.0,
            crop="wheat",
            sowing_date="2026-10-01",
            options=[OptionInput(option_id=1, duration_seconds=2592000, trigger_mm=30, payout=50)],
        )


def test_validation_unsupported_crop():
    """M3-AI09 / Phase 3: Rejects unsupported crops with ValidationError."""
    with pytest.raises(ValidationError) as exc_info:
        RecommendRequest(
            latitude=12.97,
            longitude=77.59,
            crop="papaya",
            sowing_date="2026-07-10",
            options=[OptionInput(option_id=1, duration_seconds=2592000, trigger_mm=30, payout=50)],
        )
    assert "unsupported crop" in str(exc_info.value).lower()


def test_validation_empty_options_list():
    """M3-AI09: Rejects empty options list with ValidationError."""
    with pytest.raises(ValidationError):
        RecommendRequest(
            latitude=12.97,
            longitude=77.59,
            crop="wheat",
            sowing_date="2026-10-01",
            options=[],
        )


def test_model_unavailable_fallback():
    """Phase 3 Requirement 8 & 10: Gracefully falls back to mock advisory if model is unavailable."""
    original_predictor = ArtifactManager._risk_predictor
    try:
        # Simulate model being unavailable
        ArtifactManager._risk_predictor = None

        req = RecommendRequest(
            latitude=12.97,
            longitude=77.59,
            crop="groundnut",
            sowing_date="2026-07-10",
            as_of_date="2026-07-25",
            options=[
                OptionInput(option_id=0, duration_seconds=7200, trigger_mm=1, payout=10),
                OptionInput(option_id=5, duration_seconds=2592000, trigger_mm=60, payout=60),
            ],
        )

        resp = recommend(req)
        assert resp.recommended_option_id == 5
        assert resp.model_name == "logistic_regression"
        assert resp.model_version == "0.1-mock"
        assert resp.advisory is True
    finally:
        ArtifactManager._risk_predictor = original_predictor


def test_lifespan_singleton_initialization():
    """Phase 3 Requirement 5 & 10: Verifies lifespan configuration and singleton model initialization."""
    # 1. Verify lifespan handler is mounted on app
    assert app.router.lifespan_context is not None

    # 2. Verify model was initialized into singleton ArtifactManager
    assert ArtifactManager.is_ready() is True
    assert ArtifactManager.is_production_ready() is True

    # 3. Verify RiskPredictor singleton identity (not reloaded on demand)
    p1 = ArtifactManager.get_risk_predictor()
    p2 = ArtifactManager.get_risk_predictor()
    assert p1 is p2, "RiskPredictor must be a singleton instance"


def test_response_schema_compatibility():
    """Phase 3 Requirement 8 & 10: Validates complete RecommendResponse schema compatibility."""
    req = RecommendRequest(
        latitude=13.3379,
        longitude=77.1010,
        crop="groundnut",
        sowing_date="2025-06-15",
        options=[
            OptionInput(option_id=0, duration_seconds=7200, trigger_mm=1, payout=10),
            OptionInput(option_id=5, duration_seconds=2592000, trigger_mm=60, payout=60),
        ],
    )
    resp = recommend(req)
    # Ensure Pydantic serialization and re-validation works without error
    data = resp.model_dump()
    revalidated = RecommendResponse.model_validate(data)
    assert revalidated.recommended_option_id == resp.recommended_option_id
    assert len(revalidated.options) == 2
    assert revalidated.advisory is True


def test_weather_client_fallback_resilience():
    """M3-AI11: Weather client gracefully returns baseline records when offline."""
    records = fetch_historical_rainfall(
        latitude=12.97,
        longitude=77.59,
        start_date="2026-01-01",
        end_date="2026-01-15",
        timeout=0.01,
    )
    assert isinstance(records, list)
    assert len(records) > 0
    assert all(isinstance(r, (int, float)) for r in records)


def test_cors_middleware_configured():
    """M3-AI10: Checks CORS middleware is configured for frontend origins."""
    from fastapi.middleware.cors import CORSMiddleware
    cors = any(
        isinstance(m, CORSMiddleware) or getattr(m, "cls", None) is CORSMiddleware
        for m in app.user_middleware
    )
    assert cors is True


def test_docs_and_openapi_endpoints():
    """Verifies that /docs, /redoc, and /openapi.json are enabled and operational."""
    schema = app.openapi()
    assert "paths" in schema
    assert "/health" in schema["paths"]
    assert "/recommend" in schema["paths"]
    assert "components" in schema
    assert "RecommendRequest" in schema["components"]["schemas"]
    assert "RecommendResponse" in schema["components"]["schemas"]

    docs_resp = swagger_ui_html()
    assert docs_resp.status_code == 200
    docs_html = docs_resp.body.decode()
    assert "swagger-ui" in docs_html
    assert "AgriShield" in docs_html
    assert "fallback-container" in docs_html

    redoc_resp = redoc_html()
    assert redoc_resp.status_code == 200
    redoc_html_content = redoc_resp.body.decode()
    assert "redoc-container" in redoc_html_content
