import {
  consensusIdenticalAggregation,
  cre,
  type HTTPSendRequester,
  type Runtime,
} from '@chainlink/cre-sdk'

// ─── Input & Output Interfaces ──────────────────────────────

export interface WeatherParams {
  /** Decimal latitude degrees (-90 to +90) */
  latitude: number
  /** Decimal longitude degrees (-180 to +180) */
  longitude: number
  /** Beginning of rainfall observation (YYYY-MM-DD, UTC) */
  startDate: string
  /** End of rainfall observation (YYYY-MM-DD, UTC) */
  endDate: string
}

export interface DailyRainfallRecord {
  /** ISO date string (YYYY-MM-DD) */
  date: string
  /** Observed cumulative rainfall in millimeters */
  precipitationMm: number
}

export interface OpenMeteoArchiveResponse {
  latitude?: number
  longitude?: number
  generationtime_ms?: number
  utc_offset_seconds?: number
  timezone?: string
  daily_units?: {
    time?: string
    precipitation_sum?: string
  }
  daily?: {
    time?: string[]
    precipitation_sum?: (number | null | undefined)[]
  }
  error?: boolean
  reason?: string
}

// ─── URL Construction ───────────────────────────────────────

export const OPEN_METEO_ARCHIVE_BASE_URL = 'https://archive-api.open-meteo.com/v1/archive'

/**
 * Constructs the Open-Meteo Historical Weather API query URL.
 * e.g. https://archive-api.open-meteo.com/v1/archive?latitude=12.971&longitude=77.594&start_date=2026-10-01&end_date=2026-10-07&daily=precipitation_sum&timezone=UTC
 */
export function buildOpenMeteoUrl(params: WeatherParams): string {
  const { latitude, longitude, startDate, endDate } = params

  if (typeof latitude !== 'number' || isNaN(latitude) || latitude < -90 || latitude > 90) {
    throw new Error(`Invalid latitude: ${latitude}. Must be between -90 and 90.`)
  }
  if (typeof longitude !== 'number' || isNaN(longitude) || longitude < -180 || longitude > 180) {
    throw new Error(`Invalid longitude: ${longitude}. Must be between -180 and 180.`)
  }

  return `${OPEN_METEO_ARCHIVE_BASE_URL}?latitude=${latitude}&longitude=${longitude}&start_date=${startDate}&end_date=${endDate}&daily=precipitation_sum&timezone=UTC`
}

// ─── Expected Date Generation ───────────────────────────────

/**
 * Generates continuous array of expected UTC calendar dates (YYYY-MM-DD) from startDate to endDate.
 */
export function getExpectedDates(startDateStr: string, endDateStr: string): string[] {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(startDateStr) || !dateRegex.test(endDateStr)) {
    throw new Error(`Invalid date format. Expected YYYY-MM-DD (received '${startDateStr}' and '${endDateStr}')`)
  }

  const [startYear, startMonth, startDay] = startDateStr.split('-').map(Number)
  const [endYear, endMonth, endDay] = endDateStr.split('-').map(Number)

  const current = new Date(Date.UTC(startYear, startMonth - 1, startDay))
  const end = new Date(Date.UTC(endYear, endMonth - 1, endDay))

  if (isNaN(current.getTime()) || isNaN(end.getTime())) {
    throw new Error(`Invalid calendar dates: '${startDateStr}' or '${endDateStr}'.`)
  }

  if (current > end) {
    throw new Error(`startDate (${startDateStr}) must be on or before endDate (${endDateStr}).`)
  }

  const dates: string[] = []
  while (current <= end) {
    const yyyy = current.getUTCFullYear()
    const mm = String(current.getUTCMonth() + 1).padStart(2, '0')
    const dd = String(current.getUTCDate()).padStart(2, '0')
    dates.push(`${yyyy}-${mm}-${dd}`)
    current.setUTCDate(current.getUTCDate() + 1)
  }

  return dates
}

// ─── Validation of Open-Meteo Response ──────────────────────

/**
 * Validates the raw JSON body returned by Open-Meteo:
 * 1. Checks that the response is valid JSON and not an API error.
 * 2. Checks that daily.time and daily.precipitation_sum arrays exist.
 * 3. Checks that the lengths of both arrays match.
 * 4. Checks that the count matches the expected date count.
 * 5. Checks that every expected date is present in exact sequence.
 * 6. Rejects missing, null, negative, NaN or non-finite rainfall values.
 */
