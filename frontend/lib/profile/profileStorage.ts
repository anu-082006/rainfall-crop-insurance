/**
 * profileStorage.ts
 *
 * Off-chain farmer profile persistence and validation (M3-PR01 to M3-PR04).
 *
 * Rules:
 * - Stored in browser localStorage keyed strictly by connected wallet address.
 * - No remote database.
 * - Farmer can view, edit, or clear their profile.
 * - Validates latitude (-90 to +90), longitude (-180 to +180), supported crop, and sowing date.
 * - Feeds AI recommendation only (M3-PR04); smart contract records the policy location during enrollment.
 */

import { SUPPORTED_CROPS, type SupportedCrop } from "../utils/constants.ts";

export interface FarmerProfile {
  walletAddress: string;
  latitude: number;
  longitude: number;
  crop: SupportedCrop;
  sowingDate: string; // ISO format: YYYY-MM-DD
  updatedAt: number; // Unix timestamp in ms
}

export interface ProfileValidationResult {
  valid: boolean;
  errors: {
    latitude?: string;
    longitude?: string;
    crop?: string;
    sowingDate?: string;
    general?: string;
  };
}

const STORAGE_PREFIX = "crop_insure_farmer_profile_";

/**
 * Returns the localStorage key for a specific wallet address.
 */
export function getProfileStorageKey(walletAddress: string): string {
  return `${STORAGE_PREFIX}${walletAddress.trim().toLowerCase()}`;
}

/**
 * Validates farmer profile inputs before saving.
 */
export function validateProfile(
  data: Partial<{
    latitude: number | string;
    longitude: number | string;
    crop: string;
    sowingDate: string;
  }>
): ProfileValidationResult {
  const errors: ProfileValidationResult["errors"] = {};

  // 1. Latitude validation (-90.0 to +90.0)
  if (data.latitude === undefined || data.latitude === null || data.latitude === "") {
    errors.latitude = "Latitude is required.";
  } else {
    const lat = typeof data.latitude === "string" ? parseFloat(data.latitude) : data.latitude;
    if (isNaN(lat)) {
      errors.latitude = "Latitude must be a valid decimal number.";
    } else if (lat < -90 || lat > 90) {
      errors.latitude = "Latitude must be between -90.0 and +90.0 degrees.";
    }
  }

  // 2. Longitude validation (-180.0 to +180.0)
  if (data.longitude === undefined || data.longitude === null || data.longitude === "") {
    errors.longitude = "Longitude is required.";
  } else {
    const lng = typeof data.longitude === "string" ? parseFloat(data.longitude) : data.longitude;
    if (isNaN(lng)) {
      errors.longitude = "Longitude must be a valid decimal number.";
    } else if (lng < -180 || lng > 180) {
      errors.longitude = "Longitude must be between -180.0 and +180.0 degrees.";
    }
  }

  // 3. Crop validation
  if (!data.crop || data.crop.trim() === "") {
    errors.crop = "Please select a supported crop.";
  } else if (!SUPPORTED_CROPS.includes(data.crop.toLowerCase() as SupportedCrop)) {
    errors.crop = `Crop '${data.crop}' is not supported. Supported: ${SUPPORTED_CROPS.join(", ")}.`;
  }

  // 4. Sowing date validation (YYYY-MM-DD)
  if (!data.sowingDate || data.sowingDate.trim() === "") {
    errors.sowingDate = "Sowing date is required.";
  } else {
    const parsed = new Date(data.sowingDate);
    if (isNaN(parsed.getTime())) {
      errors.sowingDate = "Invalid date format. Use YYYY-MM-DD.";
    } else {
      // Must not be in the distant future (> 365 days from now)
      const maxFuture = new Date();
      maxFuture.setDate(maxFuture.getDate() + 365);
      if (parsed > maxFuture) {
        errors.sowingDate = "Sowing date cannot be more than 1 year in the future.";
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Loads the saved profile for the given wallet address from browser localStorage.
 */
export function loadProfile(walletAddress: string | null | undefined): FarmerProfile | null {
  if (!walletAddress || typeof window === "undefined") {
    return null;
  }

  const key = getProfileStorageKey(walletAddress);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as FarmerProfile;
    // Basic structural check
    if (
      typeof parsed.latitude === "number" &&
      typeof parsed.longitude === "number" &&
      typeof parsed.crop === "string" &&
      typeof parsed.sowingDate === "string"
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Persists the profile to browser localStorage keyed by wallet address.
 */
export function saveProfile(
  walletAddress: string,
  data: {
    latitude: number;
    longitude: number;
    crop: SupportedCrop;
    sowingDate: string;
  }
): FarmerProfile {
  if (!walletAddress) {
    throw new Error("Cannot save profile without a connected wallet address.");
  }

  const validation = validateProfile(data);
  if (!validation.valid) {
    const firstError = Object.values(validation.errors)[0];
    throw new Error(firstError || "Profile validation failed.");
  }

  const profile: FarmerProfile = {
    walletAddress: walletAddress.trim().toLowerCase(),
    latitude: data.latitude,
    longitude: data.longitude,
    crop: data.crop,
    sowingDate: data.sowingDate,
    updatedAt: Date.now(),
  };

  if (typeof window !== "undefined") {
    const key = getProfileStorageKey(walletAddress);
    localStorage.setItem(key, JSON.stringify(profile));
  }

  return profile;
}

/**
 * Clears the profile for the given wallet address from localStorage.
 */
export function clearProfile(walletAddress: string | null | undefined): void {
  if (!walletAddress || typeof window === "undefined") {
    return;
  }
  const key = getProfileStorageKey(walletAddress);
  localStorage.removeItem(key);
}
