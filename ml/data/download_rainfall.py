"""
Acquires historical daily precipitation for Karnataka locations from Open-Meteo Archive API.
Uses ECMWF ERA5 reanalysis for a consistent, continuous 1950-2024 historical dataset.
Includes disk-caching, exponential backoff, rate limiting, and metadata tracking.
"""

import json
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional
import requests
import pandas as pd

from ml.config import (
    LOCATIONS_CSV,
    RAW_RAINFALL_CSV,
    RAW_CACHE_DIR,
    RAW_DATA_DIR,
    WEATHER_API_URL,
    REANALYSIS_MODEL,
    HISTORICAL_START_DATE,
    HISTORICAL_END_DATE,
)
from ml.data.load_crop_calendar import load_locations

METADATA_PATH = RAW_DATA_DIR / "retrieval_metadata.json"


def fetch_location_daily_rainfall(
    lat: float,
    lon: float,
    start_date: str = HISTORICAL_START_DATE,
    end_date: str = HISTORICAL_END_DATE,
    model: str = REANALYSIS_MODEL,
    max_retries: int = 6,
) -> Dict[str, Any]:
    """
    Fetches daily precipitation from Open-Meteo archive API with resilient rate-limit handling.
    """
    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": start_date,
        "end_date": end_date,
        "daily": "precipitation_sum",
        "timezone": "UTC",
        "models": model,
    }

    headers = {"User-Agent": "KarnatakaCropInsuranceML/1.0"}

    for attempt in range(1, max_retries + 1):
        try:
            response = requests.get(WEATHER_API_URL, params=params, headers=headers, timeout=45)
            if response.status_code == 200:
                data = response.json()
                if "daily" not in data or "precipitation_sum" not in data["daily"]:
                    raise ValueError(f"Malformed API response: {data}")
                return data
            elif response.status_code == 429:
                wait_time = 10.0 + (5.0 * attempt)
                print(f"  [Rate Limit 429] Waiting {wait_time:.1f}s before retry (attempt {attempt}/{max_retries})...")
                time.sleep(wait_time)
            elif response.status_code in [500, 502, 503, 504]:
                wait_time = 5.0 * attempt
                print(f"  [Server Error {response.status_code}] Waiting {wait_time:.1f}s before retry (attempt {attempt}/{max_retries})...")
                time.sleep(wait_time)
            else:
                response.raise_for_status()
        except requests.RequestException as e:
            if attempt == max_retries:
                raise RuntimeError(f"Failed to fetch data for ({lat}, {lon}) after {max_retries} attempts: {e}")
            wait_time = 5.0 * attempt
            print(f"  [Network exception] {e}. Waiting {wait_time:.1f}s before retry (attempt {attempt}/{max_retries})...")
            time.sleep(wait_time)

    raise RuntimeError(f"Failed to fetch data for ({lat}, {lon}) after {max_retries} retries.")


def download_and_cache_rainfall(
    force_refresh: bool = False,
    pause_between_requests: float = 1.2,
) -> pd.DataFrame:
    """
    Downloads historical rainfall for all reference locations, caches locally,
    and returns a combined raw DataFrame.
    """
    locations_df = load_locations()
    all_dfs: List[pd.DataFrame] = []

    print(f"Downloading/loading rainfall for {len(locations_df)} Karnataka locations ({HISTORICAL_START_DATE} to {HISTORICAL_END_DATE})...")

    for idx, loc in locations_df.iterrows():
        loc_id = loc["location_id"]
        cache_file = RAW_CACHE_DIR / f"{loc_id}.json"

        data: Optional[Dict[str, Any]] = None

        if cache_file.exists() and not force_refresh:
            try:
                with open(cache_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if "daily" in data and len(data["daily"].get("time", [])) > 0:
                        pass
                    else:
                        data = None
            except Exception as e:
                print(f"Cache read error for {loc_id}: {e}. Re-fetching...")
                data = None

        if data is None:
            print(f"  [{idx + 1}/{len(locations_df)}] Fetching {loc_id} ({loc['district']} - {loc['latitude']}, {loc['longitude']})...")
            data = fetch_location_daily_rainfall(
                lat=loc["latitude"],
                lon=loc["longitude"],
                start_date=HISTORICAL_START_DATE,
                end_date=HISTORICAL_END_DATE,
                model=REANALYSIS_MODEL,
            )
            with open(cache_file, "w", encoding="utf-8") as f:
                json.dump(data, f)
            time.sleep(pause_between_requests)
        else:
            print(f"  [{idx + 1}/{len(locations_df)}] Loaded {loc_id} from cache.")

        daily = data["daily"]
        times = daily["time"]
        precip = daily["precipitation_sum"]

        loc_df = pd.DataFrame({
            "date": times,
            "location_id": loc_id,
            "district": loc["district"],
            "latitude": loc["latitude"],
            "longitude": loc["longitude"],
            "precipitation_mm": precip,
            "source": "Open-Meteo Historical Weather API",
            "model": REANALYSIS_MODEL,
        })
        all_dfs.append(loc_df)

    combined_df = pd.concat(all_dfs, ignore_index=True)
    combined_df.to_csv(RAW_RAINFALL_CSV, index=False)
    print(f"Saved {len(combined_df):,} raw records to {RAW_RAINFALL_CSV}")

    # Write retrieval metadata
    metadata = {
        "source": "Open-Meteo Historical Weather API",
        "api_endpoint": WEATHER_API_URL,
        "model": REANALYSIS_MODEL,
        "model_selection_reason": (
            "ECMWF ERA5 reanalysis was selected because Open-Meteo archive API returns null "
            "for daily precipitation_sum on era5_land across global coordinates, whereas era5 "
            "provides continuous, unbroken daily precipitation from 1950 to 2024 without mixing models."
        ),
        "requested_start_date": HISTORICAL_START_DATE,
        "requested_end_date": HISTORICAL_END_DATE,
        "retrieval_timestamp": datetime.utcnow().isoformat() + "Z",
        "total_locations": len(locations_df),
        "total_records": len(combined_df),
        "locations": locations_df[["location_id", "district", "region", "latitude", "longitude"]].to_dict("records"),
    }
    with open(METADATA_PATH, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    print(f"Saved metadata manifest to {METADATA_PATH}")

    return combined_df


if __name__ == "__main__":
    download_and_cache_rainfall()
