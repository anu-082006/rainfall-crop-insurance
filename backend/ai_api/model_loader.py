"""model_loader.py

Artifact loading and inference adapter for AgriShield AI Service.
Adheres to RPD Version 2.0 Section 5.1 (M3-AI01, M3-AI03):
- Loads Member 2's trained Random Forest model and climatology reference once at startup.
- If real trained model files are not found or fail to load, initializes a clearly labelled
  MockModelAdapter conforming to the Appendix A.4 specification.
- Does not pretend mock predictions are real ML outputs.
- Captures and logs scikit-learn InconsistentVersionWarning without silent suppression.
"""

import os
import sys
import logging
import warnings
from pathlib import Path
from typing import Dict, Any, Optional

logger = logging.getLogger("agrishield_ai_service.model_loader")

# Path discovery for Person 2's ML repository
BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent.parent  # C:\MyFiles\Projects\Rainfall_Crop_Insurance

# Handle discovery whether running inside team_repo or from workspace root
if (PROJECT_ROOT / "ml").exists() and (PROJECT_ROOT / "models").exists():
    TEAM_REPO_DIR = PROJECT_ROOT
elif (PROJECT_ROOT / "team_repo" / "ml").exists():
    TEAM_REPO_DIR = PROJECT_ROOT / "team_repo"
else:
    TEAM_REPO_DIR = PROJECT_ROOT

if TEAM_REPO_DIR.exists() and str(TEAM_REPO_DIR) not in sys.path:
    sys.path.insert(0, str(TEAM_REPO_DIR))

# Try importing canonical model path from Person 2's ml.config
try:
    from ml.config import RANDOM_FOREST_MODEL_PATH as CANONICAL_RF_PATH
except ImportError:
    CANONICAL_RF_PATH = None

# Default metadata dictionaries
PRODUCTION_METADATA: Dict[str, Any] = {
    "model_name": "random_forest",
    "model_version": "1.0-production",
    "trained_on_range": "1950-01-01 to 2024-12-31",
    "mode": "production",
}

MOCK_METADATA: Dict[str, Any] = {
    "model_name": "logistic_regression",
    "model_version": "0.1-mock",
    "trained_on_range": "2000-01-01 to 2023-12-31",
    "mode": "mock",
}

MODEL_METADATA: Dict[str, Any] = dict(MOCK_METADATA)

# Authoritative agricultural crop stage table (days after sowing)
# Used to determine critical growth stages and align coverage duration
CROP_STAGE_TABLE: Dict[str, Dict[str, Any]] = {
    "groundnut": {
        "critical_stage": "pod-filling stage",
        "critical_window_start_day": 35,
        "critical_duration_days": 30,
        "water_deficit_sensitivity": "high",
        "baseline_deficit_risk": 0.64,
    },
    "rice": {
        "critical_stage": "panicle initiation & flowering stage",
        "critical_window_start_day": 40,
        "critical_duration_days": 45,
        "water_deficit_sensitivity": "severe",
        "baseline_deficit_risk": 0.58,
    },
    "wheat": {
        "critical_stage": "crown root initiation & heading stage",
        "critical_window_start_day": 25,
        "critical_duration_days": 30,
        "water_deficit_sensitivity": "moderate",
        "baseline_deficit_risk": 0.52,
    },
    "maize": {
        "critical_stage": "silking and tasseling stage",
        "critical_window_start_day": 30,
        "critical_duration_days": 30,
        "water_deficit_sensitivity": "high",
        "baseline_deficit_risk": 0.61,
    },
    "cotton": {
        "critical_stage": "boll development stage",
        "critical_window_start_day": 50,
        "critical_duration_days": 60,
        "water_deficit_sensitivity": "high",
        "baseline_deficit_risk": 0.55,
    },
    "sorghum": {
        "critical_stage": "grain filling stage",
        "critical_window_start_day": 35,
        "critical_duration_days": 30,
        "water_deficit_sensitivity": "moderate",
        "baseline_deficit_risk": 0.48,
    },
    "soybean": {
        "critical_stage": "pod development and seed filling stage",
        "critical_window_start_day": 30,
        "critical_duration_days": 45,
        "water_deficit_sensitivity": "high",
        "baseline_deficit_risk": 0.60,
    },
    "sunflower": {
        "critical_stage": "ray floret opening & seed filling stage",
        "critical_window_start_day": 30,
        "critical_duration_days": 30,
        "water_deficit_sensitivity": "moderate",
        "baseline_deficit_risk": 0.50,
    },
}


