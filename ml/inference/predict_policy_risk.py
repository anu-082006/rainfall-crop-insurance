"""
Inference and Policy Recommendation module for Karnataka Parametric Crop Insurance.
Separates pure meteorological risk estimation from agronomic crop-stage advisory ranking.
Strictly read-only with respect to on-chain terms (Smart contracts remain sole authority for claim eligibility).
Enforces strict date boundary checks, validated antecedent observations, and empirical climatology lookups.
"""

from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
import joblib
import numpy as np
import pandas as pd

from ml.config import (
    POLICY_CATALOGUE,
    AGRICULTURAL_OPTIONS,
    RANDOM_FOREST_MODEL_PATH,
    LOGISTIC_REGRESSION_MODEL_PATH,
    LOCATIONS_CSV,
    CLEANED_RAINFALL_CSV,
    REFERENCE_DATA_DIR,
    HISTORICAL_END_DATE,
    KARNATAKA_BOUNDS,
)
from ml.data.load_crop_calendar import get_crop_calendar_for_district, load_locations, load_crop_calendar
from ml.training.split_data import get_feature_and_target_columns

CLIMATOLOGY_REF_CSV = REFERENCE_DATA_DIR / "climatology_reference.csv"

DISCLAIMER_TEXT = (
    "Parametric risk score reflects historical climatological probability under ECMWF ERA5 reanalysis "
    "and does not guarantee future rainfall. Contract claim eligibility is determined solely on-chain "
    "by verified Chainlink CRE reports."
)


class UnsupportedInferenceDateError(ValueError):
    """Raised when an inference date lacks required observations or falls outside supported ranges."""
    pass


class UnsupportedCropError(ValueError):
    """Raised when requested crop is not documented in the crop calendar."""
    pass


class UnsupportedLocationError(ValueError):
    """Raised when coordinates or district are outside Karnataka or not recognized."""
    pass


class InvalidFeatureValueError(ValueError):
    """Raised when antecedent rainfall or features have invalid or negative values."""
    pass


