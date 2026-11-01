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

export interface HourlyWeatherParams extends WeatherParams {
  /** Exact observation window start timestamp (Unix UTC seconds) */
  startTime: number
  /** Exact observation window end timestamp (Unix UTC seconds) */
  endTime: number
}

export interface DailyRainfallRecord {
  /** ISO date string (YYYY-MM-DD) */
  date: string
  /** Observed cumulative rainfall in millimeters */
  precipitationMm: number
}

export interface HourlyRainfallRecord {
  /** ISO timestamp string (YYYY-MM-DDTHH:MM, UTC) */
  timeIso: string
  /** Unix timestamp in seconds (UTC) */
  timestampUnix: number
  /** Observed rainfall in millimeters during this hour */
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
  hourly_units?: {
    time?: string
    precipitation?: string
  }
  hourly?: {
    time?: string[]
    precipitation?: (number | null | undefined)[]
  }
  error?: boolean
  reason?: string
}

// ─── Constants & URL Construction ───────────────────────────

export const OPEN_METEO_ARCHIVE_BASE_URL = 'https://archive-api.open-meteo.com/v1/archive'

/**
 * Validates coordinate bounds.
 */
function validateCoordinates(latitude: number, longitude: number): void {
  if (typeof latitude !== 'number' || isNaN(latitude) || latitude < -90 || latitude > 90) {
    throw new Error(`Invalid latitude: ${latitude}. Must be between -90 and 90.`)
  }
  if (typeof longitude !== 'number' || isNaN(longitude) || longitude < -180 || longitude > 180) {
    throw new Error(`Invalid longitude: ${longitude}. Must be between -180 and 180.`)
  }
}

/**
 * Constructs the Open-Meteo Historical Weather API query URL for daily precipitation.
 * e.g. https://archive-api.open-meteo.com/v1/archive?latitude=12.971&longitude=77.594&start_date=2026-10-01&end_date=2026-10-07&daily=precipitation_sum&timezone=UTC
 */
export function buildOpenMeteoUrl(params: WeatherParams): string {
  const { latitude, longitude, startDate, endDate } = params
  validateCoordinates(latitude, longitude)
  return `${OPEN_METEO_ARCHIVE_BASE_URL}?latitude=${latitude}&longitude=${longitude}&start_date=${startDate}&end_date=${endDate}&daily=precipitation_sum&timezone=UTC`
}

/**
 * Constructs the Open-Meteo Historical Weather API query URL for hourly precipitation.
 * e.g. https://archive-api.open-meteo.com/v1/archive?latitude=12.971&longitude=77.594&start_date=2026-10-01&end_date=2026-10-01&hourly=precipitation&timezone=UTC
 */
export function buildOpenMeteoHourlyUrl(params: WeatherParams): string {
  const { latitude, longitude, startDate, endDate } = params
  validateCoordinates(latitude, longitude)
  return `${OPEN_METEO_ARCHIVE_BASE_URL}?latitude=${latitude}&longitude=${longitude}&start_date=${startDate}&end_date=${endDate}&hourly=precipitation&timezone=UTC`
}

// ─── Date Parsing Utilities ─────────────────────────────────

/**
 * Deterministically parses an ISO timestamp (e.g. "2026-10-01T14:00") into Unix UTC seconds.
 * Avoids any environment timezone or locale bias.
 */
export function parseIsoToUtcSeconds(iso: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(iso)
  if (!match) {
    throw new Error(`Invalid ISO timestamp format: '${iso}'`)
  }
  const year = Number(match[1])
  const month = Number(match[2]) - 1
  const day = Number(match[3])
  const hour = Number(match[4])
  const minute = Number(match[5])
  const second = match[6] ? Number(match[6]) : 0
  return Math.floor(Date.UTC(year, month, day, hour, minute, second) / 1000)
}

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

// ─── Daily Weather Validation ───────────────────────────────

