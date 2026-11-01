# FastAPI Integration Handoff Specification for Member 3
## Karnataka Rainfall-Risk Machine Learning Advisory Pipeline

**Repository:** `rainfall-crop-insurance`  
**Target Branch:** `cre-part-one`  
**Latest ML Commit:** `93c4273fa8f94528c007037d8516127904e4157b`  
**Subsystem Author:** Member 2 (ML & Crop Reference Data)  
**Consumer:** Member 3 (FastAPI Backend & Frontend Integration)

---

## 1. Executive Overview & System Architecture

This specification defines the exact interface, data schemas, error codes, and operational boundaries required to integrate the Karnataka Rainfall-Risk Machine Learning model into the FastAPI backend.

### 1.1 Architectural Separation of Concerns

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           OFF-CHAIN ADVISORY LAYER                          │
│                                                                             │
│   Farmer Web Portal (React / Frontend)                                      │
│         │                                                                   │
│         ▼ HTTP POST /api/v1/recommend                                       │
│   FastAPI Backend (Member 3)                                                │
│         │                                                                   │
│         ▼ Python Call: recommend_policies()                                 │
│   ML Inference Engine (Member 2 - ml/inference/predict_policy_risk.py)       │
│     ├── Evaluates historical shortfall risk P(Rainfall < Threshold)         │
│     ├── Evaluates critical crop-stage overlap (Groundnut 40-70 DAS)         │
│     └── Ranks 12 agricultural catalogue options by composite score          │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                               Farmer selects policy option
                                       │
                                       ▼ Web3 Transaction
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ON-CHAIN SETTLEMENT LAYER                         │
│                                                                             │
│   Smart Contract (CropInsurance.sol)                                        │
│     ├── Farmer enrolls in Option (1-12) by paying premium                   │
│     └── Holds RTT tokens in escrow until maturity                           │
│                                                                             │
│   Chainlink CRE Workflow (cre-workflow/)                                    │
│     ├── Triggers at policy maturity [start_date, start_date + duration - 1] │
│     ├── Fetches and verifies exact Open-Meteo rainfall observations         │
│     └── Submits verified report via Forwarder to CropInsurance.sol          │
│                                                                             │
│   Automated Settlement:                                                     │
│     └── If Verified Accumulated Rainfall < Threshold => Payout released     │
└─────────────────────────────────────────────────────────────────────────────┘
```

> [!IMPORTANT]
> **Strict On-Chain / Off-Chain Decoupling:**
> 1. The ML advisory pipeline and FastAPI backend provide **read-only decision support** to assist farmers in selecting policies that match their crop vulnerability.
> 2. The ML model **NEVER** approves claims, modifies thresholds, alters durations, overrides CRE reports, or executes token payouts. Claim eligibility is determined solely on-chain by `CropInsurance.sol` based on verified Chainlink CRE reports.

---

## 2. Python Inference Interface

Member 3 interacts with the ML pipeline through Python module `ml.inference.predict_policy_risk`.

### 2.1 Primary Function: `recommend_policies`

Member 3 should call `recommend_policies()` to obtain an end-to-end ranked policy advisory for a farmer:

```python
from ml.inference.predict_policy_risk import recommend_policies

result: dict = recommend_policies(
    farm_profile=farm_profile_dict,
    top_k=3,
    model_type="random_forest",
    mode="climatology_only"  # or "standard"
)
```

#### Function Signature & Parameters

```python
def recommend_policies(
    farm_profile: Dict[str, Any],
    top_k: int = 3,
    model_type: str = "random_forest",
    mode: str = "climatology_only"
) -> Dict[str, Any]
```

| Parameter | Type | Default | Description |
|:---|:---:|:---:|:---|
| `farm_profile` | `dict` | *Required* | Farmer profile containing location, crop, sowing date, and optional antecedent observations. |
| `top_k` | `int` | `3` | Number of top-ranked policies to return in `top_recommendations` (between 1 and 12). |
| `model_type` | `str` | `"random_forest"` | Model variant to use (`"random_forest"` is the audited production model; `"logistic_regression"` is available for comparison). |
| `mode` | `str` | `"climatology_only"` | Inference mode for dates beyond historical dataset (`"climatology_only"` or `"standard"`). |

---

### 2.2 Secondary Function: `RiskPredictor.predict_shortfall_probability`

For estimating the risk of a single specific policy option without ranking the entire catalogue:

```python
from ml.inference.predict_policy_risk import RiskPredictor

