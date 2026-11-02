"""recommend.py

Core recommendation engine and model adapter for AgriShield AI Service.
Implements requirements M3-AI04 through M3-AI08, Appendix A.4, and Phase 3 specifications:
- Groundnut: Uses Person 2's audited Random Forest ML model (random_forest.joblib)
  and 75-year empirical climatology lookup in climatology_only mode.
- Other supported crops (rice, wheat, maize, etc.): Retains Member 3's existing advisory fallback.
- Option 0 (2-hour Demo) is NEVER applicable and NEVER recommended.
- Preserves the existing API contract for POST /recommend without breaking the frontend.
- ML recommendations are strictly advisory and never determine on-chain claim eligibility.
"""

import logging
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any

from schemas import (
    RecommendRequest,
    RecommendResponse,
    OptionApplicability,
    OptionInput,
)
from model_loader import (
    ArtifactManager,
    PRODUCTION_METADATA,
    MOCK_METADATA,
)
from weather_client import fetch_historical_rainfall

logger = logging.getLogger("agrishield_ai_service.recommend")


def _generate_groundnut_ml_recommendation(
    request: RecommendRequest, predictor: Any
) -> RecommendResponse:
    """Executes Person 2's Random Forest inference engine for Groundnut in Karnataka."""
    sowing_dt = datetime.strptime(request.sowing_date, "%Y-%m-%d")
    as_of_dt = (
        datetime.strptime(request.as_of_date, "%Y-%m-%d")
        if request.as_of_date
        else datetime.now()
    )

    # Groundnut phenology (ICRISAT / UAS Bangalore standard: 40-70 DAS pegging/pod stage)
    crit_start_das = 40
    crit_end_das = 70
    crit_stage_name = "Pegging and Pod Formation"
    crit_stage_duration = (crit_end_das - crit_start_das) + 1  # 31 days

    crit_stage_start_date = sowing_dt + timedelta(days=crit_start_das)
    crit_stage_end_date = sowing_dt + timedelta(days=crit_end_das)

    options_eval: List[OptionApplicability] = []
    applicable_options: List[Dict[str, Any]] = []

    for opt in request.options:
        # Rule M3-AI06: Option 0 (2-hour Demo) is NEVER applicable for seasonal crop forecasting
        if opt.option_id == 0 or opt.duration_seconds < 86400:
            options_eval.append(
                OptionApplicability(
                    option_id=opt.option_id,
                    applicable=False,
                    probability_below_trigger=None,
                    reason="Window too short for a seasonal model",
                )
            )
            continue

        # Evaluate risk using Person 2's Random Forest model
        try:
            # Policy catalogue options 1-12 correspond to agricultural catalogue
            pred_query = {
                "latitude": request.latitude,
                "longitude": request.longitude,
                "start_date": request.sowing_date,
                "option_id": opt.option_id if 1 <= opt.option_id <= 12 else 1,
            }
            pred_res = predictor.predict_shortfall_probability(
                query=pred_query, mode="climatology_only"
            )
            prob = float(pred_res["shortfall_probability"])
            risk_cat = pred_res.get("risk_category", "Moderate Shortfall Risk")

            options_eval.append(
                OptionApplicability(
                    option_id=opt.option_id,
                    applicable=True,
                    probability_below_trigger=prob,
                    reason=None,
                )
            )

            # Compute crop-stage overlap and composite ranking score
            dur_days = opt.duration_seconds / 86400.0
            policy_start = sowing_dt
            policy_end = sowing_dt + timedelta(days=dur_days - 1)

            overlap_start = max(policy_start, crit_stage_start_date)
            overlap_end = min(policy_end, crit_stage_end_date)
            overlap_days = max(0, (overlap_end - overlap_start).days + 1)
            overlap_pct = min(100.0, (overlap_days / crit_stage_duration) * 100.0)

            stage_score = overlap_pct / 100.0
            payout_efficiency = (opt.payout / dur_days) / 3.0
            risk_utility = max(0.0, 1.0 - abs(prob - 0.50) * 1.5)
            composite_score = (
                0.40 * stage_score +
                0.40 * risk_utility +
                0.20 * payout_efficiency
            )

            applicable_options.append({
                "option_input": opt,
                "prob": prob,
                "risk_category": risk_cat,
                "duration_days": dur_days,
                "overlap_pct": overlap_pct,
                "composite_score": composite_score,
            })
        except Exception as err:
            logger.warning(
                "[Recommend] Predictor failed for Option %d: %s. Marking non-applicable.",
                opt.option_id,
                err,
            )
            options_eval.append(
                OptionApplicability(
                    option_id=opt.option_id,
                    applicable=False,
                    probability_below_trigger=None,
                    reason=f"Model evaluation unavailable: {err}",
                )
            )

    # Select best option based on composite score
    if applicable_options:
        best = max(applicable_options, key=lambda x: x["composite_score"])
        recommended_option_id = best["option_input"].option_id
        best_prob = best["prob"]
        best_cat = best["risk_category"]
        best_dur = int(best["duration_days"])
        best_trigger = best["option_input"].trigger_mm
        best_overlap = best["overlap_pct"]

        rationale = (
            f"High risk protection during Groundnut {crit_stage_name} ({crit_start_das}-{crit_end_das} DAS). "
            f"Option {recommended_option_id} covers {best_dur} days ({best_overlap:.0f}% critical overlap) "
            f"with a {best_trigger} mm trigger. Historical shortfall probability is {best_prob*100:.1f}% ({best_cat})."
        )
    else:
        # Fallback if no valid seasonal options passed
        recommended_option_id = request.options[0].option_id
        rationale = f"Advisory evaluation for Groundnut {crit_stage_name}."

    # Suggested start date aligned with critical growth window (40 DAS)
    target_start_dt = sowing_dt + timedelta(days=crit_start_das)
    if target_start_dt <= as_of_dt:
        target_start_dt = as_of_dt + timedelta(days=1)
    suggested_start_date = target_start_dt.strftime("%Y-%m-%d")

    return RecommendResponse(
        recommended_option_id=recommended_option_id,
        suggested_start_date=suggested_start_date,
        rationale=rationale,
        options=options_eval,
        model_name=PRODUCTION_METADATA["model_name"],
        model_version=PRODUCTION_METADATA["model_version"],
        trained_on_range=PRODUCTION_METADATA["trained_on_range"],
        advisory=True,
    )


