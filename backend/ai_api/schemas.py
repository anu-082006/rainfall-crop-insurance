"""schemas.py

Pydantic data models for the AgriShield AI Recommendation Service.
Implements request validation and response formatting strictly adhering to
RPD Version 2.0 Section 5.1 and Appendix A.4.
"""

from typing import List, Optional
from pydantic import BaseModel, Field, field_validator
import re

SUPPORTED_CROPS = [
    "groundnut",
    "rice",
    "wheat",
    "maize",
    "cotton",
    "sorghum",
    "soybean",
    "sunflower",
]

DATE_REGEX = re.compile(r"^\d{4}-\d{2}-\d{2}$")


class OptionInput(BaseModel):
    """Candidate policy option input from the contract catalogue."""
    option_id: int = Field(..., ge=0, description="On-chain catalogue option ID")
    duration_seconds: int = Field(..., gt=0, description="Coverage duration in seconds")
    trigger_mm: int = Field(..., ge=0, description="Rainfall trigger threshold in millimeters")
    payout: float = Field(..., ge=0, description="Guaranteed payout in RTT tokens")


class RecommendRequest(BaseModel):
    """Input payload for POST /recommend endpoint (RPD Section 5.1 & Appendix A.4)."""
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Farm latitude (-90 to +90)")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Farm longitude (-180 to +180)")
    crop: str = Field(..., description="Cultivated crop name")
    sowing_date: str = Field(..., description="Crop sowing date in YYYY-MM-DD format")
    as_of_date: Optional[str] = Field(None, description="Observation cutoff date (YYYY-MM-DD)")
    options: List[OptionInput] = Field(..., min_length=1, description="List of catalogue candidate options")

    @field_validator("crop")
    @classmethod
    def validate_crop(cls, v: str) -> str:
        clean = v.strip().lower()
        if clean not in SUPPORTED_CROPS:
            raise ValueError(
                f"Unsupported crop '{v}'. Supported crops are: {', '.join(SUPPORTED_CROPS)}"
            )
        return clean

    @field_validator("sowing_date")
    @classmethod
    def validate_sowing_date(cls, v: str) -> str:
        if not DATE_REGEX.match(v):
            raise ValueError("sowing_date must be in YYYY-MM-DD format")
        return v

    @field_validator("as_of_date")
    @classmethod
    def validate_as_of_date(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not DATE_REGEX.match(v):
            raise ValueError("as_of_date must be in YYYY-MM-DD format")
        return v


class OptionApplicability(BaseModel):
    """Evaluation result for a single catalogue option."""
    option_id: int
    applicable: bool
    probability_below_trigger: Optional[float] = Field(
        None, ge=0.0, le=1.0, description="Estimated probability rainfall is strictly below trigger (0 to 1)"
    )
    reason: Optional[str] = Field(None, description="Explanation when option is marked non-applicable")


class RecommendResponse(BaseModel):
    """Output payload from POST /recommend endpoint matching Appendix A.4."""
    recommended_option_id: int
    suggested_start_date: str
    rationale: str
    options: List[OptionApplicability]
    model_name: str
    model_version: str
    trained_on_range: str
    advisory: bool = True


class HealthResponse(BaseModel):
    """Output payload from GET /health endpoint (M3-AI01)."""
    status: str = "healthy"
    model_loaded: bool
    crop_table_loaded: bool
    recommendation_rule_loaded: bool
    model_name: str
    model_version: str
    mode: str = "mock"
