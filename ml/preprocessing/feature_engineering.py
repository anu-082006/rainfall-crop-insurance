"""
Feature engineering module for Karnataka Rainfall-Risk model.
Strictly causal pre-window features only (Zero target leakage, zero look-ahead bias).
Antecedent rainfall features end strictly on T - 1.
Historical climatological baselines are computed strictly using years prior to the candidate start year (y < Y).
"""

from pathlib import Path
from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd

from ml.config import (
    CLEANED_RAINFALL_CSV,
    HISTORICAL_WINDOWS_CSV,
    TRAINING_DATASET_CSV,
    LOCATIONS_CSV,
)


def compute_antecedent_rainfall_features(rainfall_df: pd.DataFrame) -> pd.DataFrame:
    """
    Computes rolling antecedent rainfall for [T - 30, T - 1], [T - 90, T - 1], and [T - 365, T - 1].
    Uses shift(1) to guarantee that rainfall on date T is never observed.
    """
    df = rainfall_df.sort_values(by=["location_id", "date"]).copy()
    df["date"] = pd.to_datetime(df["date"])

    antecedent_dfs = []

    for loc_id, group in df.groupby("location_id"):
        group = group.sort_values("date").reset_index(drop=True)
        precip = group["precipitation_mm"]

        # Shift by 1 day so date T receives observations up to T - 1
        group["rainfall_prev_30d"] = precip.rolling(window=30, min_periods=30).sum().shift(1).round(2)
        group["rainfall_prev_90d"] = precip.rolling(window=90, min_periods=90).sum().shift(1).round(2)
        group["rainfall_prev_365d"] = precip.rolling(window=365, min_periods=365).sum().shift(1).round(2)

        antecedent_dfs.append(group[["location_id", "date", "rainfall_prev_30d", "rainfall_prev_90d", "rainfall_prev_365d"]])

    antecedent_all = pd.concat(antecedent_dfs, ignore_index=True)
    antecedent_all["date"] = antecedent_all["date"].dt.strftime("%Y-%m-%d")
    return antecedent_all


def compute_expanding_climatological_baseline(windows_df: pd.DataFrame) -> pd.DataFrame:
    """
    Computes historical expanding climatological mean and std for each (location_id, day_of_year, duration_days).
    Strictly causal: For an example in year Y, the baseline is computed strictly over years y < Y.
    Requires at least 5 prior years of history (min_periods=5).
    """
    df = windows_df.copy()
    df["start_dt"] = pd.to_datetime(df["start_date"])
    df["start_year"] = df["start_dt"].dt.year
    df["start_doy"] = df["start_dt"].dt.dayofyear

    # Extract unique window observations per (location, doy, duration, year)
    # Since multiple options share the same duration, rainfall_total_mm is identical across them.
    unique_windows = df.drop_duplicates(subset=["location_id", "start_doy", "duration_days", "start_year"]).copy()
    unique_windows = unique_windows.sort_values(by=["location_id", "start_doy", "duration_days", "start_year"]).reset_index(drop=True)

    # Compute expanding mean and std with shift(1) strictly excluding current year
    grouped = unique_windows.groupby(["location_id", "start_doy", "duration_days"])["rainfall_total_mm"]
    unique_windows["climatological_mean_window_rainfall"] = grouped.transform(
        lambda s: s.expanding(min_periods=5).mean().shift(1)
    ).round(2)
    unique_windows["climatological_std_window_rainfall"] = grouped.transform(
        lambda s: s.expanding(min_periods=5).std().shift(1)
    ).round(2)

    # Fill NaN std (when constant or min_periods just met) with 0.0
    unique_windows["climatological_std_window_rainfall"] = unique_windows["climatological_std_window_rainfall"].fillna(0.0)

    # Merge back into the full windows dataframe
    cols_to_merge = [
        "location_id", "start_doy", "duration_days", "start_year",
        "climatological_mean_window_rainfall", "climatological_std_window_rainfall"
    ]
    merged = pd.merge(
        df,
        unique_windows[cols_to_merge],
        on=["location_id", "start_doy", "duration_days", "start_year"],
        how="left"
    )

    return merged


