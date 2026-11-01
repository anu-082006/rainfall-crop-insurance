import type { DailyRainfallRecord, HourlyRainfallRecord } from './weather'

// ─── Documented Rounding Rule ───────────────────────────────
/**
 * OFFICIAL TEAM ROUNDING RULE:
 * 1. Accumulate precipitation values in high-precision (hundredths of a millimeter,
 *    matching Open-Meteo's 0.01 mm precision) to prevent floating-point accumulation drift.
 * 2. Sum all observation values (daily or hourly) across the exact policy coverage window.
 * 3. Apply nearest-integer rounding (standard half-up: Math.round) ONCE to the final cumulative total,
 *    rather than rounding each observation period independently.
 * 4. Verify the result is a non-negative integer suitable for Solidity uint256 storage.
 *
 * Example:
 *   [2.4, 5.1, 0.0, 8.2, 4.3, 6.0, 6.0]
 *   Total = 32.0 mm -> 32 mm (uint256)
 *
 *   32.4 mm -> 32 mm
 *   32.5 mm -> 33 mm
 *   32.8 mm -> 33 mm
 */
export const ROUNDING_RULE_DESCRIPTION =
  'Cumulative nearest-integer rounding: sum all observation values with 2-decimal precision, then round the final total once using Math.round().'

export type RainfallObservation = DailyRainfallRecord | HourlyRainfallRecord

// ─── Output Interface ───────────────────────────────────────
export interface RainfallCalculationResult {
  /** Number of observation intervals (hours or days) included in the sum */
  observationCount: number
  /** Number of observation days (alias for backward compatibility) */
  totalDays: number
  /** Exact decimal sum of precipitation (in millimeters, 2 decimal places) */
  rawTotalMm: number
  /** Whole millimeter result agreed for smart contract submission */
  roundedTotalMm: number
  /** BigInt representation for Solidity uint256 ABI encoding */
  rainfallMmUint256: bigint
  /** The verified records that contributed to the total */
  dailyRecords: DailyRainfallRecord[]
  /** Description of the rule applied */
  roundingRule: string
}

// ─── Calculation Functions ──────────────────────────────────

/**
 * Rounds a precise decimal rainfall value to the nearest whole millimeter.
 * Enforces non-negative integer output.
 */
export function roundToWholeMm(preciseTotalMm: number): number {
  if (typeof preciseTotalMm !== 'number' || isNaN(preciseTotalMm) || !Number.isFinite(preciseTotalMm)) {
    throw new Error(`Cannot round non-finite rainfall value: ${preciseTotalMm}`)
  }

  if (preciseTotalMm < 0) {
    throw new Error(`Rainfall total cannot be negative: ${preciseTotalMm} mm`)
  }

  const rounded = Math.round(preciseTotalMm)

  // Verify non-negative integer
  if (!Number.isInteger(rounded) || rounded < 0) {
    throw new Error(`Rounding failed to produce a non-negative integer: ${rounded}`)
  }

  return rounded
}

/**
 * Calculates cumulative rainfall total from validated observations (daily or hourly):
 * 1. Validates that records array is non-empty.
 * 2. Checks every record: strictly rejects missing, null, undefined, NaN, non-finite, or negative values.
 * 3. Sums precipitation using fixed-point integer cents (0.01 mm) to avoid binary float drift.
 * 4. Applies the documented nearest-integer rounding rule once to the final sum.
 * 5. Verifies the result is a valid non-negative whole number.
 *
 * NOTE: Missing data is NEVER treated as zero rainfall. If any observation is missing,
 * this function throws an error to halt the workflow.
 */
export function calculateCumulativeRainfall(
  records: (DailyRainfallRecord | HourlyRainfallRecord)[],
): RainfallCalculationResult {
  if (!records || !Array.isArray(records) || records.length === 0) {
    throw new Error('Cannot calculate rainfall: records list is empty or undefined. Missing data is never treated as zero.')
  }

  let totalCents = 0 // Precipitation tracked in 0.01 mm units to eliminate IEEE 754 float drift

  for (let i = 0; i < records.length; i++) {
    const record = records[i]

    if (!record || typeof record !== 'object') {
      throw new Error(`Invalid record at index ${i}: record is missing or corrupted.`)
    }

    const identifier = 'date' in record ? record.date : record.timeIso
    const { precipitationMm } = record

    if (!identifier || typeof identifier !== 'string') {
      throw new Error(`Record at index ${i} is missing a valid date/time identifier string.`)
    }

    // Strict validation: Reject missing, null, undefined, NaN, or non-finite numbers
    if (
      precipitationMm === null ||
      precipitationMm === undefined ||
      typeof precipitationMm !== 'number' ||
      isNaN(precipitationMm) ||
      !Number.isFinite(precipitationMm)
    ) {
      throw new Error(
        `Missing or invalid rainfall data on ${identifier} (index ${i}): value is '${precipitationMm}'. Missing data is never treated as zero.`
      )
    }

    // Reject negative rainfall
    if (precipitationMm < 0) {
      throw new Error(`Invalid negative rainfall recorded on ${identifier}: ${precipitationMm} mm.`)
    }

    // Accumulate in fixed-point cents (e.g. 2.4 mm -> 240 cents)
    const cents = Math.round(precipitationMm * 100)
    totalCents += cents
  }

  // Exact decimal sum (e.g. 3200 cents -> 32.0 mm)
  const rawTotalMm = totalCents / 100

  // Apply single final nearest-integer round
  const roundedTotalMm = roundToWholeMm(rawTotalMm)
  const rainfallMmUint256 = BigInt(roundedTotalMm)

  return {
    observationCount: records.length,
    totalDays: records.length,
    rawTotalMm,
    roundedTotalMm,
    rainfallMmUint256,
    dailyRecords: records as DailyRainfallRecord[],
    roundingRule: ROUNDING_RULE_DESCRIPTION,
  }
}
