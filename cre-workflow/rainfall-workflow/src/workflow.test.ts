import { describe, expect, test } from 'bun:test'
import {
  type Config,
  configSchema,
  toWorkflowConfig,
} from './config'
import {
  validateAndTransformPolicy,
  type RawPolicyData,
} from './policy'
import {
  getExpectedDates,
  parseAndValidateWeatherResponse,
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

  test('Step 1 & 2: Policy Reading & Validation', () => {
    const rawPolicy: RawPolicyData = {
      owner: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      latitudeE6: 12971000,
      longitudeE6: 77594000,
      startTime: 1790812800n,
      endTime: 1791417600n,
      thresholdMm: 50n,
      payoutAmount: 100_000_000_000_000_000_000n,
      reported: false,
      rainfallMm: 0n,
      claimed: false,
    }

    const validated = validateAndTransformPolicy(7, rawPolicy)
    expect(validated.policyId).toBe(7)
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

  test('Step 4, 5 & 6: Weather Data Validation & Date Coverage', () => {
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