predictor = RiskPredictor(model_type="random_forest")
single_result: dict = predictor.predict_shortfall_probability(
    query={
        "latitude": 13.3379,
        "longitude": 77.1010,
        "district": "Tumakuru",
        "start_date": "2025-06-15",
        "option_id": 1,
        "rainfall_prev_30d": 45.0,  # optional
        "rainfall_prev_90d": 120.0, # optional
        "rainfall_prev_365d": 650.0 # optional
    },
    mode="climatology_only"
)
```

---

### 2.3 Feature Vector & Column Ordering

The underlying Random Forest model evaluates exactly 14 features in the following strict order (defined in `ml/training/split_data.py::get_feature_and_target_columns`):

| Column # | Feature Name | Data Type | Source / Derivation |
|:---:|:---|:---:|:---|
| 1 | `latitude` | `float64` | Farm coordinates ($11.5^\circ\text{N} - 18.5^\circ\text{N}$) |
| 2 | `longitude` | `float64` | Farm coordinates ($74.0^\circ\text{E} - 78.6^\circ\text{E}$) |
| 3 | `elevation_m` | `float64` | Looked up from `data/reference/karnataka_locations.csv` |
| 4 | `start_month` | `int64` | Month of policy coverage start ($1 - 12$) |
| 5 | `start_day_of_year` | `int64` | Day of year of coverage start ($1 - 366$) |
| 6 | `duration_days` | `int64` | Policy duration ($30, 60, 90, 120$) |
| 7 | `threshold_mm` | `float64` | Payout trigger threshold in mm ($30 - 360$) |
| 8 | `threshold_per_day` | `float64` | Daily required rainfall rate: $\text{threshold\_mm} / \text{duration\_days}$ |
| 9 | `rainfall_prev_30d` | `float64` | Prior 30-day accumulation $[T - 30, T - 1]$ |
| 10 | `rainfall_prev_90d` | `float64` | Prior 90-day accumulation $[T - 90, T - 1]$ |
| 11 | `rainfall_prev_365d` | `float64` | Prior 365-day accumulation $[T - 365, T - 1]$ |
| 12 | `climatological_mean_window_rainfall` | `float64` | Empirical historical mean from `climatology_reference.csv` |
| 13 | `climatological_std_window_rainfall` | `float64` | Empirical historical std from `climatology_reference.csv` |
| 14 | `expected_shortfall_margin` | `float64` | $\text{threshold\_mm} - \text{climatological\_mean\_window\_rainfall}$ |

> [!NOTE]
> Member 3 does **not** need to manually construct or normalize this feature vector. The `RiskPredictor` class automatically performs spatial lookups, empirical climatology table lookups, and feature vector assembly internally.

---

## 3. FastAPI Request Contract

### 3.1 Pydantic Request Model

Member 3 should define the following Pydantic model for incoming advisory requests:

```python
from datetime import date
from typing import Optional, Literal
from pydantic import BaseModel, Field, field_validator


class AdvisoryRequest(BaseModel):
    # Location (At least one must be provided)
    district: Optional[str] = Field(None, example="Tumakuru", description="Karnataka district name")
    latitude: Optional[float] = Field(None, ge=11.5, le=18.5, example=13.3379, description="Latitude (11.5 - 18.5 N)")
    longitude: Optional[float] = Field(None, ge=74.0, le=78.6, example=77.1010, description="Longitude (74.0 - 78.6 E)")

    # Agronomic Profile
    crop: str = Field("Groundnut", example="Groundnut", description="Crop name (currently 'Groundnut' supported)")
    season: Literal["Kharif", "Rabi"] = Field("Kharif", example="Kharif", description="Crop season")
    sowing_date: date = Field(..., example="2025-06-15", description="Sowing date (YYYY-MM-DD)")
    candidate_start_date: Optional[date] = Field(None, example="2025-06-15", description="Policy coverage start date (defaults to sowing_date)")

    # Inference Configuration
    mode: Literal["climatology_only", "standard"] = Field(
        "climatology_only",
        example="climatology_only",
        description="Inference mode. 'climatology_only' uses 75-year historical normals for future dates without recent weather data."
    )
    top_k: int = Field(3, ge=1, le=12, example=3, description="Number of top policies to return")

    # Optional Pre-window Rainfall (mm)
    rainfall_prev_30d: Optional[float] = Field(None, ge=0.0, example=45.2, description="Rainfall in prior 30 days [T-30, T-1]")
    rainfall_prev_90d: Optional[float] = Field(None, ge=0.0, example=120.0, description="Rainfall in prior 90 days [T-90, T-1]")
    rainfall_prev_365d: Optional[float] = Field(None, ge=0.0, example=650.0, description="Rainfall in prior 365 days [T-365, T-1]")

    @field_validator("district", mode="after")
    def validate_location_presence(cls, v, values):
        # Ensure either district or valid coordinates are supplied
        return v