class RiskPredictor:
    """
    Loads trained models and predicts shortfall probability for given policy options.
    Uses empirical climatology lookups and strict antecedent rainfall validation.
    """
    def __init__(self, model_type: str = "random_forest"):
        self.model_type = model_type.lower()
        if self.model_type == "random_forest":
            model_path = RANDOM_FOREST_MODEL_PATH
        elif self.model_type in ["logistic_regression", "lr"]:
            model_path = LOGISTIC_REGRESSION_MODEL_PATH
        else:
            raise ValueError(f"Unknown model_type: '{model_type}'. Choose 'random_forest' or 'logistic_regression'.")

        if not model_path.exists():
            raise FileNotFoundError(f"Model artifact not found at {model_path}. Train model first.")

        self.model = joblib.load(model_path)
        self.feature_cols, _ = get_feature_and_target_columns()
        self.locations_df = load_locations()

        # Load empirical climatology reference table
        if not CLIMATOLOGY_REF_CSV.exists():
            raise FileNotFoundError(f"Climatology reference not found at {CLIMATOLOGY_REF_CSV}")
        self.climatology_df = pd.read_csv(CLIMATOLOGY_REF_CSV)
        # Create fast lookup map: (location_id, start_doy, duration_days) -> (mean, std)
        self.clim_lookup = self.climatology_df.set_index(["location_id", "start_day_of_year", "duration_days"]).to_dict("index")

        # Lazy cache for historical rainfall series
        self._historical_df: Optional[pd.DataFrame] = None

    def _get_historical_rainfall(self) -> pd.DataFrame:
        if self._historical_df is None:
            if CLEANED_RAINFALL_CSV.exists():
                self._historical_df = pd.read_csv(CLEANED_RAINFALL_CSV)
                self._historical_df["date"] = pd.to_datetime(self._historical_df["date"])
            else:
                self._historical_df = pd.DataFrame()
        return self._historical_df

    def resolve_location(self, lat: float, lon: float, district: Optional[str] = None) -> Dict[str, Any]:
        """
        Validates location coordinates and resolves district and elevation.
        """
        if not (KARNATAKA_BOUNDS["lat_min"] <= lat <= KARNATAKA_BOUNDS["lat_max"] and
                KARNATAKA_BOUNDS["lon_min"] <= lon <= KARNATAKA_BOUNDS["lon_max"]):
            raise UnsupportedLocationError(
                f"Coordinates ({lat}, {lon}) are outside Karnataka bounds "
                f"[{KARNATAKA_BOUNDS['lat_min']}-{KARNATAKA_BOUNDS['lat_max']} N, "
                f"{KARNATAKA_BOUNDS['lon_min']}-{KARNATAKA_BOUNDS['lon_max']} E]."
            )

        # Match exact district or nearest reference location
        if district:
            match = self.locations_df[self.locations_df["district"].str.lower() == district.lower()]
            if not match.empty:
                row = match.iloc[0]
                return {
                    "location_id": row["location_id"],
                    "district": row["district"],
                    "elevation_m": float(row["elevation_m"]),
                }

        dists = (self.locations_df["latitude"] - lat)**2 + (self.locations_df["longitude"] - lon)**2
        nearest_idx = dists.idxmin()
        row = self.locations_df.loc[nearest_idx]
        return {
            "location_id": row["location_id"],
            "district": row["district"],
            "elevation_m": float(row["elevation_m"]),
        }

    def resolve_climatology(self, location_id: str, start_doy: int, duration_days: int) -> Tuple[float, float]:
        """
        Retrieves empirical climatological mean and std from 75-year historical reference.
        """
        key = (location_id, start_doy, duration_days)
        if key in self.clim_lookup:
            rec = self.clim_lookup[key]
            return float(rec["climatological_mean_window_rainfall"]), float(rec["climatological_std_window_rainfall"])

        # Fallback to nearest day of year if leap year day 366 not in lookup
        key_fallback = (location_id, min(365, start_doy), duration_days)
        if key_fallback in self.clim_lookup:
            rec = self.clim_lookup[key_fallback]
            return float(rec["climatological_mean_window_rainfall"]), float(rec["climatological_std_window_rainfall"])

        raise ValueError(f"No climatological reference found for location={location_id}, doy={start_doy}, duration={duration_days}")

    def resolve_antecedent_rainfall(
        self,
        location_id: str,
        start_date: pd.Timestamp,
        query: Dict[str, Any],
        mode: str = "standard"
    ) -> Tuple[float, float, float, Optional[str]]:
        """
        Resolves pre-window antecedent rainfall features [T - 30, T - 1], [T - 90, T - 1], [T - 365, T - 1].
        1. Uses query features if supplied and validates non-negativity.
        2. If start_date <= 2024-12-31, extracts from historical series.
        3. If start_date > 2024-12-31 and mode == 'climatology_only', uses historical seasonal normal.
        4. If start_date > 2024-12-31 and mode == 'standard', raises UnsupportedInferenceDateError.
        """
        # 1. User supplied antecedent values
        p30 = query.get("rainfall_prev_30d")
        p90 = query.get("rainfall_prev_90d")
        p365 = query.get("rainfall_prev_365d")

        if p30 is not None and p90 is not None and p365 is not None:
            p30, p90, p365 = float(p30), float(p90), float(p365)
            if p30 < 0 or p90 < 0 or p365 < 0:
                raise InvalidFeatureValueError(f"Antecedent rainfall must be non-negative: prev_30d={p30}, prev_90d={p90}, prev_365d={p365}")
            return p30, p90, p365, None

        # 2. Historical dataset lookup
        hist_end = pd.Timestamp(HISTORICAL_END_DATE)
        if start_date <= hist_end:
            h_df = self._get_historical_rainfall()
            if not h_df.empty:
                loc_df = h_df[h_df["location_id"] == location_id].sort_values("date").reset_index(drop=True)
                t_idx = loc_df[loc_df["date"] == start_date].index
                if len(t_idx) > 0:
                    idx = t_idx[0]
                    if idx >= 365:
                        p30_val = float(loc_df.loc[idx-30:idx-1, "precipitation_mm"].sum())
                        p90_val = float(loc_df.loc[idx-90:idx-1, "precipitation_mm"].sum())
                        p365_val = float(loc_df.loc[idx-365:idx-1, "precipitation_mm"].sum())
                        return round(p30_val, 2), round(p90_val, 2), round(p365_val, 2), None

        # 3. Future dates beyond historical dataset
        if mode == "climatology_only":
            # Baseline proxy from historical climatology reference
            doy = start_date.dayofyear
            mean_30, _ = self.resolve_climatology(location_id, max(1, doy - 30), 30)
            mean_90, _ = self.resolve_climatology(location_id, max(1, doy - 90), 90)
            mean_365, _ = self.resolve_climatology(location_id, 1, 120)
            warning = (
                f"Notice: Start date '{start_date.date()}' is after historical dataset end ({HISTORICAL_END_DATE}). "
                "Recent antecedent weather features were not supplied; inference ran in climatology_only mode."
            )
            return round(mean_30, 2), round(mean_90, 2), round(mean_365 * 3.0, 2), warning

        raise UnsupportedInferenceDateError(
            f"Start date '{start_date.date()}' is after historical weather dataset end date ({HISTORICAL_END_DATE}). "
            "Recent antecedent observations ('rainfall_prev_30d', 'rainfall_prev_90d', 'rainfall_prev_365d') "
            "must be explicitly supplied for future inference dates, or pass mode='climatology_only' for pure climatological baseline risk."
        )

    def predict_shortfall_probability(
        self,
        query: Dict[str, Any],
        mode: str = "standard"
    ) -> Dict[str, Any]:
        """
        Estimates P(accumulated rainfall < policy threshold | location, start date, duration).
        """
        opt_id = int(query["option_id"])
        if opt_id not in AGRICULTURAL_OPTIONS:
            raise ValueError(f"Invalid option_id: {opt_id}. Must be one of agricultural options {AGRICULTURAL_OPTIONS}")

        opt_meta = POLICY_CATALOGUE[opt_id]
        lat = float(query["latitude"])
        lon = float(query["longitude"])
        district = query.get("district")
        start_date_str = str(query["start_date"])
        start_dt = pd.to_datetime(start_date_str)
        dur = int(opt_meta["duration_days"])
        threshold = float(opt_meta["threshold_mm"])

        # Resolve location and elevation
        loc_info = self.resolve_location(lat, lon, district)
        location_id = loc_info["location_id"]
        elevation = loc_info["elevation_m"]

        # Extract temporal features
        start_month = start_dt.month
        start_doy = start_dt.dayofyear
        threshold_per_day = round(threshold / dur, 3)

        # Retrieve empirical climatology for (location, doy, duration)
        clim_mean, clim_std = self.resolve_climatology(location_id, start_doy, dur)
        expected_shortfall_margin = round(threshold - clim_mean, 2)

        # Retrieve and validate antecedent rainfall features
        prev_30d, prev_90d, prev_365d, warning = self.resolve_antecedent_rainfall(
            location_id=location_id,
            start_date=start_dt,
            query=query,
            mode=mode
        )

        feature_dict = {
            "latitude": lat,
            "longitude": lon,
            "elevation_m": elevation,
            "start_month": start_month,
            "start_day_of_year": start_doy,
            "duration_days": dur,
            "threshold_mm": threshold,
            "threshold_per_day": threshold_per_day,
            "rainfall_prev_30d": prev_30d,
            "rainfall_prev_90d": prev_90d,
            "rainfall_prev_365d": prev_365d,
            "climatological_mean_window_rainfall": clim_mean,
            "climatological_std_window_rainfall": clim_std,
            "expected_shortfall_margin": expected_shortfall_margin,
        }

        X_input = pd.DataFrame([feature_dict])[self.feature_cols]
        prob = float(self.model.predict_proba(X_input)[0, 1])

        # Risk categorization
        if prob >= 0.70:
            risk_category = "High Shortfall Risk"
        elif prob >= 0.35:
            risk_category = "Moderate Shortfall Risk"
        else:
            risk_category = "Low Shortfall Risk"

        result = {
            "option_id": opt_id,
            "name": opt_meta["name"],
            "policy_level": opt_meta["level"],
            "duration_days": dur,
            "threshold_mm": threshold,
            "payout_rtt": opt_meta["payout_rtt"],
            "shortfall_probability": round(prob, 4),
            "risk_category": risk_category,
            "features_used": {
                "location_id": location_id,
                "district": loc_info["district"],
                "elevation_m": elevation,
                "climatological_mean_mm": clim_mean,
                "climatological_std_mm": clim_std,
                "expected_shortfall_margin_mm": expected_shortfall_margin,
                "rainfall_prev_30d_mm": prev_30d,
                "rainfall_prev_90d_mm": prev_90d,
                "rainfall_prev_365d_mm": prev_365d,
            },
            "disclaimer": DISCLAIMER_TEXT,
        }

        if warning:
            result["warning"] = warning

        return result


