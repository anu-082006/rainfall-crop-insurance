/**
 * aiClient.ts
 *
 * Frontend client for AgriShield Python FastAPI Recommendation Service.
 * Implements M3-AI01 through M3-AI10 and Section 5.1/5.2.
 */

import { AI_API_URL } from "../utils/constants.ts";
import type { CatalogueOption } from "../mock/mockCatalogue.ts";
import type { FarmerProfile } from "../profile/profileStorage.ts";

export interface OptionInput {
  option_id: number;
  duration_seconds: number;
  trigger_mm: number;
  payout: number;
}

export interface RecommendRequest {
  latitude: number;
  longitude: number;
  crop: string;
  sowing_date: string;
  as_of_date?: string;
  options: OptionInput[];
}

export interface OptionApplicability {
  option_id: number;
  applicable: boolean;
  probability_below_trigger: number | null;
  reason: string | null;
}

export interface RecommendResponse {
  recommended_option_id: number;
  suggested_start_date: string;
  rationale: string;
  options: OptionApplicability[];
  model_name: string;
  model_version: string;
  trained_on_range: string;
  advisory: boolean;
}

export interface HealthResponse {
  status: string;
  model_loaded: boolean;
  crop_table_loaded: boolean;
  recommendation_rule_loaded: boolean;
  model_name: string;
  model_version: string;
  mode: string;
}

export class AiServiceError extends Error {
  statusCode?: number;
  isUnavailable: boolean;

  constructor(message: string, statusCode?: number, isUnavailable = false) {
    super(message);
    this.name = "AiServiceError";
    this.statusCode = statusCode;
    this.isUnavailable = isUnavailable;
  }
}

/**
 * Checks FastAPI service health status (GET /health).
 */
export async function checkAiHealth(): Promise<HealthResponse | null> {
  try {
    const res = await fetch(`${AI_API_URL}/health`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as HealthResponse;
  } catch {
    return null;
  }
}

/**
 * Builds candidate options payload from on-chain catalogue for POST /recommend.
 */
export function buildCandidateOptions(catalogue: CatalogueOption[]): OptionInput[] {
  return catalogue.map((opt) => ({
    option_id: opt.optionId,
    duration_seconds: opt.durationSeconds,
    trigger_mm: opt.triggerMm,
    payout: opt.payoutRtt,
  }));
}

/**
 * Requests an AI policy recommendation from the FastAPI service (POST /recommend).
 * M3-AI02 to M3-AI09 / M3-AP05
 */
export async function fetchAiRecommendation(
  profile: FarmerProfile,
  catalogue: CatalogueOption[],
  asOfDate?: string
): Promise<RecommendResponse> {
  const candidateOptions = buildCandidateOptions(catalogue);

  const payload: RecommendRequest = {
    latitude: profile.latitude,
    longitude: profile.longitude,
    crop: profile.crop.toLowerCase(),
    sowing_date: profile.sowingDate,
    as_of_date: asOfDate,
    options: candidateOptions,
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(`${AI_API_URL}/recommend`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      if (res.status === 422) {
        const errJson = await res.json().catch(() => ({}));
        throw new AiServiceError(
          errJson.detail || "Invalid input parameters submitted to the AI recommendation service.",
          422
        );
      }
      if (res.status === 503) {
        throw new AiServiceError(
          "AI recommendation service or weather data source is temporarily unavailable.",
          503,
          true
        );
      }
      throw new AiServiceError(`AI service responded with HTTP status ${res.status}.`, res.status);
    }

    const data = (await res.json()) as RecommendResponse;
    return data;
  } catch (err: unknown) {
    if (err instanceof AiServiceError) {
      throw err;
    }
    // Network failure / connection refused / timeout
    throw new AiServiceError(
      "Could not connect to the FastAPI AI recommendation service at " +
        AI_API_URL +
        ". Ensure the service is running (python -m uvicorn main:app --port 8000).",
      0,
      true
    );
  }
}
