"""
Unit tests for feature engineering.
Verifies:
- Antecedent features strictly end at T - 1 (no leakage of date T).
- Expanding climatological baseline only uses years strictly prior to start year (y < Y).
- rainfall_total_mm is never included in model features.
"""

import pandas as pd
import numpy as np
import pytest

from ml.preprocessing.feature_engineering import (
    compute_antecedent_rainfall_features,
    compute_expanding_climatological_baseline,
)
from ml.training.split_data import get_feature_and_target_columns


def test_antecedent_rainfall_has_no_leakage():
    """
    Ensure antecedent rainfall ends on T - 1:
    If day T has extreme rainfall (e.g. 500 mm), it must NOT appear in rainfall_prev_30d on day T.
    """
    dates = pd.date_range("2020-01-01", periods=40, freq="D")
    precip = [1.0] * 35 + [500.0] + [1.0] * 4  # Day 36 (index 35) has 500 mm

    df = pd.DataFrame({
        "date": dates.strftime("%Y-%m-%d"),
        "location_id": "LOC_TEST",
        "precipitation_mm": precip,
    })

    ante = compute_antecedent_rainfall_features(df)
    day_35_date = dates[35].strftime("%Y-%m-%d")
    day_36_date = dates[36].strftime("%Y-%m-%d")

    # On day 35 (the day with 500mm), previous 30d should only reflect prior days (30 * 1.0 = 30.0)
    row_day_35 = ante[ante["date"] == day_35_date].iloc[0]
    assert row_day_35["rainfall_prev_30d"] == 30.0

    # On day 36 (the day after 500mm), previous 30d now includes the 500mm
    row_day_36 = ante[ante["date"] == day_36_date].iloc[0]
    assert row_day_36["rainfall_prev_30d"] >= 500.0


def test_expanding_climatology_has_no_future_leakage():
    """
    Verify expanding climatological baseline:
    For year Y, baseline must ONLY use observations from years y < Y.
    Future year Y+1 observations must NEVER influence year Y.
    """
    # Create windows for 10 consecutive years (2010 to 2019) on day 100
    rows = []
    for y in range(2010, 2020):
        # Even years have 50mm, odd years have 100mm
        # If year 2019 had 10,000mm, it should NOT affect year 2018!
        val = 10000.0 if y == 2019 else 100.0
        rows.append({
            "location_id": "LOC_CLIM",
            "start_date": f"{y}-04-10",
            "start_year": y,
            "start_doy": 100,
            "duration_days": 30,
            "rainfall_total_mm": val,
        })

    windows_df = pd.DataFrame(rows)
    clim_df = compute_expanding_climatological_baseline(windows_df)

    # In 2018 (index 8), mean must be exactly 100.0 (the 2019 anomaly of 10,000 mm must NOT leak!)
    row_2018 = clim_df[clim_df["start_year"] == 2018].iloc[0]
    assert row_2018["climatological_mean_window_rainfall"] == 100.0

    # In 2019, mean must still be 100.0 because 2019's own 10,000 mm value is excluded by shift(1)
    row_2019 = clim_df[clim_df["start_year"] == 2019].iloc[0]
    assert row_2019["climatological_mean_window_rainfall"] == 100.0


def test_target_is_not_in_feature_columns():
    """Verify that rainfall_total_mm and shortfall_label are strictly absent from model features."""
    feature_cols, target_col = get_feature_and_target_columns()
    assert "rainfall_total_mm" not in feature_cols
    assert "shortfall_label" not in feature_cols
    assert target_col == "shortfall_label"