def recommend_policies(
    farm_profile: Dict[str, Any],
    top_k: int = 3,
    model_type: str = "random_forest",
    mode: str = "climatology_only"
) -> Dict[str, Any]:
    """
    Ranks catalogue options based on shortfall probability, crop calendar stage alignment, and payout value.
    Validates crop, location, and date inputs.
    """
    district = farm_profile.get("district", "Tumakuru")
    crop = farm_profile.get("crop", "Groundnut")
    season = farm_profile.get("season", "Kharif")
    sowing_date_str = farm_profile.get("sowing_date", "2024-06-15")
    start_date_str = farm_profile.get("candidate_start_date", sowing_date_str)

    # Validate crop supported
    supported_crops = load_crop_calendar()["crop"].unique().tolist()
    if crop.lower() not in [c.lower() for c in supported_crops]:
        raise UnsupportedCropError(f"Crop '{crop}' is not supported. Supported crops: {supported_crops}")

    predictor = RiskPredictor(model_type=model_type)

    # Resolve location
    lat = farm_profile.get("latitude")
    lon = farm_profile.get("longitude")
    if lat is None or lon is None:
        locs_df = load_locations()
        match = locs_df[locs_df["district"].str.lower() == district.lower()]
        if match.empty:
            raise UnsupportedLocationError(f"District '{district}' is not recognized in Karnataka.")
        lat = float(match.iloc[0]["latitude"])
        lon = float(match.iloc[0]["longitude"])

    # Retrieve crop calendar
    crop_cal = get_crop_calendar_for_district(crop=crop, district=district, season=season)
    crit_start_das = int(crop_cal["critical_stage_start_das"])
    crit_end_das = int(crop_cal["critical_stage_end_das"])
    crit_stage_name = crop_cal["critical_stage_name"]

    sow_dt = pd.to_datetime(sowing_date_str)
    start_dt = pd.to_datetime(start_date_str)

    # Critical stage absolute calendar window
    crit_stage_start_date = sow_dt + timedelta(days=crit_start_das)
    crit_stage_end_date = sow_dt + timedelta(days=crit_end_das)
    crit_stage_duration = (crit_stage_end_date - crit_stage_start_date).days + 1

    ranked_options = []

    for opt_id in AGRICULTURAL_OPTIONS:
        pred_res = predictor.predict_shortfall_probability(
            query={
                "latitude": lat,
                "longitude": lon,
                "start_date": start_date_str,
                "option_id": opt_id,
                "district": district,
                "rainfall_prev_30d": farm_profile.get("rainfall_prev_30d"),
                "rainfall_prev_90d": farm_profile.get("rainfall_prev_90d"),
                "rainfall_prev_365d": farm_profile.get("rainfall_prev_365d"),
            },
            mode=mode
        )

        dur = pred_res["duration_days"]
        prob = pred_res["shortfall_probability"]

        # Policy coverage calendar window
        policy_start_date = start_dt
        policy_end_date = start_dt + timedelta(days=dur - 1)

        # Overlap with critical stage
        overlap_start = max(policy_start_date, crit_stage_start_date)
        overlap_end = min(policy_end_date, crit_stage_end_date)
        overlap_days = max(0, (overlap_end - overlap_start).days + 1)
        overlap_pct = min(100.0, round((overlap_days / crit_stage_duration) * 100, 1))

        # Composite score components
        payout_efficiency = (pred_res["payout_rtt"] / dur) / 3.0  # Normalized to max 3 RTT/day
        risk_utility = max(0.0, 1.0 - abs(prob - 0.50) * 1.5)
        stage_score = overlap_pct / 100.0

        composite_score = (
            0.40 * stage_score +
            0.40 * risk_utility +
            0.20 * payout_efficiency
        )

        explanation = (
            f"Option {opt_id} ({pred_res['name']}) covers {dur} days with a {pred_res['threshold_mm']} mm trigger. "
            f"It covers {overlap_pct:.0f}% of the critical {crit_stage_name} window ({crit_start_das}-{crit_end_das} DAS). "
            f"Historical shortfall probability is {prob*100:.1f}% ({pred_res['risk_category']})."
        )

        ranked_options.append({
            "rank": 0,
            "option_id": opt_id,
            "name": pred_res["name"],
            "policy_level": pred_res["policy_level"],
            "duration_days": dur,
            "threshold_mm": pred_res["threshold_mm"],
            "payout_rtt": pred_res["payout_rtt"],
            "shortfall_probability": prob,
            "risk_category": pred_res["risk_category"],
            "critical_stage_overlap_pct": overlap_pct,
            "score_breakdown": {
                "stage_overlap_contribution": round(0.40 * stage_score, 4),
                "risk_utility_contribution": round(0.40 * risk_utility, 4),
                "payout_efficiency_contribution": round(0.20 * payout_efficiency, 4),
            },
            "composite_score": round(composite_score, 4),
            "explanation": explanation,
        })

    ranked_options.sort(key=lambda x: x["composite_score"], reverse=True)
    for idx, item in enumerate(ranked_options):
        item["rank"] = idx + 1

    return {
        "farmer_profile": {
            "district": district,
            "crop": crop,
            "season": season,
            "sowing_date": sowing_date_str,
            "coverage_start_date": start_date_str,
            "critical_stage": {
                "name": crit_stage_name,
                "start_date": str(crit_stage_start_date.date()),
                "end_date": str(crit_stage_end_date.date()),
                "das_window": f"{crit_start_das}-{crit_end_das} DAS",
            }
        },
        "top_recommendations": ranked_options[:top_k],
        "all_ranked_options": ranked_options,
        "disclaimer": DISCLAIMER_TEXT,
    }


if __name__ == "__main__":
    profile = {
        "district": "Tumakuru",
        "crop": "Groundnut",
        "season": "Kharif",
        "sowing_date": "2024-06-15",
        "candidate_start_date": "2024-06-15"
    }
    rec = recommend_policies(profile, top_k=3)
    top1 = rec["top_recommendations"][0]
    print(f"Top recommendation for Tumakuru Groundnut Kharif:")
    print(f"  Rank 1: {top1['name']} (Composite Score: {top1['composite_score']})")
    print(f"  Score Breakdown: {top1['score_breakdown']}")
    print(f"  Reason: {top1['explanation']}")
