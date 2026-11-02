"""
Unit tests for data pipeline and window generation.
Tests:
- Correct rainfall aggregation over exact [T, T + D - 1] coverage period.
- Strict contract threshold comparison (y = 1 if R < T, y = 0 if R >= T).
- Missing/NaN observations strictly invalidate windows.
- All 12 agricultural catalogue options are populated.
"""

import numpy as np
import pandas as pd
import pytest

from ml.config import SAMPLE_FIXTURE_CSV, POLICY_CATALOGUE, AGRICULTURAL_OPTIONS
from ml.preprocessing.generate_windows import (
    generate_coverage_windows_for_location,
    get_catalogue_options_by_duration,
)


def test_catalogue_options_structure():
    """Verify that catalogue has 12 agricultural options and 1 demo option."""
    assert len(POLICY_CATALOGUE) == 13
    assert len(AGRICULTURAL_OPTIONS) == 12
    assert POLICY_CATALOGUE[0]["is_agricultural"] is False

    options_by_dur = get_catalogue_options_by_duration()
    assert set(options_by_dur.keys()) == {30, 60, 90, 120}
    for dur in [30, 60, 90, 120]:
        assert len(options_by_dur[dur]) == 3  # severe, moderate, mild


def test_rainfall_aggregation_and_strict_inequality():
    """
    Test exact aggregation and contract rule:
    Option 1: 30 days, threshold 30.0 mm
    - If sum is 29.9 mm -> shortfall (1)
    - If sum is 30.0 mm -> NOT eligible (0)
    - If sum is 30.1 mm -> NOT eligible (0)
    """
    options_by_dur = get_catalogue_options_by_duration()

    # Case A: Sum is 29.9 mm (< 30 mm)
    precip_a = [1.0] * 29 + [0.9]
    dates = pd.date_range("2020-01-01", periods=30, freq="D").strftime("%Y-%m-%d")
    df_a = pd.DataFrame({
        "date": dates,
        "location_id": "LOC_A",
        "district": "Tumakuru",
        "latitude": 13.33,
        "longitude": 77.10,
        "precipitation_mm": precip_a,
        "model": "era5",
    })
    res_a = generate_coverage_windows_for_location(df_a, options_by_dur, step_days=1)
    opt1_a = res_a[res_a["option_id"] == 1].iloc[0]
    assert opt1_a["rainfall_total_mm"] == 29.9
    assert opt1_a["shortfall_label"] == 1, "R < T must trigger claim (label 1)"

    # Case B: Sum is exactly 30.0 mm (== threshold)
    precip_b = [1.0] * 30
    df_b = pd.DataFrame({
        "date": dates,
        "location_id": "LOC_B",
        "district": "Tumakuru",
        "latitude": 13.33,
        "longitude": 77.10,
        "precipitation_mm": precip_b,
        "model": "era5",
    })
    res_b = generate_coverage_windows_for_location(df_b, options_by_dur, step_days=1)
    opt1_b = res_b[res_b["option_id"] == 1].iloc[0]
    assert opt1_b["rainfall_total_mm"] == 30.0
    assert opt1_b["shortfall_label"] == 0, "R == T must NOT trigger claim (label 0, matching Solidity contract)"

    # Case C: Sum is 30.1 mm (> threshold)
    precip_c = [1.0] * 29 + [1.1]
    df_c = pd.DataFrame({
        "date": dates,
        "location_id": "LOC_C",
        "district": "Tumakuru",
        "latitude": 13.33,
        "longitude": 77.10,
        "precipitation_mm": precip_c,
        "model": "era5",
    })
    res_c = generate_coverage_windows_for_location(df_c, options_by_dur, step_days=1)
    opt1_c = res_c[res_c["option_id"] == 1].iloc[0]
    assert opt1_c["rainfall_total_mm"] == 30.1
    assert opt1_c["shortfall_label"] == 0, "R > T must NOT trigger claim (label 0)"


def test_missing_observation_invalidates_window():
    """
    Verify that if ANY single observation inside a coverage window is missing/NaN,
    the entire coverage window is invalidated and omitted from the dataset.
    Never silently filled with zero!
    """
    fixture_df = pd.read_csv(SAMPLE_FIXTURE_CSV)
    options_by_dur = get_catalogue_options_by_duration()

    # The fixture has NaN at index 30 (2020-01-31).
    # Any 30-day window covering index 30 (i.e. start indices 1 through 30) must be discarded!
    windows = generate_coverage_windows_for_location(fixture_df, options_by_dur, step_days=1)

    # Verify no NaN rainfall_total_mm exists in output
    assert not windows["rainfall_total_mm"].isna().any()

    # Index 0 (2020-01-01 to 2020-01-30) has no NaN -> should exist
    start_dates = set(windows[windows["duration_days"] == 30]["start_date"])
    assert "2020-01-01" in start_dates

    # Index 1 (2020-01-02 to 2020-01-31, where 01-31 is NaN) must NOT exist!
    assert "2020-01-02" not in start_dates
    assert "2020-01-15" not in start_dates
    assert "2020-01-31" not in start_dates