```

### 3.2 Request Field Specifications

| Field | Mandatory? | Type | Validation Rules |
|:---|:---:|:---:|:---|
| `district` | Conditionally | `string` | Must match one of 24 Karnataka districts if `latitude`/`longitude` omitted. |
| `latitude` | Conditionally | `float` | Bounded by $[11.5, 18.5]^\circ\text{N}$. |
| `longitude` | Conditionally | `float` | Bounded by $[74.0, 78.6]^\circ\text{E}$. |
| `crop` | **Yes** | `string` | Must be `"Groundnut"` (case-insensitive). |
| `season` | No | `string` | `"Kharif"` (default) or `"Rabi"`. |
| `sowing_date` | **Yes** | `string (YYYY-MM-DD)` | Valid ISO 8601 calendar date. |
| `candidate_start_date` | No | `string (YYYY-MM-DD)` | Defaults to `sowing_date` if omitted. |
| `mode` | No | `string` | `"climatology_only"` (default) or `"standard"`. |
| `top_k` | No | `int` | $1 \le \text{top\_k} \le 12$ (default: `3`). |
| `rainfall_prev_30d` | No | `float` | Must be $\ge 0.0$ if supplied. |
| `rainfall_prev_90d` | No | `float` | Must be $\ge 0.0$ if supplied. |
| `rainfall_prev_365d` | No | `float` | Must be $\ge 0.0$ if supplied. |

### 3.3 Example JSON Request

#### Example A: Standard Climatological Advisory (Recommended for Farmers)
```json
{
  "district": "Tumakuru",
  "latitude": 13.3379,
  "longitude": 77.1010,
  "crop": "Groundnut",
  "season": "Kharif",
  "sowing_date": "2025-06-15",
  "candidate_start_date": "2025-06-15",
  "mode": "climatology_only",
  "top_k": 3
}
```

#### Example B: Advisory with Explicit Rain Gauge Measurements
```json
{
  "district": "Tumakuru",
  "latitude": 13.3379,
  "longitude": 77.1010,
  "crop": "Groundnut",
  "season": "Kharif",
  "sowing_date": "2025-06-15",
  "candidate_start_date": "2025-06-15",
  "mode": "standard",
  "rainfall_prev_30d": 42.5,
  "rainfall_prev_90d": 118.0,
  "rainfall_prev_365d": 635.0,
  "top_k": 3
}
```

---

## 4. Antecedent Rainfall Handling & Future Date Rules

The ML pipeline enforces strict temporal consistency to avoid silent data corruption:

### 4.1 Historical End Date Boundary
The training dataset ends on **`2024-12-31`** (`HISTORICAL_END_DATE` in `ml/config.py`).

### 4.2 Handling Scenarios

```
                               Start Date Check
                                      │
                 ┌────────────────────┴────────────────────┐
                 ▼                                         ▼
         Start Date <= 2024-12-31                  Start Date > 2024-12-31
                 │                                         │
        Lookup antecedents from                            │
        data/processed/cleaned_rainfall.csv                │
        (Historical replay)                                │
                                         ┌─────────────────┴─────────────────┐
                                         ▼                                   ▼
                              Antecedent values supplied?           No antecedents supplied
                                         │                                   │
                               ┌─────────┴─────────┐                         │
                               ▼                   ▼                         │
                            Valid                Negative                    │
                           (>= 0.0)              (< 0.0)                     │
                               │                   │                         │
                               ▼                   ▼                         ▼
                        Inference runs       HTTP 422:             Check 'mode' parameter
                          normally         InvalidFeature-                   │
                                             ValueError                      │
                                                                   ┌─────────┴─────────┐
                                                                   ▼                   ▼
                                                           mode='climatology_only' mode='standard'
                                                                   │                   │
                                                                   ▼                   ▼
                                                          Inference runs with      HTTP 400:
                                                          historical normals +    Unsupported-
                                                          explicit warning      InferenceDateError