class MockModelAdapter:
    """Mock inference adapter used for crop fallbacks or when ML artifacts are unavailable."""

    def __init__(self):
        self.is_mock = True
        self.metadata = MOCK_METADATA

    def predict_probability_below_trigger(
        self,
        crop: str,
        duration_seconds: int,
        trigger_mm: int,
        observed_recent_rainfall: Optional[float] = None,
    ) -> float:
        """Estimates probability that rainfall will be strictly below trigger threshold."""
        crop_data = CROP_STAGE_TABLE.get(crop.lower(), {})
        baseline = crop_data.get("baseline_deficit_risk", 0.50)

        duration_days = duration_seconds / 86400.0
        expected_seasonal_rate = 3.5  # mm / day
        expected_total = expected_seasonal_rate * duration_days

        if expected_total <= 0:
            return 0.50

        ratio = trigger_mm / expected_total
        prob = baseline * (1.2 - 0.4 * min(max(ratio, 0.2), 1.8))

        if observed_recent_rainfall is not None and observed_recent_rainfall < 20:
            prob += 0.05

        return round(float(min(max(prob, 0.05), 0.95)), 2)


class ArtifactManager:
    """Singleton managing model loading, version tracking, and inference access."""

    _risk_predictor: Optional[Any] = None
    _mock_model: Optional[MockModelAdapter] = None
    _crop_table_loaded: bool = False
    _model_loaded: bool = False
    _version_warnings: list = []

    @classmethod
    def load(cls, force: bool = False):
        """Loads Person 2's RiskPredictor if present; otherwise initializes MockModelAdapter.
        
        Captures and documents scikit-learn version differences explicitly.
        Caches singleton instance so repetitive calls return instantaneously.
        """
        global MODEL_METADATA

        if cls._model_loaded and cls._risk_predictor is not None and not force:
            return

        cls._mock_model = MockModelAdapter()
        cls._crop_table_loaded = True
        cls._version_warnings.clear()

        # Resolve model artifact path (prefer canonical ml/config path)
        model_artifact = None
        if CANONICAL_RF_PATH and CANONICAL_RF_PATH.exists():
            model_artifact = CANONICAL_RF_PATH
        elif (TEAM_REPO_DIR / "models" / "random_forest.joblib").exists():
            model_artifact = TEAM_REPO_DIR / "models" / "random_forest.joblib"
        elif (PROJECT_ROOT / "models" / "random_forest.joblib").exists():
            model_artifact = PROJECT_ROOT / "models" / "random_forest.joblib"

        if model_artifact and model_artifact.exists():
            try:
                from sklearn.exceptions import InconsistentVersionWarning

                # Capture scikit-learn version warnings during unpickling
                with warnings.catch_warnings(record=True) as captured:
                    warnings.simplefilter("always", InconsistentVersionWarning)

                    # Import Person 2's RiskPredictor
                    from ml.inference.predict_policy_risk import RiskPredictor

                    predictor = RiskPredictor(model_type="random_forest")

                    seen_warnings = set()
                    for w in captured:
                        msg = str(w.message).strip()
                        if msg not in seen_warnings:
                            seen_warnings.add(msg)
                            cls._version_warnings.append(msg)
                            logger.warning(
                                "[ModelLoader] Scikit-learn version advisory: %s", msg
                            )

                cls._risk_predictor = predictor
                cls._model_loaded = True
                MODEL_METADATA.update(PRODUCTION_METADATA)
                logger.info(
                    "[ModelLoader] Successfully loaded Person 2 Random Forest model from %s",
                    model_artifact,
                )
                return
            except Exception as err:
                logger.error(
                    "[ModelLoader] Failed loading real ML model from %s: %s. Falling back to mock adapter.",
                    model_artifact,
                    err,
                    exc_info=True,
                )

        # Fallback to mock adapter
        cls._risk_predictor = None
        cls._model_loaded = True
        MODEL_METADATA.update(MOCK_METADATA)
        logger.info("[ModelLoader] Using MockModelAdapter (mode=mock).")

    @classmethod
    def get_risk_predictor(cls) -> Optional[Any]:
        """Returns the loaded RiskPredictor instance, or None if unavailable."""
        if not cls._model_loaded:
            cls.load()
        return cls._risk_predictor

    @classmethod
    def get_mock_model(cls) -> MockModelAdapter:
        """Returns the fallback MockModelAdapter instance."""
        if cls._mock_model is None:
            cls._mock_model = MockModelAdapter()
        return cls._mock_model

    @classmethod
    def get_model(cls) -> Any:
        """Returns the active model adapter (real predictor or mock)."""
        if not cls._model_loaded:
            cls.load()
        return cls._risk_predictor if cls._risk_predictor is not None else cls._mock_model

    @classmethod
    def is_production_ready(cls) -> bool:
        """Returns True if Person 2's actual ML model is loaded and operational."""
        return cls._risk_predictor is not None

    @classmethod
    def get_crop_table(cls) -> Dict[str, Dict[str, Any]]:
        return CROP_STAGE_TABLE

    @classmethod
    def is_ready(cls) -> bool:
        return cls._model_loaded and cls._crop_table_loaded

    @classmethod
    def get_version_warnings(cls) -> list:
        return list(cls._version_warnings)


# Initialise on import
ArtifactManager.load()
