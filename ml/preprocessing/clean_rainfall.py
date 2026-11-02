"""
Data cleaning module for historical rainfall dataset.
Cleans raw observations, validates invariants, and saves processed data.
Enforces that missing observations are NEVER replaced with zero.
"""

import json
from pathlib import Path
from typing import Dict, Any, Optional
import pandas as pd

from ml.config import (
    RAW_RAINFALL_CSV,
    CLEANED_RAINFALL_CSV,
    DATA_QUALITY_REPORT_JSON,
)
from ml.data.validate_data import validate_raw_rainfall


def clean_rainfall_data(
    raw_csv_path: Optional[Path] = None,
    output_csv_path: Optional[Path] = None,
    report_json_path: Optional[Path] = None,
) -> pd.DataFrame:
    """
    Cleans raw rainfall observations and writes quality metrics.
    """
    raw_path = raw_csv_path or RAW_RAINFALL_CSV
    out_path = output_csv_path or CLEANED_RAINFALL_CSV
    report_path = report_json_path or DATA_QUALITY_REPORT_JSON

    if not raw_path.exists():
        raise FileNotFoundError(f"Raw rainfall data not found at {raw_path}. Run ml.data.download_rainfall first.")

    print(f"Reading raw rainfall dataset from {raw_path}...")
    df = pd.read_csv(raw_path)

    # 1. Validate raw data
    is_valid, validation_report = validate_raw_rainfall(df)
    print(f"Raw data validation status: is_valid={is_valid}")

    # 2. Format types and sort chronologically per location
    df["date"] = pd.to_datetime(df["date"]).dt.strftime("%Y-%m-%d")
    df["precipitation_mm"] = pd.to_numeric(df["precipitation_mm"], errors="coerce")

    # 3. Deduplication (keep first if any duplicates exist)
    initial_count = len(df)
    df = df.drop_duplicates(subset=["location_id", "date"], keep="first")
    dedup_removed = initial_count - len(df)

    # 4. Strict handling of invalid data
    # Note: Missing observations (NaN) are kept as NaN so window generation can invalidate them!
    # Non-negative check: reject any negative values
    invalid_negatives = df["precipitation_mm"] < 0
    if invalid_negatives.any():
        print(f"Warning: Dropping {invalid_negatives.sum()} negative rainfall records.")
        df = df[~invalid_negatives]

    # Sort strictly by location and date
    df = df.sort_values(by=["location_id", "date"]).reset_index(drop=True)

    # Save cleaned dataset
    df.to_csv(out_path, index=False)
    print(f"Saved cleaned dataset ({len(df):,} records) to {out_path}")

    # Save data quality report
    quality_report = {
        **validation_report,
        "cleaning_summary": {
            "initial_records": initial_count,
            "final_clean_records": len(df),
            "duplicates_removed": dedup_removed,
            "nan_observations_retained_for_window_invalidation": int(df["precipitation_mm"].isna().sum()),
        }
    }

    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(quality_report, f, indent=2)
    print(f"Saved data quality report to {report_path}")

    return df


if __name__ == "__main__":
    clean_rainfall_data()