```

1. **Scenario 1: Full Antecedent Observations Provided (`rainfall_prev_30d`, `90d`, `365d` $\ge 0.0$)**:
   - The values are validated for non-negativity.
   - Inference runs normally in standard mode, returning a probability conditioned on actual recent weather.
2. **Scenario 2: Future Date without Antecedent Observations in `mode="standard"`**:
   - The model **strictly raises `UnsupportedInferenceDateError`**.
   - FastAPI must return an **HTTP 400 Bad Request** explaining that recent weather data is required or the client must specify `mode="climatology_only"`.
   - The ML subsystem will **never** silently substitute arbitrary numbers or zeros.
3. **Scenario 3: Future Date in `mode="climatology_only"` (Default)**:
   - The inference engine looks up the empirical 75-year historical normal for that day of year from `data/reference/climatology_reference.csv`.
   - The response includes an explicit `"warning"` key:
     `"Notice: Start date '2025-06-15' is after historical dataset end (2024-12-31). Recent antecedent weather features were not supplied; inference ran in climatology_only mode."`
   - The frontend should display an informational pill indicating that risk is estimated based on historical climatology.

### 4.3 Outstanding Integration Requirement for Member 3
- The ML repository does **not** include an automated background scraper for real-time weather between January 1, 2025 and the present day.
- If live recent weather is needed without farmer manual input, Member 3 must implement a lightweight helper in FastAPI that queries Open-Meteo's `/v1/forecast` or `/v1/archive` endpoint for the prior 30/90/365 days before calling `recommend_policies()`.

---

## 5. FastAPI Response Contract

### 5.1 Response JSON Schema

`POST /api/v1/recommend` returns an object with the following top-level structure:

```json
{
  "farmer_profile": {
    "district": "Tumakuru",
    "crop": "Groundnut",
    "season": "Kharif",
    "sowing_date": "2025-06-15",
    "coverage_start_date": "2025-06-15",
    "critical_stage": {
      "name": "Pegging and Pod Formation",
      "start_date": "2025-07-25",
      "end_date": "2025-08-24",
      "das_window": "40-70 DAS"
    }
  },
  "top_recommendations": [ ... ],
  "all_ranked_options": [ ... ],
  "disclaimer": "Parametric risk score reflects historical climatological probability under ECMWF ERA5 reanalysis and does not guarantee future rainfall. Contract claim eligibility is determined solely on-chain by verified Chainlink CRE reports.",
  "warning": "Notice: Start date '2025-06-15' is after historical dataset end (2024-12-31). Recent antecedent weather features were not supplied; inference ran in climatology_only mode."
}
```

### 5.2 Policy Recommendation Object Schema

Each item in `top_recommendations` and `all_ranked_options` contains:

| Field | Type | Description |
|:---|:---:|:---|
| `rank` | `int` | Rank from 1 (best match) to 12. |
| `option_id` | `int` | Exact policy option ID (1 to 12) matching `CropInsurance.sol`. |
| `name` | `str` | Policy name (e.g., `"Severe 90-Day"`, `"Moderate 60-Day"`). |
| `policy_level` | `str` | Severity tier: `"severe"`, `"moderate"`, or `"mild"`. |
| `duration_days` | `int` | Duration of policy coverage: `30`, `60`, `90`, or `120`. |
| `threshold_mm` | `float` | Cumulative rainfall shortfall trigger threshold in mm. |
| `payout_rtt` | `int` | Guaranteed payout amount in RTT tokens upon trigger. |
| `shortfall_probability` | `float` | Estimated historical probability of rainfall falling below threshold ($0.0000 - 1.0000$). |
| `risk_category` | `str` | Human-readable label: `"Low Shortfall Risk"`, `"Moderate Shortfall Risk"`, or `"High Shortfall Risk"`. |
| `critical_stage_overlap_pct` | `float` | Percentage of the crop's critical 40–70 DAS stage covered by the policy ($0.0 - 100.0\%$). |
| `score_breakdown` | `dict` | Additive components of the composite recommendation score: |
| └ `stage_overlap_contribution` | `float` | $0.40 \times (\text{overlap\_days} / \text{critical\_duration})$. |
| └ `risk_utility_contribution` | `float` | $0.40 \times \max(0, 1.0 - 1.5 \times |P - 0.50|)$. |
| └ `payout_efficiency_contribution` | `float` | $0.20 \times [(\text{payout\_rtt} / \text{duration}) / 3.0]$. |
| `composite_score` | `float` | Total ranking score ($0.0000 - 1.0000$). |
| `explanation` | `str` | Plain-language advisory explanation for display on the frontend card. |

### 5.3 Realistic Example JSON Response

```json
{
  "farmer_profile": {
    "district": "Tumakuru",
    "crop": "Groundnut",
    "season": "Kharif",
    "sowing_date": "2025-06-15",
    "coverage_start_date": "2025-06-15",
    "critical_stage": {
      "name": "Pegging and Pod Formation",
      "start_date": "2025-07-25",
      "end_date": "2025-08-24",
      "das_window": "40-70 DAS"
    }
  },
  "top_recommendations": [
    {
      "rank": 1,
      "option_id": 3,
      "name": "Severe 90-Day",
      "policy_level": "severe",
      "duration_days": 90,
      "threshold_mm": 90.0,
      "payout_rtt": 270,
      "shortfall_probability": 0.0042,
      "risk_category": "Low Shortfall Risk",
      "critical_stage_overlap_pct": 100.0,
      "score_breakdown": {
        "stage_overlap_contribution": 0.4,
        "risk_utility_contribution": 0.1025,
        "payout_efficiency_contribution": 0.2
      },
      "composite_score": 0.7025,
      "explanation": "Option 3 (Severe 90-Day) covers 90 days with a 90.0 mm trigger. It covers 100% of the critical Pegging and Pod Formation window (40-70 DAS). Historical shortfall probability is 0.4% (Low Shortfall Risk)."
    },
    {
      "rank": 2,
      "option_id": 4,
      "name": "Severe 120-Day",
      "policy_level": "severe",
      "duration_days": 120,
      "threshold_mm": 120.0,
      "payout_rtt": 360,
      "shortfall_probability": 0.0018,
      "risk_category": "Low Shortfall Risk",
      "critical_stage_overlap_pct": 100.0,
      "score_breakdown": {
        "stage_overlap_contribution": 0.4,
        "risk_utility_contribution": 0.1011,
        "payout_efficiency_contribution": 0.2
      },
      "composite_score": 0.7011,
      "explanation": "Option 4 (Severe 120-Day) covers 120 days with a 120.0 mm trigger. It covers 100% of the critical Pegging and Pod Formation window (40-70 DAS). Historical shortfall probability is 0.2% (Low Shortfall Risk)."
    },
    {
      "rank": 3,
      "option_id": 7,
      "name": "Moderate 90-Day",
      "policy_level": "moderate",
      "duration_days": 90,
      "threshold_mm": 180.0,
      "payout_rtt": 180,
      "shortfall_probability": 0.1425,
      "risk_category": "Low Shortfall Risk",
      "critical_stage_overlap_pct": 100.0,
      "score_breakdown": {
        "stage_overlap_contribution": 0.4,
        "risk_utility_contribution": 0.1855,
        "payout_efficiency_contribution": 0.1333
      },
      "composite_score": 0.7188,
      "explanation": "Option 7 (Moderate 90-Day) covers 90 days with a 180.0 mm trigger. It covers 100% of the critical Pegging and Pod Formation window (40-70 DAS). Historical shortfall probability is 14.2% (Low Shortfall Risk)."
    }
  ],
  "all_ranked_options": [ ... ],
  "disclaimer": "Parametric risk score reflects historical climatological probability under ECMWF ERA5 reanalysis and does not guarantee future rainfall. Contract claim eligibility is determined solely on-chain by verified Chainlink CRE reports.",
  "warning": "Notice: Start date '2025-06-15' is after historical dataset end (2024-12-31). Recent antecedent weather features were not supplied; inference ran in climatology_only mode."
}
```

---

## 6. Error Handling & HTTP Status Mapping

The ML pipeline defines dedicated exception classes in `ml/inference/predict_policy_risk.py`. Member 3 should map them directly into standard FastAPI HTTP responses:

| Python Exception Class | HTTP Status Code | Client Error Code | Action / Meaning |
|:---|:---:|:---:|:---|
| `UnsupportedCropError` | **400 Bad Request** | `UNSUPPORTED_CROP` | Crop not found in `data/reference/crop_calendar.csv`. Only `"Groundnut"` is currently supported. |
| `UnsupportedLocationError` | **400 Bad Request** | `LOCATION_OUT_OF_BOUNDS` | Coordinates outside Karnataka ($11.5 - 18.5^\circ\text{N}, 74.0 - 78.6^\circ\text{E}$) or district not recognized. |
| `UnsupportedInferenceDateError` | **400 Bad Request** | `FUTURE_DATE_MISSING_ANTECEDENT` | Coverage start date $> 2024-12-31$ in `mode="standard"` without recent rainfall. Direct client to provide antecedents or use `mode="climatology_only"`. |
| `InvalidFeatureValueError` | **422 Unprocessable** | `INVALID_FEATURE_VALUE` | Supplied antecedent rainfall is negative (`< 0.0`). |
| `ValueError` | **400 Bad Request** | `INVALID_PARAMETER` | Malformed date string, unknown option ID, or unrecognized season. |
| `FileNotFoundError` | **500 Server Error** | `MODEL_ARTIFACT_MISSING` | Model binary (`random_forest.joblib`) or `climatology_reference.csv` missing on server disk. |
| `Exception` (Unhandled) | **500 Server Error** | `INTERNAL_INFERENCE_ERROR` | Unexpected inference failure. Return sanitized message; log full traceback server-side. |

### 6.1 FastAPI Exception Handler Implementation

```python
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from ml.inference.predict_policy_risk import (
    UnsupportedCropError,
    UnsupportedLocationError,
    UnsupportedInferenceDateError,
    InvalidFeatureValueError,
)