export function parseAndValidateWeatherResponse(
  responseBodyText: string,
  expectedDates: string[],
): DailyRainfallRecord[] {
  let data: OpenMeteoArchiveResponse
  try {
    data = JSON.parse(responseBodyText) as OpenMeteoArchiveResponse
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(`Failed to parse Open-Meteo JSON response: ${message}`)
  }

  if (data.error) {
    throw new Error(`Open-Meteo API returned error: ${data.reason || 'Unknown reason'}`)
  }

  // Check that both arrays exist
  if (!data.daily) {
    throw new Error('Open-Meteo response is missing required "daily" object.')
  }

  if (!Array.isArray(data.daily.time)) {
    throw new Error('Open-Meteo response is missing "daily.time" array.')
  }

  if (!Array.isArray(data.daily.precipitation_sum)) {
    throw new Error('Open-Meteo response is missing "daily.precipitation_sum" array.')
  }

  const receivedTimes = data.daily.time
  const receivedPrecipitation = data.daily.precipitation_sum

  // Check that the number of dates and rainfall values match
  if (receivedTimes.length !== receivedPrecipitation.length) {
    throw new Error(
      `Open-Meteo array length mismatch: ${receivedTimes.length} dates vs ${receivedPrecipitation.length} rainfall values.`
    )
  }

  // Check that response contains all expected dates
  if (receivedTimes.length !== expectedDates.length) {
    throw new Error(
      `Date count mismatch: Expected ${expectedDates.length} days but received ${receivedTimes.length} days from Open-Meteo.`
    )
  }

  const validatedRecords: DailyRainfallRecord[] = []

  // Check every expected date and validate values
  for (let i = 0; i < expectedDates.length; i++) {
    const expectedDate = expectedDates[i]
    const actualDate = receivedTimes[i]

    if (actualDate !== expectedDate) {
      throw new Error(
        `Date sequence mismatch at index ${i}: Expected date '${expectedDate}', but API returned '${actualDate}'.`
      )
    }

    const value = receivedPrecipitation[i]

    // Reject missing, null, undefined, NaN or non-finite values
    if (
      value === null ||
      value === undefined ||
      typeof value !== 'number' ||
      isNaN(value) ||
      !Number.isFinite(value)
    ) {
      throw new Error(
        `Missing or non-finite rainfall value for date '${expectedDate}' at index ${i}: received '${value}'. Missing data is never treated as zero.`
      )
    }

    // Reject invalid negative rainfall values
    if (value < 0) {
      throw new Error(
        `Invalid negative rainfall value (${value} mm) recorded for date '${expectedDate}'.`
      )
    }

    validatedRecords.push({
      date: actualDate,
      precipitationMm: value,
    })
  }

  return validatedRecords
}

// ─── CRE HTTP Capability Worker ─────────────────────────────

/**
 * Worker function called by CRE HTTP capability on each DON node.
 * Uses sendRequester.sendRequest() to perform the deterministic HTTP call.
 */
export const openMeteoHttpWorker = (
  sendRequester: HTTPSendRequester,
  params: WeatherParams,
): DailyRainfallRecord[] => {
  const url = buildOpenMeteoUrl(params)
  const expectedDates = getExpectedDates(params.startDate, params.endDate)

  // CRE HTTP capability request (participates in CRE WASM sandbox & consensus)
  const response = sendRequester
    .sendRequest({
      method: 'GET',
      url,
    })
    .result()

  // Check HTTP response status
  if (response.statusCode !== 200) {
    const errorBody = new TextDecoder().decode(response.body)
    throw new Error(
      `Open-Meteo HTTP request failed with status ${response.statusCode}: ${errorBody}`
    )
  }

  const responseText = new TextDecoder().decode(response.body)
  return parseAndValidateWeatherResponse(responseText, expectedDates)
}

// ─── High-Level Workflow Entrypoint ─────────────────────────

/**
 * Fetches validated daily rainfall records using CRE's HTTP capability and DON BFT consensus.
 * DO NOT use standard fetch() inside the workflow; this function executes via HTTPClient.
 */
export function fetchValidatedWeather(
  runtime: Runtime<unknown>,
  params: WeatherParams,
): DailyRainfallRecord[] {
  const httpClient = new cre.capabilities.HTTPClient()

  const records = httpClient
    .sendRequest(
      runtime,
      openMeteoHttpWorker,
      consensusIdenticalAggregation<DailyRainfallRecord[]>(),
    )(params)
    .result()

  return records
}