def _generate_mock_advisory_recommendation(
    request: RecommendRequest,
) -> RecommendResponse:
    """Fallback advisory logic for other crops or when real ML artifacts are unavailable."""
    model = ArtifactManager.get_mock_model()
    crop_table = ArtifactManager.get_crop_table()

    crop_info = crop_table.get(
        request.crop.lower(),
        {
            "critical_stage": "vegetative and flowering stage",
            "critical_window_start_day": 30,
            "critical_duration_days": 30,
            "baseline_deficit_risk": 0.55,
        },
    )

    sowing_dt = datetime.strptime(request.sowing_date, "%Y-%m-%d")
    as_of_dt = (
        datetime.strptime(request.as_of_date, "%Y-%m-%d")
        if request.as_of_date
        else datetime.now()
    )

    # 1. Fetch recent rainfall history
    hist_start = (as_of_dt - timedelta(days=30)).strftime("%Y-%m-%d")
    hist_end = as_of_dt.strftime("%Y-%m-%d")
    recent_rainfall = fetch_historical_rainfall(
        request.latitude, request.longitude, hist_start, hist_end
    )
    avg_recent = sum(recent_rainfall) / max(len(recent_rainfall), 1)

    # 2. Evaluate each candidate option
    options_eval: List[OptionApplicability] = []
    applicable_options: List[OptionInput] = []

    for opt in request.options:
        if opt.option_id == 0 or opt.duration_seconds < 86400:
            options_eval.append(
                OptionApplicability(
                    option_id=opt.option_id,
                    applicable=False,
                    probability_below_trigger=None,
                    reason="Window too short for a seasonal model",
                )
            )
            continue

        prob = model.predict_probability_below_trigger(
            crop=request.crop,
            duration_seconds=opt.duration_seconds,
            trigger_mm=opt.trigger_mm,
            observed_recent_rainfall=avg_recent,
        )

        options_eval.append(
            OptionApplicability(
                option_id=opt.option_id,
                applicable=True,
                probability_below_trigger=prob,
                reason=None,
            )
        )
        applicable_options.append(opt)

    # 3. Select best option matching crop stage duration
    critical_days = crop_info["critical_duration_days"]

    if applicable_options:
        def score_option(o: OptionInput) -> float:
            duration_days = o.duration_seconds / 86400.0
            duration_diff = abs(duration_days - critical_days)
            eval_item = next(
                (e for e in options_eval if e.option_id == o.option_id), None
            )
            prob = (
                eval_item.probability_below_trigger
                if eval_item and eval_item.probability_below_trigger
                else 0.5
            )
            return duration_diff * 1.5 + abs(prob - 0.6) * 10

        best_opt = min(applicable_options, key=score_option)
        recommended_option_id = best_opt.option_id
    else:
        recommended_option_id = request.options[0].option_id

    # 4. Suggested start date aligned with critical window
    stage_start_offset = crop_info["critical_window_start_day"]
    target_start_dt = sowing_dt + timedelta(days=stage_start_offset)
    if target_start_dt <= as_of_dt:
        target_start_dt = as_of_dt + timedelta(days=1)
    suggested_start_date = target_start_dt.strftime("%Y-%m-%d")

    # 5. Formulate plain-language rationale
    crop_stage = crop_info["critical_stage"]
    rationale = f"Moderate cover over the {crop_stage}"

    return RecommendResponse(
        recommended_option_id=recommended_option_id,
        suggested_start_date=suggested_start_date,
        rationale=rationale,
        options=options_eval,
        model_name=MOCK_METADATA["model_name"],
        model_version=MOCK_METADATA["model_version"],
        trained_on_range=MOCK_METADATA["trained_on_range"],
        advisory=True,
    )


def generate_recommendation(request: RecommendRequest) -> RecommendResponse:
    """Routes incoming recommendation request according to crop and artifact readiness.

    - Groundnut: Uses Person 2's real Random Forest model if available.
    - Other supported crops or model unavailable: Falls back to mock advisory.
    """
    crop_clean = request.crop.strip().lower()

    if crop_clean == "groundnut" and ArtifactManager.is_production_ready():
        predictor = ArtifactManager.get_risk_predictor()
        try:
            return _generate_groundnut_ml_recommendation(request, predictor)
        except Exception as err:
            logger.error(
                "[Recommend] Groundnut ML recommendation failed: %s. Falling back to advisory.",
                err,
                exc_info=True,
            )

    return _generate_mock_advisory_recommendation(request)