/**
 * Validates the raw JSON body returned by Open-Meteo for daily precipitation:
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

  if (receivedTimes.length !== receivedPrecipitation.length) {
    throw new Error(
      `Open-Meteo array length mismatch: ${receivedTimes.length} dates vs ${receivedPrecipitation.length} rainfall values.`
    )
  }

  if (receivedTimes.length !== expectedDates.length) {
    throw new Error(
      `Date count mismatch: Expected ${expectedDates.length} days but received ${receivedTimes.length} days from Open-Meteo.`
    )
  }

  const validatedRecords: DailyRainfallRecord[] = []

  for (let i = 0; i < expectedDates.length; i++) {
    const expectedDate = expectedDates[i]
    const actualDate = receivedTimes[i]

    if (actualDate !== expectedDate) {
      throw new Error(
        `Date sequence mismatch at index ${i}: Expected date '${expectedDate}', but API returned '${actualDate}'.`
      )
    }

    const value = receivedPrecipitation[i]

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

// ─── Hourly Weather Validation ──────────────────────────────

/**
 * Validates and filters raw Open-Meteo hourly weather observations:
 * 1. Checks that the response is valid JSON and not an API error.
 * 2. Checks that hourly.time and hourly.precipitation arrays exist and match in length.
 * 3. Filters observations strictly to the half-open observation window [startTime, endTime).
 * 4. Checks that the filtered observation count matches (endTime - startTime) / 3600 exactly.
 * 5. Checks continuous sequence without missing hourly gaps.
 * 6. Strictly rejects missing, null, undefined, NaN, non-finite, or negative values.
 *
 * NOTE: Missing weather data is NEVER treated as zero.
 */
export function parseAndValidateHourlyWeatherResponse(
  responseBodyText: string,
  startTime: number,
  endTime: number,
): HourlyRainfallRecord[] {
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

  if (!data.hourly) {
    throw new Error('Open-Meteo response is missing required "hourly" object.')
  }

  if (!Array.isArray(data.hourly.time)) {
    throw new Error('Open-Meteo response is missing "hourly.time" array.')
  }

  if (!Array.isArray(data.hourly.precipitation)) {
    throw new Error('Open-Meteo response is missing "hourly.precipitation" array.')
  }

  const receivedTimes = data.hourly.time
  const receivedPrecipitation = data.hourly.precipitation

  if (receivedTimes.length !== receivedPrecipitation.length) {
    throw new Error(
      `Open-Meteo hourly array length mismatch: ${receivedTimes.length} times vs ${receivedPrecipitation.length} precipitation values.`
    )
  }

  if (startTime >= endTime) {
    throw new Error(`Invalid observation window: startTime (${startTime}) >= endTime (${endTime})`)
  }

  const expectedHours = Math.round((endTime - startTime) / 3600)
  if (expectedHours <= 0 || (endTime - startTime) % 3600 !== 0) {
    throw new Error(
      `Observation window (${endTime - startTime}s) does not represent a whole number of hours.`
    )
  }

  const filteredRecords: HourlyRainfallRecord[] = []

  for (let i = 0; i < receivedTimes.length; i++) {
    const timeIso = receivedTimes[i]
    if (typeof timeIso !== 'string') {
      throw new Error(`Invalid non-string hourly timestamp at index ${i}`)
    }

    const timestampUnix = parseIsoToUtcSeconds(timeIso)

    // Filter to the exact policy observation window [startTime, endTime)
    if (timestampUnix >= startTime && timestampUnix < endTime) {
      const value = receivedPrecipitation[i]

      if (
        value === null ||
        value === undefined ||
        typeof value !== 'number' ||
        isNaN(value) ||
        !Number.isFinite(value)
      ) {
        throw new Error(
          `Missing or non-finite rainfall value for hour '${timeIso}' at timestamp ${timestampUnix}: received '${value}'. Missing data is never treated as zero.`
        )
      }

      if (value < 0) {
        throw new Error(
          `Invalid negative rainfall value (${value} mm) recorded for hour '${timeIso}'.`
        )
      }

      filteredRecords.push({
        timeIso,
        timestampUnix,
        precipitationMm: value,
      })
    }
  }

  // Verify that the filtered observations completely cover the requested period
  if (filteredRecords.length !== expectedHours) {
    throw new Error(
      `Hourly observation count mismatch: Expected ${expectedHours} hours in window [${startTime}, ${endTime}) but matched ${filteredRecords.length} records.`
    )
  }

  // Verify sequential continuity (no gaps)
  for (let j = 0; j < filteredRecords.length; j++) {
    const expectedTimestamp = startTime + j * 3600
    if (filteredRecords[j].timestampUnix !== expectedTimestamp) {
      throw new Error(
        `Hourly observation gap at index ${j}: expected timestamp ${expectedTimestamp}, but received ${filteredRecords[j].timestampUnix} (${filteredRecords[j].timeIso}).`
      )
    }
  }

  return filteredRecords
}