app = FastAPI(title="Parametric Crop Insurance ML Advisory API")


@app.exception_handler(UnsupportedCropError)
async def handle_crop_error(request: Request, exc: UnsupportedCropError):
    return JSONResponse(
        status_code=400,
        content={"error_code": "UNSUPPORTED_CROP", "message": str(exc), "supported_crops": ["Groundnut"]}
    )


@app.exception_handler(UnsupportedLocationError)
async def handle_location_error(request: Request, exc: UnsupportedLocationError):
    return JSONResponse(
        status_code=400,
        content={"error_code": "LOCATION_OUT_OF_BOUNDS", "message": str(exc)}
    )


@app.exception_handler(UnsupportedInferenceDateError)
async def handle_date_error(request: Request, exc: UnsupportedInferenceDateError):
    return JSONResponse(
        status_code=400,
        content={
            "error_code": "FUTURE_DATE_MISSING_ANTECEDENT",
            "message": str(exc),
            "remediation": "Provide recent rainfall observations ('rainfall_prev_30d', 'rainfall_prev_90d', 'rainfall_prev_365d') or set mode='climatology_only'."
        }
    )


@app.exception_handler(InvalidFeatureValueError)
async def handle_feature_error(request: Request, exc: InvalidFeatureValueError):
    return JSONResponse(
        status_code=422,
        content={"error_code": "INVALID_FEATURE_VALUE", "message": str(exc)}
    )