def engineer_features(
    cleaned_rainfall_path: Optional[Path] = None,
    windows_path: Optional[Path] = None,
    locations_path: Optional[Path] = None,
    output_path: Optional[Path] = None,
) -> pd.DataFrame:
    """
    Integrates antecedent precipitation, expanding climatology, geographic and policy features.
    Saves the final clean training dataset without target leakage.
    """
    clean_csv = cleaned_rainfall_path or CLEANED_RAINFALL_CSV
    win_csv = windows_path or HISTORICAL_WINDOWS_CSV
    loc_csv = locations_path or LOCATIONS_CSV
    out_csv = output_path or TRAINING_DATASET_CSV

    print(f"Loading coverage windows from {win_csv}...")
    windows_df = pd.read_csv(win_csv)

    print(f"Loading cleaned daily rainfall from {clean_csv}...")
    rainfall_df = pd.read_csv(clean_csv)

    print(f"Loading location reference from {loc_csv}...")
    locations_df = pd.read_csv(loc_csv)

    # 1. Compute antecedent rainfall features strictly ending on T - 1
    print("Computing antecedent rainfall features (30d, 90d, 365d prior to T)...")
    antecedent_df = compute_antecedent_rainfall_features(rainfall_df)

    # Merge antecedent features
    windows_with_ante = pd.merge(
        windows_df,
        antecedent_df,
        left_on=["location_id", "start_date"],
        right_on=["location_id", "date"],
        how="inner"
    )
    if "date" in windows_with_ante.columns:
        windows_with_ante = windows_with_ante.drop(columns=["date"])

    # 2. Compute strictly expanding climatological baseline
    print("Computing expanding historical climatological baseline (strictly y < Y)...")
    windows_with_clim = compute_expanding_climatological_baseline(windows_with_ante)

    # 3. Add elevation from locations reference
    if "elevation_m" in locations_df.columns:
        elev_map = locations_df.set_index("location_id")["elevation_m"].to_dict()
        windows_with_clim["elevation_m"] = windows_with_clim["location_id"].map(elev_map)
    else:
        windows_with_clim["elevation_m"] = 500.0

    # 4. Derived interaction features (strictly pre-window)
    windows_with_clim["threshold_per_day"] = (
        windows_with_clim["threshold_mm"] / windows_with_clim["duration_days"]
    ).round(3)
    windows_with_clim["expected_shortfall_margin"] = (
        windows_with_clim["threshold_mm"] - windows_with_clim["climatological_mean_window_rainfall"]
    ).round(2)

    # 5. Filter out warmup rows where climatological baseline is not yet available (first 5 years: 1950-1954)
    initial_len = len(windows_with_clim)
    valid_features_df = windows_with_clim.dropna(subset=[
        "rainfall_prev_30d", "rainfall_prev_90d", "rainfall_prev_365d",
        "climatological_mean_window_rainfall"
    ]).copy()
    dropped_warmup = initial_len - len(valid_features_df)
    print(f"Filtered {dropped_warmup:,} early warmup records (< 5 prior years history). Remaining: {len(valid_features_df):,} records.")

    # 6. Specify final clean column order (strictly excluding rainfall_total_mm from features)
    feature_columns = [
        # Metadata / Identifiers
        "location_id", "district", "start_date", "start_year", "crop", "option_id", "policy_level",
        # Geographic Features
        "latitude", "longitude", "elevation_m",
        # Temporal Features
        "start_month", "start_day_of_year", "duration_days",
        # Policy Terms
        "threshold_mm", "threshold_per_day",
        # Antecedent Weather Features (Strictly <= T - 1)
        "rainfall_prev_30d", "rainfall_prev_90d", "rainfall_prev_365d",
        # Climatological Baseline Features (Strictly y < Y)
        "climatological_mean_window_rainfall", "climatological_std_window_rainfall",
        "expected_shortfall_margin",
        # Target Label
        "shortfall_label",
    ]

    final_df = valid_features_df[feature_columns].copy()
    final_df.to_csv(out_csv, index=False)
    print(f"Saved final feature dataset ({len(final_df):,} rows) to {out_csv}")

    return final_df


if __name__ == "__main__":
    engineer_features()
