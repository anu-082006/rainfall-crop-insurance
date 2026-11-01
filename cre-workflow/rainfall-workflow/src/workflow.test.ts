import { describe, expect, test } from 'bun:test'
import {
  type Config,
} from './config'
import {
  isHourlyGranularityRequired,
  validateAndTransformPolicy,
  type RawPolicyData,
} from './policy'
import {
  buildOpenMeteoHourlyUrl,
  buildOpenMeteoUrl,
  getExpectedDates,
  parseAndValidateHourlyWeatherResponse,
  parseAndValidateWeatherResponse,
  parseIsoToUtcSeconds,
} from './weather'
import {
  calculateCumulativeRainfall,
} from './rainfall'
import {
  encodeRainfallReport,
  decodeRainfallReport,
  REPORT_VERSION,
} from './report'
import { initWorkflow, onHttpTrigger } from './handler'

describe('End-to-End CRE Workflow Orchestration Tests', () => {
  const sampleConfig: Config = {
    schedule: '0 0 * * *',
    policyId: 7,
    contractInterface: 'ICropInsurance',
    evms: [
      {
        chainSelectorName: 'ethereum-testnet-sepolia',
        insuranceAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
        receiverAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
        gasLimit: '500000',
      },
    ],
  }

  test('Step 0: Workflow registers with HTTP Capability Trigger', () => {
    const handlers = initWorkflow(sampleConfig)
    expect(handlers).toHaveLength(1)
    expect(handlers[0].fn).toBe(onHttpTrigger)
  })

  test('Step 1 & 2: Policy Reading & Validation with optionId and duration', () => {
    const rawPolicy: RawPolicyData = {
      owner: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      optionId: 6n,
      latitudeE6: 12971000,
      longitudeE6: 77594000,
      startTime: 1790812800n, // 2026-10-01 00:00:00 UTC
      endTime: 1791417600n,   // 2026-10-08 00:00:00 UTC (7 days)
      thresholdMm: 50n,
      payoutAmount: 100_000_000_000_000_000_000n,
      reported: false,
      rainfallMm: 0n,
      claimed: false,
    }

    const validated = validateAndTransformPolicy(7, rawPolicy)
    expect(validated.policyId).toBe(7)
    expect(validated.optionId).toBe(6)
    expect(validated.duration).toBe(604800) // 7 days in seconds
    expect(validated.latitude).toBe(12.971)
    expect(validated.longitude).toBe(77.594)
    expect(validated.startDate).toBe('2026-10-01')
    expect(validated.endDate).toBe('2026-10-07')
    expect(validated.thresholdMm).toBe(50)
    expect(validated.reported).toBe(false)
  })

  test('Step 3: Policy reported check stops re-processing', () => {
    const rawReportedPolicy: RawPolicyData = {
      owner: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      optionId: 1n,
      latitudeE6: 12971000,
      longitudeE6: 77594000,
      startTime: 1790812800n,
      endTime: 1791417600n,
      thresholdMm: 50n,
      payoutAmount: 100n,
      reported: true, // already reported
      rainfallMm: 32n,
      claimed: false,
    }

    expect(() => validateAndTransformPolicy(7, rawReportedPolicy)).toThrow(
      'already received a final report'
    )
  })

  test('Granularity Selection: isHourlyGranularityRequired verifies boundary alignment and duration', () => {
    // Option 0 (Demo 2-hour policy): always requires hourly
    expect(isHourlyGranularityRequired(1790863200, 1790870400, 0)).toBe(true)

    // Sub-daily duration (< 86400s): requires hourly
    expect(isHourlyGranularityRequired(1790863200, 1790863200 + 3600, 1)).toBe(true)

    // Multi-day policy aligned to UTC midnight: uses daily (returns false for hourly required)
    const midnightStart = 1790812800 // 2026-10-01 00:00:00 UTC (multiple of 86400)
    const midnightEnd = midnightStart + 30 * 86400
    expect(midnightStart % 86400).toBe(0)
    expect(midnightEnd % 86400).toBe(0)
    expect(isHourlyGranularityRequired(midnightStart, midnightEnd, 1)).toBe(false)

    // Multi-day policy starting at 14:00 UTC (not midnight): requires hourly
    const nonMidnightStart = midnightStart + 14 * 3600
    const nonMidnightEnd = nonMidnightStart + 30 * 86400
    expect(isHourlyGranularityRequired(nonMidnightStart, nonMidnightEnd, 1)).toBe(true)

    // Multi-day policy ending at non-midnight: requires hourly
    expect(isHourlyGranularityRequired(midnightStart, midnightStart + 86400 + 3600, 1)).toBe(true)
  })

  test('Step 4, 5 & 6: Daily Weather Data Validation & Date Coverage', () => {
    const expectedDates = getExpectedDates('2026-10-01', '2026-10-07')
    expect(expectedDates).toHaveLength(7)

    const rawResponse = JSON.stringify({
      daily: {
        time: expectedDates,
        precipitation_sum: [2.4, 5.1, 0.0, 8.2, 4.3, 6.0, 6.0],
      },
    })

    const validatedRecords = parseAndValidateWeatherResponse(rawResponse, expectedDates)
    expect(validatedRecords).toHaveLength(7)
    expect(validatedRecords[0].precipitationMm).toBe(2.4)
    expect(validatedRecords[6].precipitationMm).toBe(6.0)
  })

  test('Hourly Weather Validation: Option 0 (2-hour demo) slices exact window [startTime, endTime)', () => {
    // 2026-10-01 14:00:00 UTC to 16:00:00 UTC (Option 0 Demo)
    const startTime = parseIsoToUtcSeconds('2026-10-01T14:00')
    const endTime = parseIsoToUtcSeconds('2026-10-01T16:00')
    expect(endTime - startTime).toBe(7200) // 2 hours

    // URL construction
    const hourlyUrl = buildOpenMeteoHourlyUrl({
      latitude: 12.971,
      longitude: 77.594,
      startDate: '2026-10-01',
      endDate: '2026-10-01',
    })
    expect(hourlyUrl).toContain('hourly=precipitation')
    expect(hourlyUrl).toContain('timezone=UTC')

    // Mock 24-hour response for the day
    const times: string[] = []
    const precipitation: number[] = []
    for (let h = 0; h < 24; h++) {
      const hh = String(h).padStart(2, '0')
      times.push(`2026-10-01T${hh}:00`)
      // rainfall at hour 14 is 1.5mm, hour 15 is 2.5mm, other hours 0
      precipitation.push(h === 14 ? 1.5 : h === 15 ? 2.5 : 0.0)
    }

    const mockResponse = JSON.stringify({
      hourly: {
        time: times,
        precipitation,
      },
    })

    const validatedHourly = parseAndValidateHourlyWeatherResponse(mockResponse, startTime, endTime)
    expect(validatedHourly).toHaveLength(2)
    expect(validatedHourly[0].timeIso).toBe('2026-10-01T14:00')
    expect(validatedHourly[0].precipitationMm).toBe(1.5)
    expect(validatedHourly[1].timeIso).toBe('2026-10-01T15:00')
    expect(validatedHourly[1].precipitationMm).toBe(2.5)

    // Calculate rainfall on hourly records: 1.5 + 2.5 = 4.0 mm -> 4 mm
    const calcResult = calculateCumulativeRainfall(validatedHourly)
    expect(calcResult.rawTotalMm).toBe(4.0)
    expect(calcResult.roundedTotalMm).toBe(4)
    expect(calcResult.rainfallMmUint256).toBe(4n)
  })

  test('Hourly Weather Validation: Rejects missing data, null, or gap in hourly sequence', () => {
    const startTime = parseIsoToUtcSeconds('2026-10-01T14:00')
    const endTime = parseIsoToUtcSeconds('2026-10-01T16:00')

    // Null rainfall value at hour 15
    const nullResponse = JSON.stringify({
      hourly: {
        time: ['2026-10-01T14:00', '2026-10-01T15:00'],
        precipitation: [1.5, null],
      },
    })
    expect(() => parseAndValidateHourlyWeatherResponse(nullResponse, startTime, endTime)).toThrow(
      'Missing or non-finite rainfall value'
    )

    // Missing hour in observation window
    const missingHourResponse = JSON.stringify({
      hourly: {
        time: ['2026-10-01T14:00'], // only 1 hour returned instead of 2
        precipitation: [1.5],
      },
    })
    expect(() => parseAndValidateHourlyWeatherResponse(missingHourResponse, startTime, endTime)).toThrow(
      'Hourly observation count mismatch'
    )

    // Negative rainfall
    const negativeResponse = JSON.stringify({
      hourly: {
        time: ['2026-10-01T14:00', '2026-10-01T15:00'],
        precipitation: [1.5, -0.5],
      },
    })
    expect(() => parseAndValidateHourlyWeatherResponse(negativeResponse, startTime, endTime)).toThrow(
      'Invalid negative rainfall value'
    )
  })

  test('Step 7: Rainfall Calculation & Agreed Rounding Rule', () => {
    const records = [
      { date: '2026-10-01', precipitationMm: 2.4 },
      { date: '2026-10-02', precipitationMm: 5.1 },
      { date: '2026-10-03', precipitationMm: 0.0 },
      { date: '2026-10-04', precipitationMm: 8.2 },
      { date: '2026-10-05', precipitationMm: 4.3 },
      { date: '2026-10-06', precipitationMm: 6.0 },
      { date: '2026-10-07', precipitationMm: 6.0 },
    ]

    const result = calculateCumulativeRainfall(records)
    // 2.4 + 5.1 + 0 + 8.2 + 4.3 + 6 + 6 = 32.0 mm
    expect(result.rawTotalMm).toBe(32.0)
    expect(result.roundedTotalMm).toBe(32)
    expect(result.rainfallMmUint256).toBe(32n)
  })

  test('Step 8: ABI Encoding matches RainfallReportReceiver', () => {
    const payloadHex = encodeRainfallReport({
      version: 1,
      policyId: 7,
      startTime: 1790812800,
      endTime: 1791417600,
      rainfallMm: 32,
    })

    const decoded = decodeRainfallReport(payloadHex)
    expect(decoded.version).toBe(REPORT_VERSION)
    expect(decoded.policyId).toBe(7n)
    expect(decoded.startTime).toBe(1790812800n)
    expect(decoded.endTime).toBe(1791417600n)
    expect(decoded.rainfallMm).toBe(32n)
  })
})
