"""
Data validation module for historical daily rainfall dataset.
Performs integrity checks: completeness, duplicates, non-negativity, finiteness, and coordinate bounds.
"""

from typing import Dict, Any, Tuple
import pandas as pd
import numpy as np

from ml.config import KARNATAKA_BOUNDS, HISTORICAL_START_DATE, HISTORICAL_END_DATE


def validate_raw_rainfall(df: pd.DataFrame) -> Tuple[bool, Dict[str, Any]]:
    """
    Validates the raw rainfall DataFrame.
    Returns (is_valid, validation_report).
    """
    required_cols = {"date", "location_id", "district", "latitude", "longitude", "precipitation_mm", "source", "model"}
    if not required_cols.issubset(df.columns):
        missing = required_cols - set(df.columns)
        return False, {"error": f"Missing columns: {missing}"}

    total_records = len(df)
    locations = df["location_id"].unique().tolist()
    num_locations = len(locations)

    # 1. Duplicates check
    duplicate_rows = df.duplicated(subset=["location_id", "date"], keep=False)
    duplicate_count = int(duplicate_rows.sum())

    # 2. Missing values check
    missing_precip_count = int(df["precipitation_mm"].isna().sum())
    missing_date_count = int(df["date"].isna().sum())
    missing_pct = float((missing_precip_count / total_records) * 100) if total_records > 0 else 0.0

    # 3. Negative values check
    negative_mask = df["precipitation_mm"] < 0
    negative_count = int(negative_mask.sum())

    # 4. Non-finite values check
    non_finite_mask = ~np.isfinite(df["precipitation_mm"].dropna())
    non_finite_count = int(non_finite_mask.sum())

    # 5. Coordinate bounds check
    invalid_coords_mask = (
        (df["latitude"] < KARNATAKA_BOUNDS["lat_min"]) |
        (df["latitude"] > KARNATAKA_BOUNDS["lat_max"]) |
        (df["longitude"] < KARNATAKA_BOUNDS["lon_min"]) |
        (df["longitude"] > KARNATAKA_BOUNDS["lon_max"])
    )
    invalid_coords_count = int(invalid_coords_mask.sum())

    # 6. Continuous date coverage check per location
    expected_dates = pd.date_range(start=HISTORICAL_START_DATE, end=HISTORICAL_END_DATE, freq="D")
    expected_days = len(expected_dates)

    date_coverage_per_location = {}
    missing_dates_per_location = {}

    for loc in locations:
        loc_dates = pd.to_datetime(df[df["location_id"] == loc]["date"])
        actual_days = len(loc_dates)
        unique_days = loc_dates.nunique()
        date_coverage_per_location[loc] = {
            "record_count": actual_days,
            "unique_days": unique_days,
            "expected_days": expected_days,
            "min_date": str(loc_dates.min().date()) if not loc_dates.empty else None,
            "max_date": str(loc_dates.max().date()) if not loc_dates.empty else None,
        }
        if unique_days != expected_days:
            missing_dates_per_location[loc] = expected_days - unique_days

    is_valid = (
        duplicate_count == 0 and
        negative_count == 0 and
        non_finite_count == 0 and
        invalid_coords_count == 0 and
        len(missing_dates_per_location) == 0
    )

    report = {
        "is_valid": is_valid,
        "total_records": total_records,
        "number_of_locations": num_locations,
        "duplicate_count": duplicate_count,
        "missing_precip_count": missing_precip_count,
        "missing_precip_percentage": missing_pct,
        "negative_count": negative_count,
        "non_finite_count": non_finite_count,
        "invalid_coordinates_count": invalid_coords_count,
        "date_coverage_per_location": date_coverage_per_location,
        "locations_with_missing_dates": missing_dates_per_location,
    }

    return is_valid, report
