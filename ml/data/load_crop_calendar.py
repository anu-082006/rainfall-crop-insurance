"""
Module to load and query Karnataka locations and crop calendar reference tables.
"""

from typing import Dict, Any, Optional
import pandas as pd
from ml.config import LOCATIONS_CSV, CROP_CALENDAR_CSV, KARNATAKA_BOUNDS


def load_locations(csv_path: Optional[str] = None) -> pd.DataFrame:
    """
    Loads and validates the 28 representative Karnataka locations.
    """
    path = csv_path or LOCATIONS_CSV
    df = pd.read_csv(path)
    required_cols = {"location_id", "district", "latitude", "longitude", "region", "elevation_m"}
    if not required_cols.issubset(df.columns):
        missing = required_cols - set(df.columns)
        raise ValueError(f"Locations reference missing columns: {missing}")

    # Validate geographic boundaries
    out_of_bounds = df[
        (df["latitude"] < KARNATAKA_BOUNDS["lat_min"]) |
        (df["latitude"] > KARNATAKA_BOUNDS["lat_max"]) |
        (df["longitude"] < KARNATAKA_BOUNDS["lon_min"]) |
        (df["longitude"] > KARNATAKA_BOUNDS["lon_max"])
    ]
    if not out_of_bounds.empty:
        raise ValueError(f"Coordinates outside Karnataka bounds: {out_of_bounds[['location_id', 'latitude', 'longitude']].to_dict('records')}")

    return df


def load_crop_calendar(csv_path: Optional[str] = None) -> pd.DataFrame:
    """
    Loads the crop calendar reference data.
    """
    path = csv_path or CROP_CALENDAR_CSV
    df = pd.read_csv(path)
    required_cols = {
        "crop", "district", "season", "sowing_start_month", "sowing_end_month",
        "harvest_start_month", "harvest_end_month", "growth_duration_days",
        "critical_stage_name", "critical_stage_start_das", "critical_stage_end_das",
        "source", "source_confidence"
    }
    if not required_cols.issubset(df.columns):
        missing = required_cols - set(df.columns)
        raise ValueError(f"Crop calendar reference missing columns: {missing}")
    return df


def get_crop_calendar_for_district(
    crop: str,
    district: str,
    season: str = "Kharif",
    csv_path: Optional[str] = None
) -> Dict[str, Any]:
    """
    Retrieves crop calendar entry for a specific crop and district.
    Falls back to state baseline (district='ALL') if district-specific entry is absent.
    """
    df = load_crop_calendar(csv_path)
    matches = df[(df["crop"].str.lower() == crop.lower()) & (df["season"].str.lower() == season.lower())]

    if matches.empty:
        raise ValueError(f"No crop calendar found for crop='{crop}', season='{season}'")

    # Match exact district first
    district_match = matches[matches["district"].str.lower() == district.lower()]
    if not district_match.empty:
        return district_match.iloc[0].to_dict()

    # Fallback to state baseline
    baseline_match = matches[matches["district"].str.upper() == "ALL"]
    if not baseline_match.empty:
        res = baseline_match.iloc[0].to_dict()
        res["district"] = district
        res["source"] = f"{res['source']} (State Baseline Fallback)"
        return res

    return matches.iloc[0].to_dict()


if __name__ == "__main__":
    locs = load_locations()
    print(f"Loaded {len(locs)} Karnataka locations across regions: {locs['region'].unique().tolist()}")
    cal = load_crop_calendar()
    print(f"Loaded {len(cal)} crop calendar rows.")
    ex = get_crop_calendar_for_district("Groundnut", "Tumakuru", "Kharif")
    print(f"Tumakuru Groundnut Kharif: {ex['critical_stage_name']} ({ex['critical_stage_start_das']}-{ex['critical_stage_end_das']} DAS)")
