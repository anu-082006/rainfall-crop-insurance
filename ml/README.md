# Karnataka Rainfall-Risk Machine Learning Pipeline & Advisory Layer

This directory contains the audited, reproducible end-to-end Machine Learning pipeline and agronomic advisory layer for the **Rainfall-Based Parametric Crop Insurance DApp** (`rainfall-crop-insurance`).

---

## 1. Executive Summary & Architecture

The ML subsystem solves two distinct problems with strict architectural boundaries:
1. **Parametric Climatological Risk Prediction**:
   $$\mathbb{P}(\text{Accumulated Rainfall} < \text{Policy Threshold} \mid \text{Location}, \text{Start Date}, \text{Duration}, \text{Antecedent Weather}, \text{Climatology})$$
2. **Agronomic Advisory & Catalogue Ranking**:
   Matches policy durations (30, 60, 90, 120 days) against crop calendar vulnerability phases (pegging and pod formation for Groundnut).
3. **Strict On-Chain Decoupling**:
   The model estimates statistical risk for farmer advisory; smart contracts and Chainlink CRE workflows remain the sole authority for claim eligibility and payouts.

```
+-----------------------------------------------------------------------------------+
|                            OFF-CHAIN ML PIPELINE                                  |
|                                                                                   |
|  1. ECMWF ERA5 Daily Rainfall (1950-2024, 24 Locations across 5 Karnataka Zones)   |
|                                     │                                             |
|                                     ▼                                             |
|  2. Historical Coverage Windows (1,124,136 windows for Options 1-12)              |
|                                     │                                             |
|                                     ▼                                             |
|  3. Causal Feature Engineering (Pre-window Antecedents + Expanding Climatology)  |
|                                     │                                             |
|                                     ▼                                             |
|  4. Chronological Splits with 120-Day Purge Buffers (Train <=2014, Val, Test)     |
|                                     │                                             |
|                                     ▼                                             |
|  5. Calibration Audit & Model Selection (Random Forest vs Logistic Regression)    |
|                                     │                                             |
|                                     ▼                                             |
|  6. Crop Calendar Alignment & Advisory Ranking (Pegging & Pod Formation 40-70 DAS)|
+-----------------------------------------------------------------------------------+
                                      │
            Advisory Only (Farmer Portal / Member 3 FastAPI)
                                      ▼
+-----------------------------------------------------------------------------------+
|                            ON-CHAIN EXECUTION                                     |
|  - Farmer enrolls in fixed policy Option (1-12) via CropInsurance.sol            |
|  - At maturity, Chainlink CRE Workflow aggregates exact Open-Meteo observations   |
|  - Smart Contract executes automated payout if Cumulative Rainfall < Threshold    |
+-----------------------------------------------------------------------------------+
```

---

## 2. Dataset Record-Count Reconciliation

The pipeline enforces strict mathematical conservation across all preprocessing, warm-up filtering, and chronological splitting stages:

| Pipeline Stage | Record Count | Explanation |
|:---|:---:|:---|
| **1. Initial Generated Coverage Windows** | **1,124,136** | 24 locations $\times$ 75 years $\times$ 4 durations $\times$ 3 threshold levels at weekly start cadence. |
| **2. Warm-Up Period Filtered** | **-526,176** | Initial 5 years (1950–1954) require at least 5 prior years of history to establish expanding climatology ($\text{min\_periods}=5$). |
| **3. Final Feature Dataset (`model_training_dataset.csv`)** | **597,960** | Unbroken, leakage-free historical records spanning 1955 through 2024. |
| **4. Training Set Split ($\le 2014$)** | **445,824** | Windows starting $\ge 1955-01-01$ and ending $\le 2014-12-31$ with start dates $\le 2014-09-02$. |
| **5. Validation Set Split (2015–2019)** | **70,272** | Windows starting $\ge 2015-01-01$ and ending $\le 2019-12-31$ with start dates $\le 2019-09-02$. |
| **6. Held-Out Test Set Split (2020–2024)** | **72,072** | Windows starting $\ge 2020-01-01$ and ending $\le 2024-12-31$. |
| **7. 120-Day Boundary Purge Buffers** | **9,792** | Windows starting in the final 120 days of 2014 and 2019 purged to prevent temporal overlap leakage: <br>• Autumn 2014 Purge: **4,896 records** (`2014-09-07` to `2014-12-28`) <br>• Autumn 2019 Purge: **4,896 records** (`2019-09-08` to `2019-12-29`) |
| **Reconciliation Identity** | **$\mathbf{597,960}$** | $\text{Train } (445,824) + \text{Val } (70,272) + \text{Test } (72,072) + \text{Purged } (9,792) = \mathbf{597,960}$. |

