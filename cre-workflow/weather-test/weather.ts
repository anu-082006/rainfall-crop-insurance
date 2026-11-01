/**
 * Historical Rainfall Fetcher and Validator
 *
 * 1. Accepts coordinates and dates.
 * 2. Calls Open-Meteo Archive API.
 * 3. Retrieves daily precipitation.
 * 4. Checks that the response contains all expected dates.
 * 5. Rejects missing or invalid values (missing data is never treated as zero).
 * 6. Calculates total rainfall.
 * 7. Prints the formatted report.
 */

export interface WeatherQuery {
  latitude: number;
  longitude: number;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

export interface DailyRainfallRecord {
  date: string;
  precipitationMm: number;
}

export interface RainfallSummary {
  latitude: number;
  longitude: number;
  startDate: string;
  endDate: string;
  totalDays: number;
  dailyRecords: DailyRainfallRecord[];
  totalRainfallMm: number;
  roundedTotalMm: number;
}

interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  elevation?: number;
  daily_units?: {
    time: string;
    precipitation_sum: string;
  };
  daily?: {
    time: string[];
    precipitation_sum: (number | null | undefined)[];
  };
  error?: boolean;
  reason?: string;
}

/**
 * Validates GPS latitude and longitude boundaries.
 */
export function validateCoordinates(latitude: number, longitude: number): void {
  if (typeof latitude !== 'number' || isNaN(latitude) || latitude < -90 || latitude > 90) {
    throw new Error(`Invalid latitude: ${latitude}. Must be between -90 and 90.`);
  }
  if (typeof longitude !== 'number' || isNaN(longitude) || longitude < -180 || longitude > 180) {
    throw new Error(`Invalid longitude: ${longitude}. Must be between -180 and 180.`);
  }
}

/**
 * Generates an array of continuous calendar dates (YYYY-MM-DD) from startDate to endDate inclusive.
 */
export function getExpectedDates(startDateStr: string, endDateStr: string): string[] {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(startDateStr) || !dateRegex.test(endDateStr)) {
    throw new Error(`Invalid date format. Expected YYYY-MM-DD format (received '${startDateStr}' and '${endDateStr}')`);
  }

  const [startYear, startMonth, startDay] = startDateStr.split('-').map(Number);
  const [endYear, endMonth, endDay] = endDateStr.split('-').map(Number);

  const current = new Date(Date.UTC(startYear, startMonth - 1, startDay));
  const end = new Date(Date.UTC(endYear, endMonth - 1, endDay));

  if (isNaN(current.getTime()) || isNaN(end.getTime())) {
    throw new Error(`Invalid date values provided: '${startDateStr}' or '${endDateStr}'.`);
  }

  if (current > end) {
    throw new Error(`startDate (${startDateStr}) must be on or before endDate (${endDateStr}).`);
  }

  const dates: string[] = [];
  while (current <= end) {
    const yyyy = current.getUTCFullYear();
    const mm = String(current.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(current.getUTCDate()).padStart(2, '0');
    dates.push(`${yyyy}-${mm}-${dd}`);
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}

/**
 * Fetches historical rainfall data from Open-Meteo, validates all dates and values,
 * and calculates the total precipitation.
 */
export async function fetchRainfallData(query: WeatherQuery): Promise<RainfallSummary> {
  const { latitude, longitude, startDate, endDate } = query;

  // 1. Accept and validate coordinates and dates
  validateCoordinates(latitude, longitude);
  const expectedDates = getExpectedDates(startDate, endDate);

  // 2. Call Open-Meteo API
  const url = new URL('https://archive-api.open-meteo.com/v1/archive');
  url.searchParams.set('latitude', latitude.toString());
  url.searchParams.set('longitude', longitude.toString());
  url.searchParams.set('start_date', startDate);
  url.searchParams.set('end_date', endDate);
  url.searchParams.set('daily', 'precipitation_sum');
  url.searchParams.set('timezone', 'UTC');

  let response: Response;
  try {
    response = await fetch(url.toString());
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Network failure contacting Open-Meteo API: ${message}`);
  }

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Open-Meteo API request failed (HTTP ${response.status}): ${errorBody || response.statusText}`);
  }

  const data = (await response.json()) as OpenMeteoResponse;

  if (data.error) {
    throw new Error(`Open-Meteo API error: ${data.reason || 'Unknown error'}`);
  }

  // 3. Retrieve daily precipitation
  if (!data.daily || !Array.isArray(data.daily.time) || !Array.isArray(data.daily.precipitation_sum)) {
    throw new Error('Open-Meteo response is missing required "daily.precipitation_sum" or "daily.time" fields.');
  }

  const receivedTimes = data.daily.time;
  const receivedPrecipitation = data.daily.precipitation_sum;

  // 4. Check that response contains all expected dates
  if (receivedTimes.length !== expectedDates.length) {
    throw new Error(
      `Date count mismatch: Expected ${expectedDates.length} days but received ${receivedTimes.length} days from Open-Meteo.`
    );
  }

  const dailyRecords: DailyRainfallRecord[] = [];
  let totalRainfallMm = 0;

  // 5. Check each date in order and reject missing or invalid values
  for (let i = 0; i < expectedDates.length; i++) {
    const expectedDate = expectedDates[i];
    const actualDate = receivedTimes[i];

    if (actualDate !== expectedDate) {
      throw new Error(
        `Date sequence mismatch at index ${i}: Expected date '${expectedDate}', but received '${actualDate}'.`
      );
    }

    const value = receivedPrecipitation[i];

    // Reject missing / null / undefined / NaN values
    if (value === null || value === undefined || typeof value !== 'number' || isNaN(value)) {
      throw new Error(
        `Missing precipitation data for date '${expectedDate}' at index ${i}. Value is '${value}'. Missing data is never treated as zero.`
      );
    }

    // Reject invalid negative rainfall values
    if (value < 0) {
      throw new Error(
        `Invalid negative precipitation value (${value} mm) recorded for date '${expectedDate}'.`
      );
    }

    dailyRecords.push({
      date: actualDate,
      precipitationMm: value
    });

    totalRainfallMm += value;
  }

  // 6. Calculate total rainfall
  const preciseTotal = Math.round(totalRainfallMm * 100) / 100;
  const roundedTotalMm = Math.round(preciseTotal);

  return {
    latitude,
    longitude,
    startDate,
    endDate,
    totalDays: expectedDates.length,
    dailyRecords,
    totalRainfallMm: preciseTotal,
    roundedTotalMm
  };
}

