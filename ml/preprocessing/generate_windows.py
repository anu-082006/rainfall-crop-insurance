"""
Coverage window generation module for fixed policy catalogue options (Options 1-12).
Calculates accumulated rainfall over exact [T, T + D - 1] windows.
Enforces strict inequality labeling (y = 1 if R < T, y = 0 if R >= T).
Any missing observation strictly invalidates the corresponding window.
"""

import argparse
from pathlib import Path
from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd

from ml.config import (
    CLEANED_RAINFALL_CSV,
    HISTORICAL_WINDOWS_CSV,
    POLICY_CATALOGUE,
    AGRICULTURAL_OPTIONS,
    VALID_DURATIONS,
)


def get_catalogue_options_by_duration() -> Dict[int, List[Dict[str, Any]]]:
    """
    Groups the 12 agricultural catalogue options by duration (30, 60, 90, 120 days).
    """
    options_by_duration: Dict[int, List[Dict[str, Any]]] = {d: [] for d in VALID_DURATIONS}
    for opt_id in AGRICULTURAL_OPTIONS:
        opt = POLICY_CATALOGUE[opt_id]
        dur = int(opt["duration_days"])
        options_by_duration[dur].append(opt)
    return options_by_duration


def generate_coverage_windows_for_location(
    loc_df: pd.DataFrame,
    options_by_duration: Dict[int, List[Dict[str, Any]]],
    step_days: int = 7,
    crop: str = "Groundnut",
) -> pd.DataFrame:
    """
    Generates historical coverage windows for a single location across all agricultural durations.
    Uses forward rolling sum with min_periods=D to enforce that any missing day invalidates the window.
    """
    loc_df = loc_df.sort_values("date").reset_index(drop=True)
    dates = pd.to_datetime(loc_df["date"])
    precip = loc_df["precipitation_mm"].values
    n = len(precip)

    loc_id = loc_df["location_id"].iloc[0]
    district = loc_df["district"].iloc[0]
    lat = loc_df["latitude"].iloc[0]
    lon = loc_df["longitude"].iloc[0]
    model = loc_df["model"].iloc[0] if "model" in loc_df.columns else "era5"

    records: List[Dict[str, Any]] = []

    for dur in VALID_DURATIONS:
        opts = options_by_duration[dur]
        if n < dur:
            continue

        # Forward rolling sum over [T, T + D - 1]
        precip_series = pd.Series(precip)
        rolling_sums = precip_series.rolling(window=dur, min_periods=dur).sum().shift(-(dur - 1)).values

        # Sample indices based on step_days
        valid_indices = range(0, n - dur + 1, step_days)

        for i in valid_indices:
            r_total = rolling_sums[i]
            if np.isnan(r_total):
                # Missing observation inside window invalidates window
                continue

            start_dt = dates.iloc[i]
            start_date_str = start_dt.strftime("%Y-%m-%d")
            start_month = start_dt.month
            start_doy = start_dt.dayofyear
            # Round total rainfall to 2 decimal places to prevent float precision drift
            r_total_clean = round(float(r_total), 2)

            for opt in opts:
                threshold = float(opt["threshold_mm"])
                # Strict contract rule: if (rainfallMm >= thresholdMm) revert NotEligible
                # Therefore shortfall_label = 1 if R < T, else 0
                shortfall = 1 if r_total_clean < threshold else 0

                records.append({
                    "location_id": loc_id,
                    "district": district,
                    "latitude": lat,
                    "longitude": lon,
                    "start_date": start_date_str,
                    "start_month": start_month,
                    "start_day_of_year": start_doy,
                    "duration_days": dur,
                    "threshold_mm": threshold,
                    "option_id": opt["option_id"],
                    "policy_level": opt["level"],
                    "rainfall_total_mm": r_total_clean,
                    "shortfall_label": shortfall,
                    "crop": crop,
                    "source_model": model,
                })

    return pd.DataFrame(records)


def generate_all_coverage_windows(
    cleaned_csv_path: Optional[Path] = None,
    output_csv_path: Optional[Path] = None,
    step_days: int = 7,
    crop: str = "Groundnut",
) -> pd.DataFrame:
    """
    Generates coverage windows for all locations across Karnataka.
    """
    cleaned_path = cleaned_csv_path or CLEANED_RAINFALL_CSV
    out_path = output_csv_path or HISTORICAL_WINDOWS_CSV

    if not cleaned_path.exists():
        raise FileNotFoundError(f"Cleaned rainfall data not found at {cleaned_path}")

    print(f"Loading cleaned rainfall data from {cleaned_path}...")
    df = pd.read_csv(cleaned_path)

    options_by_duration = get_catalogue_options_by_duration()
    locations = df["location_id"].unique()

    print(f"Generating coverage windows for {len(locations)} locations (step_days={step_days})...")
    location_dfs: List[pd.DataFrame] = []

    for loc_id in locations:
        loc_df = df[df["location_id"] == loc_id]
        loc_windows = generate_coverage_windows_for_location(
            loc_df=loc_df,
            options_by_duration=options_by_duration,
            step_days=step_days,
            crop=crop,
        )
        location_dfs.append(loc_windows)
        print(f"  {loc_id}: generated {len(loc_windows):,} windows")

    all_windows_df = pd.concat(location_dfs, ignore_index=True)
    all_windows_df.to_csv(out_path, index=False)
    print(f"\nSaved {len(all_windows_df):,} total coverage windows to {out_path}")

    # Summary of class distribution
    shortfall_count = int(all_windows_df["shortfall_label"].sum())
    non_shortfall_count = len(all_windows_df) - shortfall_count
    shortfall_pct = (shortfall_count / len(all_windows_df)) * 100
    print(f"Class distribution: Shortfall (1)={shortfall_count:,} ({shortfall_pct:.1f}%), Normal (0)={non_shortfall_count:,} ({100 - shortfall_pct:.1f}%)")

    return all_windows_df


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate historical coverage windows for policy catalogue.")
    parser.add_argument("--step-days", type=int, default=7, help="Step days between start dates (default: 7 for weekly resolution)")
    parser.add_argument("--crop", type=str, default="Groundnut", help="Crop name (default: Groundnut)")
    args = parser.parse_args()

    generate_all_coverage_windows(step_days=args.step_days, crop=args.crop)
