"""
Chronological dataset splitting with purge buffer.
Guarantees zero overlap across Train (<=2014), Validation (2015-2019), and Test (2020-2024).
Enforces >= 120-day purge buffer at split boundaries.
"""

from typing import Tuple, Dict, Any
import pandas as pd
from ml.config import SPLIT_CONFIG


def get_feature_and_target_columns() -> Tuple[list, str]:
    """
    Returns the numeric model feature list and the target column name.
    Strictly excludes rainfall_total_mm (target leakage) and identifiers.
    """
    feature_cols = [
        "latitude",
        "longitude",
        "elevation_m",
        "start_month",
        "start_day_of_year",
        "duration_days",
        "threshold_mm",
        "threshold_per_day",
        "rainfall_prev_30d",
        "rainfall_prev_90d",
        "rainfall_prev_365d",
        "climatological_mean_window_rainfall",
        "climatological_std_window_rainfall",
        "expected_shortfall_margin",
    ]
    target_col = "shortfall_label"
    return feature_cols, target_col


def split_chronologically(
    df: pd.DataFrame
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, Dict[str, Any]]:
    """
    Splits dataset chronologically:
    - Train: Coverage window ends on or before 2014-12-31, with start dates purged >= 120 days before 2015.
    - Val:   Coverage window strictly within 2015-01-01 to 2019-12-31, purged >= 120 days before 2020.
    - Test:  Coverage window strictly within 2020-01-01 to 2024-12-31.
    Purge buffer: >= 120 days buffer around boundaries ensures no window crosses or leaks.
    """
    df = df.copy()
    start_dt = pd.to_datetime(df["start_date"])
    # End date of window: start_date + (duration_days - 1) days
    end_dt = start_dt + pd.to_timedelta(df["duration_days"] - 1, unit="D")

    train_end = pd.Timestamp(f"{SPLIT_CONFIG['train_end_year']}-12-31")
    val_start = pd.Timestamp(f"{SPLIT_CONFIG['val_start_year']}-01-01")
    val_end = pd.Timestamp(f"{SPLIT_CONFIG['val_end_year']}-12-31")
    test_start = pd.Timestamp(f"{SPLIT_CONFIG['test_start_year']}-01-01")
    test_end = pd.Timestamp(f"{SPLIT_CONFIG['test_end_year']}-12-31")

    purge_buffer = pd.Timedelta(days=SPLIT_CONFIG["purge_buffer_days"])
    train_start_cutoff = train_end - purge_buffer
    val_start_cutoff = val_end - purge_buffer

    # Train condition: window entirely ends by 2014-12-31 AND start date purged >= 120 days before 2015
    train_mask = (end_dt <= train_end) & (start_dt <= train_start_cutoff)

    # Val condition: window starts >= 2015-01-01, ends <= 2019-12-31, AND start purged >= 120 days before 2020
    val_mask = (start_dt >= val_start) & (end_dt <= val_end) & (start_dt <= val_start_cutoff)

    # Test condition: window starts >= 2020-01-01 and ends <= 2024-12-31
    test_mask = (start_dt >= test_start) & (end_dt <= test_end)

    train_df = df[train_mask].copy()
    val_df = df[val_mask].copy()
    test_df = df[test_mask].copy()

    # Calculate class balance
    split_info = {
        "train": {
            "records": len(train_df),
            "start_range": [str(start_dt[train_mask].min().date()), str(start_dt[train_mask].max().date())] if not train_df.empty else None,
            "end_range": [str(end_dt[train_mask].min().date()), str(end_dt[train_mask].max().date())] if not train_df.empty else None,
            "shortfall_positives": int(train_df["shortfall_label"].sum()) if not train_df.empty else 0,
            "shortfall_pct": float((train_df["shortfall_label"].sum() / len(train_df)) * 100) if not train_df.empty else 0.0,
        },
        "val": {
            "records": len(val_df),
            "start_range": [str(start_dt[val_mask].min().date()), str(start_dt[val_mask].max().date())] if not val_df.empty else None,
            "end_range": [str(end_dt[val_mask].min().date()), str(end_dt[val_mask].max().date())] if not val_df.empty else None,
            "shortfall_positives": int(val_df["shortfall_label"].sum()) if not val_df.empty else 0,
            "shortfall_pct": float((val_df["shortfall_label"].sum() / len(val_df)) * 100) if not val_df.empty else 0.0,
        },
        "test": {
            "records": len(test_df),
            "start_range": [str(start_dt[test_mask].min().date()), str(start_dt[test_mask].max().date())] if not test_df.empty else None,
            "end_range": [str(end_dt[test_mask].min().date()), str(end_dt[test_mask].max().date())] if not test_df.empty else None,
            "shortfall_positives": int(test_df["shortfall_label"].sum()) if not test_df.empty else 0,
            "shortfall_pct": float((test_df["shortfall_label"].sum() / len(test_df)) * 100) if not test_df.empty else 0.0,
        },
    }

    return train_df, val_df, test_df, split_info