/**
 * 7. Prints formatted report to console.
 */
export function printRainfallReport(summary: RainfallSummary): void {
  console.log('\n============================================================');
  console.log('       HISTORICAL RAINFALL REPORT (Open-Meteo)');
  console.log('============================================================');
  console.log(`Coordinates:     Latitude ${summary.latitude}, Longitude ${summary.longitude}`);
  console.log(`Observation:     ${summary.startDate} to ${summary.endDate} (${summary.totalDays} days)`);
  console.log('------------------------------------------------------------');
  console.log(' Date         | Daily Precipitation (mm)');
  console.log('------------- | -------------------------');
  for (const record of summary.dailyRecords) {
    const dateFormatted = record.date.padEnd(12);
    const mmFormatted = `${record.precipitationMm.toFixed(2)} mm`.padStart(12);
    console.log(` ${dateFormatted} | ${mmFormatted}`);
  }
  console.log('------------------------------------------------------------');
  console.log(` Total Rainfall: ${summary.totalRainfallMm.toFixed(2)} mm`);
  console.log(` Rounded Total:  ${summary.roundedTotalMm} mm (whole mm for smart contract)`);
  console.log(' Data Status:    100% complete — all dates verified, zero missing.');
  console.log('============================================================\n');
}

/**
 * CLI Argument Parser
 */
function parseArgs(): WeatherQuery {
  const args = process.argv.slice(2);

  // Defaults: Bengaluru coordinates (12.9716, 77.5946) for 1–7 October 2024
  let latitude = 12.9716;
  let longitude = 77.5946;
  let startDate = '2024-10-01';
  let endDate = '2024-10-07';

  if (args.length >= 4) {
    latitude = parseFloat(args[0]);
    longitude = parseFloat(args[1]);
    startDate = args[2];
    endDate = args[3];
  } else if (args.length > 0 && (args[0] === '--help' || args[0] === '-h')) {
    console.log(`
Historical Rainfall Fetcher

Usage:
  node --experimental-strip-types weather.ts [latitude] [longitude] [startDate] [endDate]
  npm start -- [latitude] [longitude] [startDate] [endDate]

Arguments:
  latitude    Decimal latitude degrees (-90 to 90)
  longitude   Decimal longitude degrees (-180 to 180)
  startDate   Start date (YYYY-MM-DD)
  endDate     End date (YYYY-MM-DD)

Example:
  node --experimental-strip-types weather.ts 12.9716 77.5946 2024-10-01 2024-10-07
`);
    process.exit(0);
  }

  return { latitude, longitude, startDate, endDate };
}

async function main(): Promise<void> {
  try {
    const query = parseArgs();
    console.log(`Fetching rainfall data for [${query.latitude}, ${query.longitude}] from ${query.startDate} to ${query.endDate}...`);
    const summary = await fetchRainfallData(query);
    printRainfallReport(summary);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`\n[VALIDATION / FETCH ERROR] ${message}`);
    process.exit(1);
  }
}

// Run main if this file is executed directly
main();

