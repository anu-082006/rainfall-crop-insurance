"""
Configuration module for Karnataka Rainfall-Risk ML Pipeline.
Authoritative source for policy catalogue options, split dates, and file paths.
"""

from pathlib import Path
from typing import Dict, Any, List

# Base Directories
PROJECT_ROOT = Path(__file__).resolve().parent.parent
ML_DIR = PROJECT_ROOT / "ml"
DATA_DIR = PROJECT_ROOT / "data"
RAW_DATA_DIR = DATA_DIR / "raw"
PROCESSED_DATA_DIR = DATA_DIR / "processed"
REFERENCE_DATA_DIR = DATA_DIR / "reference"
FIXTURES_DIR = REFERENCE_DATA_DIR / "fixtures"
MODELS_DIR = PROJECT_ROOT / "models"
REPORTS_DIR = PROJECT_ROOT / "reports"
RAW_CACHE_DIR = RAW_DATA_DIR / "cache"

# Ensure runtime directories exist
for directory in [RAW_DATA_DIR, PROCESSED_DATA_DIR, REFERENCE_DATA_DIR, FIXTURES_DIR, MODELS_DIR, REPORTS_DIR, RAW_CACHE_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

# File Paths
LOCATIONS_CSV = REFERENCE_DATA_DIR / "karnataka_locations.csv"
CROP_CALENDAR_CSV = REFERENCE_DATA_DIR / "crop_calendar.csv"
RAW_RAINFALL_CSV = RAW_DATA_DIR / "karnataka_daily_rainfall.csv"
CLEANED_RAINFALL_CSV = PROCESSED_DATA_DIR / "cleaned_rainfall.csv"
HISTORICAL_WINDOWS_CSV = PROCESSED_DATA_DIR / "historical_coverage_windows.csv"
TRAINING_DATASET_CSV = PROCESSED_DATA_DIR / "model_training_dataset.csv"
SAMPLE_FIXTURE_CSV = FIXTURES_DIR / "sample_rainfall.csv"
DATA_QUALITY_REPORT_JSON = REPORTS_DIR / "data_quality_report.json"
MODEL_COMPARISON_JSON = REPORTS_DIR / "model_comparison.json"
FEATURE_IMPORTANCE_JSON = REPORTS_DIR / "feature_importance.json"

LOGISTIC_REGRESSION_MODEL_PATH = MODELS_DIR / "logistic_regression.joblib"
RANDOM_FOREST_MODEL_PATH = MODELS_DIR / "random_forest.joblib"

# Karnataka Geographic Bounding Box
KARNATAKA_BOUNDS = {
    "lat_min": 11.5,
    "lat_max": 18.5,
    "lon_min": 74.0,
    "lon_max": 78.6,
}

# Weather Data Parameters
WEATHER_API_URL = "https://archive-api.open-meteo.com/v1/archive"
REANALYSIS_MODEL = "era5"  # ECMWF ERA5 reanalysis provides continuous 1950-2024 daily precipitation
HISTORICAL_START_DATE = "1950-01-01"
HISTORICAL_END_DATE = "2024-12-31"

# Authoritative Contract Policy Catalogue (from script/PolicyCatalogue.sol)
# Option 0 is Demo (2 hours, 1 mm, 10 RTT) and is strictly EXCLUDED from agricultural training.
POLICY_CATALOGUE: Dict[int, Dict[str, Any]] = {
    0: {
        "option_id": 0,
        "name": "Demo Option",
        "level": "demo",
        "duration_days": 0.0833, # 2 hours
        "duration_hours": 2,
        "threshold_mm": 1,
        "payout_rtt": 10,
        "is_agricultural": False
    },
    # Options 1-4: Severe (1 mm/day trigger, 3 RTT/day payout)
    1: {"option_id": 1, "name": "Severe 30-Day", "level": "severe", "duration_days": 30, "threshold_mm": 30, "payout_rtt": 90, "is_agricultural": True},
    2: {"option_id": 2, "name": "Severe 60-Day", "level": "severe", "duration_days": 60, "threshold_mm": 60, "payout_rtt": 180, "is_agricultural": True},
    3: {"option_id": 3, "name": "Severe 90-Day", "level": "severe", "duration_days": 90, "threshold_mm": 90, "payout_rtt": 270, "is_agricultural": True},
    4: {"option_id": 4, "name": "Severe 120-Day", "level": "severe", "duration_days": 120, "threshold_mm": 120, "payout_rtt": 360, "is_agricultural": True},
    # Options 5-8: Moderate (2 mm/day trigger, 2 RTT/day payout)
    5: {"option_id": 5, "name": "Moderate 30-Day", "level": "moderate", "duration_days": 30, "threshold_mm": 60, "payout_rtt": 60, "is_agricultural": True},
    6: {"option_id": 6, "name": "Moderate 60-Day", "level": "moderate", "duration_days": 60, "threshold_mm": 120, "payout_rtt": 120, "is_agricultural": True},
    7: {"option_id": 7, "name": "Moderate 90-Day", "level": "moderate", "duration_days": 90, "threshold_mm": 180, "payout_rtt": 180, "is_agricultural": True},
    8: {"option_id": 8, "name": "Moderate 120-Day", "level": "moderate", "duration_days": 120, "threshold_mm": 240, "payout_rtt": 240, "is_agricultural": True},
    # Options 9-12: Mild (3 mm/day trigger, 1 RTT/day payout)
    9: {"option_id": 9, "name": "Mild 30-Day", "level": "mild", "duration_days": 30, "threshold_mm": 90, "payout_rtt": 30, "is_agricultural": True},
    10: {"option_id": 10, "name": "Mild 60-Day", "level": "mild", "duration_days": 60, "threshold_mm": 180, "payout_rtt": 60, "is_agricultural": True},
    11: {"option_id": 11, "name": "Mild 90-Day", "level": "mild", "duration_days": 90, "threshold_mm": 270, "payout_rtt": 90, "is_agricultural": True},
    12: {"option_id": 12, "name": "Mild 120-Day", "level": "mild", "duration_days": 120, "threshold_mm": 360, "payout_rtt": 120, "is_agricultural": True},
}

AGRICULTURAL_OPTIONS: List[int] = [opt_id for opt_id, meta in POLICY_CATALOGUE.items() if meta["is_agricultural"]]
VALID_DURATIONS: List[int] = [30, 60, 90, 120]

# Chronological Split Settings
# Training: coverage windows strictly ending on or before 2014-12-31
# Validation: coverage windows strictly contained in 2015-01-01 to 2019-12-31
# Testing: coverage windows strictly contained in 2020-01-01 to 2024-12-31
# Purge period: >= 120 days buffer around boundaries ensures no overlapping window leaks across splits.
SPLIT_CONFIG = {
    "train_end_year": 2014,
    "val_start_year": 2015,
    "val_end_year": 2019,
    "test_start_year": 2020,
    "test_end_year": 2024,
    "purge_buffer_days": 120
}

RANDOM_SEED = 42