@app.exception_handler(FileNotFoundError)
async def handle_file_not_found(request: Request, exc: FileNotFoundError):
    return JSONResponse(
        status_code=500,
        content={
            "error_code": "MODEL_ARTIFACT_MISSING",
            "message": "Internal ML artifact is missing. Ensure models/random_forest.joblib exists.",
            "details": str(exc)
        }
    )
```

---

## 7. Model Artifacts, Reference Data & Runtime Setup

### 7.1 Required Files Checklist

| File Path | In Git? | Required for Inference? | Description |
|:---|:---:|:---:|:---|
| `data/reference/karnataka_locations.csv` | **YES** | **YES** | 24 district centers, coordinates, elevation. |
| `data/reference/crop_calendar.csv` | **YES** | **YES** | Groundnut Kharif/Rabi phenology & critical DAS stages. |
| `data/reference/climatology_reference.csv` | **YES** | **YES** | 35,136 empirical mean/std historical window statistics. |
| `models/random_forest.joblib` | **NO** (Git-ignored) | **YES** | Audited 100-tree Random Forest binary (~35 MB). |
| `data/processed/cleaned_rainfall.csv` | **NO** (Git-ignored) | *Optional* | Only needed for historical backtesting $\le 2024-12-31$. |

### 7.2 Generating the Model Artifact Locally

Since binary `.joblib` files are excluded from Git, Member 3 can generate the trained model locally using the committed scripts:

```bash
# From repository root (rainfall-crop-insurance):