---

## 3. Probability Calibration Audit

### 3.1 Experimental Design
- **Base Models**: Logistic Regression and Random Forest trained with `class_weight=None` (unweighted) and `class_weight='balanced'`.
- **Calibration Fit**: Sigmoid (Platt scaling) and Isotonic calibrations were fitted **strictly on the Validation Set (2015–2019)** using `FrozenEstimator`. Test data was strictly held out.
- **Evaluation**: Evaluated on the untouched Test Set (2020–2024, 72,072 records).

### 3.2 Calibration Results Table

| Candidate Model Variant | Calibration Method | ROC-AUC | PR-AUC | Brier Score | Log Loss | ECE |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| **LR (`class_weight=None`)** | Raw | 0.9600 | 0.9467 | 0.0853 | 0.2769 | 0.0583 |
| **LR (`class_weight=None`)** | Sigmoid (Val) | 0.9600 | 0.9467 | 0.0859 | 0.2783 | 0.0591 |
| **LR (`class_weight=None`)** | Isotonic (Val) | 0.9600 | 0.9440 | 0.0826 | 0.2815 | 0.0592 |
| **LR (`class_weight='balanced'`)** | Raw | 0.9604 | 0.9474 | 0.0829 | 0.2702 | **0.0495** |
| **LR (`class_weight='balanced'`)** | Sigmoid (Val) | 0.9604 | 0.9474 | 0.0856 | 0.2773 | 0.0590 |
| **LR (`class_weight='balanced'`)** | Isotonic (Val) | 0.9603 | 0.9445 | 0.0823 | 0.2804 | 0.0591 |
| **RF (`class_weight=None`)** | Raw | **0.9704** | **0.9658** | 0.0753 | 0.2417 | 0.0572 |
| **RF (`class_weight=None`)** | Sigmoid (Val) | **0.9704** | **0.9658** | 0.0792 | 0.2662 | 0.0613 |
| **RF (`class_weight=None`)** | Isotonic (Val) | 0.9703 | 0.9638 | 0.0750 | 0.2435 | 0.0611 |
| **RF (`class_weight='balanced'`)** | **Raw (Selected)** | 0.9702 | 0.9656 | **0.0736** | **0.2371** | 0.0503 |
| **RF (`class_weight='balanced'`)** | Sigmoid (Val) | 0.9702 | 0.9656 | 0.0788 | 0.2657 | 0.0617 |
| **RF (`class_weight='balanced'`)** | Isotonic (Val) | 0.9701 | 0.9633 | 0.0752 | 0.2444 | 0.0612 |

### 3.3 Key Audit Insights & Model Selection Reasoning
1. **Class Weighting (`class_weight='balanced'`)**:
   Even though target classes are approximately balanced (52.6% train vs 44.5% test), `class_weight='balanced'` lowers test Brier score (0.0753 $\to$ 0.0736) and log loss (0.2417 $\to$ 0.2371) by preventing over-confidence on the training majority class.
2. **Post-Hoc Calibration Overfitting**:
   Post-hoc calibrators (Sigmoid or Isotonic) fitted on the 2015–2019 validation epoch overfit to the severe 2015/2016 Karnataka drought anomalies, increasing test log loss when applied to 2020–2024. The raw ensemble voting probabilities are naturally well-calibrated (ECE 0.0503).
3. **Final Model Selection**:
   **Random Forest Classifier (Raw, balanced)** is selected because it delivers superior discrimination (ROC-AUC **0.9702**, PR-AUC **0.9656**) and the lowest Brier score (**0.0736**) and Log Loss (**0.2371**).

---

## 4. Multi-Slice Performance & Spatial Limitations