// ─── CRE HTTP Capability Workers ────────────────────────────

/**
 * Daily worker function called by CRE HTTP capability on each DON node.
 */
export const openMeteoHttpWorker = (
  sendRequester: HTTPSendRequester,
  params: WeatherParams,
): DailyRainfallRecord[] => {
  const url = buildOpenMeteoUrl(params)
  const expectedDates = getExpectedDates(params.startDate, params.endDate)

  const response = sendRequester
    .sendRequest({
      method: 'GET',
      url,
    })
    .result()

  if (response.statusCode !== 200) {
    const errorBody = new TextDecoder().decode(response.body)
    throw new Error(
      `Open-Meteo HTTP request failed with status ${response.statusCode}: ${errorBody}`
    )
  }

  const responseText = new TextDecoder().decode(response.body)
  return parseAndValidateWeatherResponse(responseText, expectedDates)
}

/**
 * Hourly worker function called by CRE HTTP capability on each DON node.
 */
export const openMeteoHourlyHttpWorker = (
  sendRequester: HTTPSendRequester,
  params: HourlyWeatherParams,
): HourlyRainfallRecord[] => {
  const url = buildOpenMeteoHourlyUrl(params)

  const response = sendRequester
    .sendRequest({
      method: 'GET',
      url,
    })
    .result()

  if (response.statusCode !== 200) {
    const errorBody = new TextDecoder().decode(response.body)
    throw new Error(
      `Open-Meteo hourly HTTP request failed with status ${response.statusCode}: ${errorBody}`
    )
  }

  const responseText = new TextDecoder().decode(response.body)
  return parseAndValidateHourlyWeatherResponse(responseText, params.startTime, params.endTime)
}

// ─── High-Level Workflow Entrypoints ────────────────────────

/**
 * Fetches validated daily rainfall records using CRE's HTTP capability and DON BFT consensus.
 */
export function fetchValidatedWeather(
  runtime: Runtime<unknown>,
  params: WeatherParams,
): DailyRainfallRecord[] {
  const httpClient = new cre.capabilities.HTTPClient()

  return httpClient
    .sendRequest(
      runtime,
      openMeteoHttpWorker,
      consensusIdenticalAggregation<DailyRainfallRecord[]>(),
    )(params)
    .result()
}

/**
 * Fetches validated hourly rainfall records using CRE's HTTP capability and DON BFT consensus.
 */
export function fetchValidatedHourlyWeather(
  runtime: Runtime<unknown>,
  params: HourlyWeatherParams,
): HourlyRainfallRecord[] {
  const httpClient = new cre.capabilities.HTTPClient()

  return httpClient
    .sendRequest(
      runtime,
      openMeteoHourlyHttpWorker,
      consensusIdenticalAggregation<HourlyRainfallRecord[]>(),
    )(params)
    .result()
}