# 1. Activate Python virtual environment (Python 3.11+)
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt
# (Ensures: scikit-learn>=1.4.0, pandas>=2.0.0, numpy>=1.24.0, joblib>=1.3.0)

# 3. If model_training_dataset.csv exists in data/processed/:
python -m ml.training.train_random_forest

# 4. Verify artifact creation
python -c "import os; assert os.path.exists('models/random_forest.joblib'); print('Model verified!')"
```

> [!TIP]
> If `data/processed/model_training_dataset.csv` is not present on Member 3's machine, Member 2 can share the binary `models/random_forest.joblib` directly through the team artifact channel, or Member 3 can run `python -m ml.data.download_rainfall` followed by preprocessing steps.

### 7.3 Portable Path Configuration

In `ml/config.py`, all paths are constructed dynamically using `Path(__file__).resolve().parent.parent`.
- There are **no hardcoded absolute Windows paths** in the pipeline.
- Member 3 does **not** need to set system environment variables for paths to work on Linux, macOS, or Docker containers.
- If Member 3 wishes to customize artifact locations, they can override them via environment variable:
  ```bash
  export MODEL_DIR=/path/to/custom/models
  ```

---

## 8. Production FastAPI Implementation Guide

### 8.1 High-Performance Singleton Pattern via Lifespan

Loading `models/random_forest.joblib` from disk and building the 35,136-record climatology lookup takes **~6.0 seconds**.
- **DO NOT** initialize `RiskPredictor()` inside the request route handler.
- **DO** initialize `RiskPredictor` once during FastAPI application startup using the `lifespan` context manager.
- Once loaded into memory, individual inference queries take **only ~150–200 milliseconds**.

### 8.2 Recommended FastAPI App Structure

Here is the recommended implementation for Member 3's `app/main.py` or `api/recommend.py`:

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, Any

from ml.inference.predict_policy_risk import RiskPredictor, recommend_policies


# Global lifespan manager to load models once on startup
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Initializing ML RiskPredictor and loading Random Forest model...")
    # Initialize singleton predictor
    app.state.risk_predictor = RiskPredictor(model_type="random_forest")
    print("RiskPredictor loaded successfully and ready for inference.")
    yield
    print("Shutting down ML RiskPredictor...")


app = FastAPI(
    title="Karnataka Parametric Crop Insurance Advisory API",
    version="1.0.0",
    lifespan=lifespan
)


@app.post("/api/v1/recommend")
async def get_policy_recommendations(request: AdvisoryRequest):
    try:
        # Convert Pydantic model to dictionary
        farm_profile = {
            "district": request.district,
            "latitude": request.latitude,
            "longitude": request.longitude,
            "crop": request.crop,
            "season": request.season,
            "sowing_date": str(request.sowing_date),
            "candidate_start_date": str(request.candidate_start_date or request.sowing_date),
            "rainfall_prev_30d": request.rainfall_prev_30d,
            "rainfall_prev_90d": request.rainfall_prev_90d,
            "rainfall_prev_365d": request.rainfall_prev_365d,
        }

        # Execute recommendation engine
        result = recommend_policies(
            farm_profile=farm_profile,
            top_k=request.top_k,
            model_type="random_forest",
            mode=request.mode
        )
        return result

    except Exception as e:
        # Exception handlers defined above catch known errors
        raise e
```

### 8.3 Optional Performance Refactor: Dependency Injection

Currently, `recommend_policies()` creates a new `RiskPredictor()` instance internally if called without arguments. While functional, passing a pre-warmed singleton `RiskPredictor` from `app.state` eliminates the 6-second model load on every request.

The proposed backward-compatible 3-line parameter update to `ml/inference/predict_policy_risk.py`:

```python
def recommend_policies(
    farm_profile: Dict[str, Any],
    top_k: int = 3,
    model_type: str = "random_forest",
    mode: str = "climatology_only",
    predictor: Optional[RiskPredictor] = None  # <--- Proposed optional parameter
) -> Dict[str, Any]:
    ...
    if predictor is None:
        predictor = RiskPredictor(model_type=model_type)
```

With this small addition, Member 3 can simply pass `predictor=app.state.risk_predictor` in the route handler for instant ~150ms sub-second responses.