Evaluation across slices on the held-out Test set (2020–2024, 72,072 records) stored in [`reports/slice_evaluation_report.json`](file:///C:/Users/Ankitha%20Hathwar/OneDrive/Desktop/Crop_Insurance/rainfall-crop-insurance/reports/slice_evaluation_report.json):

### 4.1 By Agro-climatic Zone
| Zone | Locations | Test Records | Shortfall Rate | ROC-AUC | Brier Score | Characteristics |
|:---|:---:|:---:|:---:|:---:|:---:|:---|
| **Coastal** | Mangaluru, Udupi, Karwar | 9,009 | 33.1% | **0.9784** | **0.0635** | High monsoon volume; low shortfall rate. |
| **Northern Interior** | Belagavi, Dharwad, Vijayapura, etc. | 33,033 | 50.3% | **0.9740** | **0.0690** | Semi-arid plains; balanced shortfall classes. |
| **Malnad** | Shivamogga, Chikkamagaluru, Kodagu, Hassan | 12,012 | 34.0% | **0.9690** | **0.0682** | Ghats windward slopes; high rainfall reliability. |
| **Southern Interior** | Tumakuru, Mandya | 6,006 | 40.1% | **0.9629** | **0.0761** | Rainfed groundnut heartland; high seasonal variance. |
| **Central** | Davanagere, Chitradurga, Ballari, Vijayanagara | 12,012 | 49.9% | **0.9540** | **0.0977** | Rain shadow; localized convective storm noise. |

### 4.2 By Policy Duration & Severity
- **30-Day Policies**: ROC-AUC = 0.9535, Brier = 0.0885. Highest weather volatility (a single localized thunderstorm can cross a 30 mm trigger).
- **120-Day Policies**: ROC-AUC = **0.9766**, Brier = **0.0694**. Longer accumulation smooths convective noise.
- **Severe Trigger (1 mm/day)**: ROC-AUC = **0.9750**, Brier = **0.0622**.
- **Mild Trigger (3 mm/day)**: ROC-AUC = 0.9606, Brier = 0.0887.

### 4.3 By Seasonal Period
- **Kharif (Monsoon, Jun–Sep)**: Shortfall rate is only **8.3%**; ROC-AUC is **0.9128**, Brier is **0.0593**.
- **Rabi (Post-monsoon, Oct–Dec)**: Shortfall rate is **78.7%**; ROC-AUC is **0.9222**, Brier is **0.0951**.

> [!WARNING]
> **Spatial Resolution Limitation**: The model is trained on 24 district-centre coordinates mapped from ECMWF ERA5 reanalysis (~31 km grid resolution). It reflects regional district climatology and **does NOT provide village-level microclimate resolution** or field-specific terrain variations.

---

## 5. Inference Architecture & Date Handling

Implemented in [`ml/inference/predict_policy_risk.py`](file:///C:/Users/Ankitha%20Hathwar/OneDrive/Desktop/Crop_Insurance/rainfall-crop-insurance/ml/inference/predict_policy_risk.py):

### 5.1 Precomputed Climatology Reference Table
Stored in [`data/reference/climatology_reference.csv`](file:///C:/Users/Ankitha%20Hathwar/OneDrive/Desktop/Crop_Insurance/rainfall-crop-insurance/data/reference/climatology_reference.csv) (35,136 empirical rows):
For every $(location\_id, \text{day\_of\_year}, \text{duration\_days})$, the exact 75-year historical mean and standard deviation are looked up instantly. No arbitrary guesses or hardcoded multipliers.

### 5.2 Antecedent Weather Validation Rules
- **Historical Dates ($\le 2024-12-31$)**:
  Antecedent features (`rainfall_prev_30d`, `90d`, `365d`) are extracted automatically from the cleaned historical daily dataset.
- **Future / Out-of-Dataset Dates ($> 2024-12-31$)**:
  1. If the caller supplies explicit recent observations (e.g. from a rain gauge), they are validated (must be non-negative) and used.
  2. If antecedent features are missing in default `mode='standard'`, the predictor **strictly raises `UnsupportedInferenceDateError`**, preventing misleading predictions based on silent default substitutions.
  3. If the caller explicitly requests baseline climatological risk (`mode='climatology_only'`), the predictor uses the historical seasonal baseline and returns an explicit `"warning"` flag in the payload.

---

## 6. Recommendation Layer & Composite Score Calculation

Implemented in [`ml/inference/predict_policy_risk.py`](file:///C:/Users/Ankitha%20Hathwar/OneDrive/Desktop/Crop_Insurance/rainfall-crop-insurance/ml/inference/predict_policy_risk.py):

### 6.1 Agronomic Score Formula
$$\text{Composite Score} = 0.40 \times \left(\frac{\text{Overlap Days}}{\text{Critical Duration}}\right) + 0.40 \times \text{Risk Utility} + 0.20 \times \left(\frac{\text{Payout RTT / Day}}{3.0}\right)$$
- **Stage Overlap (40%)**: Ratio of coverage window $[T, T + D - 1]$ overlapping the 40–70 DAS pegging phase.
- **Risk Utility (40%)**: $\max(0.0, 1.0 - 1.5 \times |P - 0.50|)$. Optimizes for meaningful parametric risk.
- **Payout Efficiency (20%)**: Normalized payout rate (Severe = 3 RTT/day $\to 1.0$, Moderate = 2 RTT/day $\to 0.67$, Mild = 1 RTT/day $\to 0.33$).

### 6.2 Example Recommendation: Tumakuru Kharif Groundnut
- **Farmer Profile**: Sown `2024-06-15`, Critical Pegging Phase `2024-07-25` to `2024-08-24` (31 days).
- **Top 1 Recommendation**: **Option 3 (Severe 90-Day)**
  - Coverage: 90 Days (`2024-06-15` to `2024-09-12`) | Trigger: 90.0 mm | Payout: 270 RTT
  - Critical Stage Overlap: **100%** (Contribution: $0.40 \times 1.0 = \mathbf{0.40}$)
  - Shortfall Probability: **0.4%** (Contribution: $\mathbf{0.1021}$)
  - Payout Efficiency: **3 RTT/day** (Contribution: $0.20 \times 1.0 = \mathbf{0.20}$)
  - **Composite Score**: **0.7021**
- **Validation**: 30-day policies starting on sowing date receive **0% stage overlap**, correctly penalizing under-coverage.

---

## 7. Automated Test Suite (19 Passed)

Executed via `pytest ml/tests -v`:
1. `test_catalogue_options_structure` (Catalogue integrity)
2. `test_rainfall_aggregation_and_strict_inequality` ($R < T \implies y=1, R \ge T \implies y=0$)
3. `test_missing_observation_invalidates_window` (NaN invalidation)
4. `test_antecedent_rainfall_has_no_leakage` (Pre-window boundary)
5. `test_expanding_climatology_has_no_future_leakage` (Expanding historical baseline $y < Y$)
6. `test_target_is_not_in_feature_columns` (Target leakage audit)
7. `test_chronological_split_purity_and_purge_buffer` ($\ge 120$-day temporal buffer)
8. `test_models_predict_valid_probabilities` (Probability range $[0, 1]$)
9. `test_recommendation_layer_ranking_and_disclaimer` (Catalogue ranking & disclaimer)
10. `test_inference_rejects_future_dates_when_antecedent_missing` (`UnsupportedInferenceDateError`)
11. `test_inference_accepts_future_dates_with_explicit_antecedent_features` (Validated inputs)
12. `test_inference_rejects_negative_rainfall` (`InvalidFeatureValueError`)
13. `test_climatology_only_mode_provides_explicit_notice` (Climatology-only warning)
14. `test_unsupported_crop_rejection` (`UnsupportedCropError`)
15. `test_unsupported_location_rejection` (`UnsupportedLocationError`)
16. `test_crop_stage_overlap_calculation` (Agronomic overlap formula)
17. `test_dataset_record_count_reconciliation` (Exact 9,792 purged record conservation)
18. `test_calibration_fits_strictly_on_validation_data_without_test_leakage` (Validation-only calibration)
19. `test_slice_evaluation_handles_single_class_gracefully` (Single-class robustness)

---

## 8. Pipeline Reproduction Commands

Run from `rainfall-crop-insurance`:

```powershell
# 1. Download and cache 75 years of ERA5 daily rainfall across Karnataka
python -m ml.data.download_rainfall

# 2. Validate data integrity and generate quality report
python -m ml.preprocessing.clean_rainfall

# 3. Generate 1.12M coverage windows across catalogue options
python -m ml.preprocessing.generate_windows --step-days 7

# 4. Compute causal antecedent and climatological features
python -m ml.preprocessing.feature_engineering

# 5. Train Logistic Regression baseline
python -m ml.training.train_logistic_regression

# 6. Train Random Forest baseline
python -m ml.training.train_random_forest

# 7. Evaluate both models and perform calibration audit
python -m ml.evaluation.evaluate_models

# 8. Run multi-slice spatial and temporal evaluation
python -m ml.evaluation.slice_evaluation

# 9. Run sample farmer recommendation
python -m ml.inference.predict_policy_risk

# 10. Run complete automated unit test suite
pytest ml/tests -v
```