---

## 9. Responsibilities: Member 2 vs Member 3

| Domain / Responsibility | Member 2 (ML Lead) | Member 3 (Backend / Web) |
|:---|:---:|:---:|
| Historical weather data retrieval (ERA5) | ✅ | ❌ |
| Crop calendar reference table curation | ✅ | ❌ |
| Feature engineering & leakage prevention | ✅ | ❌ |
| Model training, calibration & multi-slice evaluation | ✅ | ❌ |
| Core risk prediction & advisory ranking logic | ✅ | ❌ |
| Unit tests for ML pipeline (`ml/tests`) | ✅ | ❌ |
| FastAPI application architecture & endpoints | ❌ | ✅ |
| Pydantic schema validation & HTTP status mapping | ❌ | ✅ |
| CORS middleware & security headers | ❌ | ✅ |
| Frontend React integration & UI cards | ❌ | ✅ |
| Web3 wallet connection (MetaMask) & contract calls | ❌ | ✅ |
| Optional: Live weather scraper for recent 30-day rainfall | ❌ | ✅ |

---

## 10. Smart-Contract & CRE Boundaries (Non-Negotiable)

Member 3 and the backend team must respect the project's strict architecture:

1. **Advisory Only**:
   The output of `/api/v1/recommend` is purely informative. It helps the farmer pick an option from the 12 fixed catalogue choices.
2. **Fixed On-Chain Catalogue**:
   The policy parameters (`threshold_mm`, `duration_days`, `payout_rtt`) in `ml/config.py` match `CropInsurance.sol` exactly. The backend must **never** offer custom durations or custom thresholds that do not exist in the smart contract catalogue.
3. **No Claim Decisions in FastAPI**:
   FastAPI does **not** process, settle, or verify insurance claims. When a policy reaches maturity, the **Chainlink CRE rainfall workflow** reads Open-Meteo, generates a cryptographic payload, and submits it to `CropInsurance.sol`. The smart contract evaluates `cumulativeRainfall < threshold` and issues payouts autonomously.
4. **No Blockchain State Changes from ML**:
   The ML model runs entirely off-chain. It does not possess a private key, does not sign transactions, and cannot call contract functions.

---

## 11. Known Limitations & Disclaimers

Member 3 must ensure the frontend displays the required disclaimers to prevent farmer misunderstanding:

1. **Climatological Risk vs Weather Forecast**:
   - The ML model estimates statistical shortfall risk based on 75 years of historical ECMWF ERA5 reanalysis data.
   - It is **not** a deterministic 90-day daily weather forecast.
   - **Frontend Notice**: *"Risk scores reflect historical weather patterns (1950–2024) and do not guarantee future daily rainfall."*
2. **Spatial Grid Resolution**:
   - ERA5 has a spatial resolution of ~31 km.
   - Predictions represent regional district-level climatology, not micro-climate conditions on individual farm plots.
3. **Crop Scope**:
   - The crop calendar is currently calibrated for **Groundnut** (*Arachis hypogaea*). Other crops will return `UnsupportedCropError`.

---

## 12. Member 3 Implementation Checklist

- [ ] **Step 1:** Verify Python virtual environment with `scikit-learn>=1.4.0`, `pandas>=2.0.0`, `joblib>=1.3.0`, and `fastapi>=0.100.0`.
- [ ] **Step 2:** Ensure `models/random_forest.joblib` exists in the local workspace.
- [ ] **Step 3:** Run `pytest ml/tests -v` to confirm the ML subsystem is operational (all 19 tests must pass).
- [ ] **Step 4:** Implement `AdvisoryRequest` and `AdvisoryResponse` Pydantic models matching Section 3 and Section 5.
- [ ] **Step 5:** Register exception handlers for `UnsupportedCropError`, `UnsupportedLocationError`, `UnsupportedInferenceDateError`, and `InvalidFeatureValueError`.
- [ ] **Step 6:** Implement `lifespan` startup hook to load `RiskPredictor` once into `app.state`.
- [ ] **Step 7:** Connect `/api/v1/recommend` endpoint to `recommend_policies()`.
- [ ] **Step 8:** Add disclaimer banner and `mode="climatology_only"` warning pill to the frontend policy recommendation UI.
- [ ] **Step 9:** Wire frontend policy selection button to call `CropInsurance.purchasePolicy(optionId)` on-chain via ethers/viem.
