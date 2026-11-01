import {
  cre,
  getNetwork,
  type Runtime,
} from '@chainlink/cre-sdk'
import { type Address, zeroAddress } from 'viem'
import { getPrimaryEVMConfig, type Config } from './config'
import {
  isHourlyGranularityRequired,
  readPolicyFromContract,
  validateAndTransformPolicy,
  type ValidatedPolicy,
} from './policy'
import {
  fetchValidatedHourlyWeather,
  fetchValidatedWeather,
  type DailyRainfallRecord,
  type HourlyRainfallRecord,
  type HourlyWeatherParams,
  type WeatherParams,
} from './weather'
import {
  calculateCumulativeRainfall,
  type RainfallCalculationResult,
} from './rainfall'
import {
  encodeRainfallReport,
  generateAndSubmitRainfallReport,
  generateCreReport,
  type RainfallReportData,
} from './report'

// ─── HTTP Trigger Payload Interface ─────────────────────────
interface HttpTriggerInput {
  policyId?: number
  latitude?: number
  longitude?: number
  startDate?: string
  endDate?: string
}

// ─── Main Workflow Execution Handler ────────────────────────

/**
 * Orchestrates the end-to-end rainfall crop insurance workflow:
 *
 * 1. Receive policy ID from HTTP trigger (or fallback to workflow config).
 * 2. Read policy terms from CropInsurance.sol via CRE EVM Read.
 * 3. Validate policy existence, parameters, and ensure it has not already been reported.
 * 4. Determine observation granularity (hourly vs daily) based on policy duration and boundary alignment.
 * 5. Fetch historical rainfall from Open-Meteo via CRE HTTP capability (DON consensus).
 * 6. Validate API response continuity and date/hour coverage (reject missing/null data).
 * 7. Calculate cumulative rainfall total using documented nearest-integer rounding rule.
 * 8. ABI-encode report: (uint8 version, uint256 policyId, uint64 startTime, uint64 endTime, uint256 rainfallMm).
 * 9. Generate CRE report signed by DON threshold committee.
 * 10. Submit report on-chain via CRE EVM write through KeystoneForwarder to RainfallReportReceiver.
 */
export const onHttpTrigger = async (
  runtime: Runtime<Config>,
  payload: any,
): Promise<string> => {
  const config = runtime.config
  const evm = getPrimaryEVMConfig(config)

  runtime.log('============================================================')
  runtime.log(' [START WORKFLOW] Rainfall Crop Insurance Execution')
  runtime.log('============================================================')

  // ─── Step 1: Receive Policy ID ────────────────────────────
  let policyId = config.policyId
  if (payload?.input && payload.input.length > 0) {
    try {
      const payloadString = typeof payload.input === 'string'
        ? payload.input
        : new TextDecoder().decode(payload.input)
      const parsed: HttpTriggerInput = JSON.parse(payloadString)
      if (parsed.policyId && typeof parsed.policyId === 'number') {
        policyId = parsed.policyId
        runtime.log(`[Step 1] Received Policy ID #${policyId} from HTTP trigger payload`)
      }
    } catch {
      runtime.log(`[Step 1] Could not parse HTTP payload as JSON; defaulting to config policy ID #${policyId}`)
    }
  } else {
    runtime.log(`[Step 1] Using configured Policy ID #${policyId}`)
  }

  // ─── Step 2: Read Policy from CropInsurance.sol ───────────
  runtime.log(`[Step 2] Connecting to ${evm.chainSelectorName} EVM Client...`)
  const network = getNetwork({
    chainFamily: 'evm',
    chainSelectorName: evm.chainSelectorName,
    isTestnet: true,
  })

  if (!network) {
    throw new Error(`[Chain Error] Unsupported network chainSelectorName: '${evm.chainSelectorName}'`)
  }

  const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector)
  runtime.log(`[Step 2] Reading Policy #${policyId} from CropInsurance at ${evm.insuranceAddress}...`)

  let validatedPolicy: ValidatedPolicy

  // If insuranceAddress is zero address (initial local mock testing), support overrides
  if (evm.insuranceAddress === zeroAddress) {
    runtime.log('[Step 2] insuranceAddress is zero address; utilizing configuration fallback mode.')
    const fixedNow = 1793525996
    const startTime = fixedNow - 8 * 86400
    const endTime = fixedNow - 1 * 86400
    validatedPolicy = {
      policyId,
      owner: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      optionId: 1,
      duration: endTime - startTime,
      latitude: config.overrides?.latitude ?? 12.9716,
      longitude: config.overrides?.longitude ?? 77.5946,
      latitudeE6: Math.round((config.overrides?.latitude ?? 12.9716) * 1_000_000),
      longitudeE6: Math.round((config.overrides?.longitude ?? 77.5946) * 1_000_000),
      startTime,
      endTime,
      startDate: config.overrides?.startDate ?? '2024-10-01',
      endDate: config.overrides?.endDate ?? '2024-10-07',
      thresholdMm: 50,
      payoutAmount: 100_000_000_000_000_000_000n,
      reported: false,
      rainfallMm: 0,
      claimed: false,
      observationEnded: true,
    }
  } else {
    try {
      const rawPolicy = readPolicyFromContract(runtime, policyId, evm.insuranceAddress as Address, evmClient)
      validatedPolicy = validateAndTransformPolicy(policyId, rawPolicy)
    } catch (err: any) {
      runtime.log(`[Step 2 Error] Failed to read or validate Policy #${policyId}: ${err.message}`)
      throw err
    }
  }

  runtime.log(
    `[Step 2] Policy #${policyId} validated: Option #${validatedPolicy.optionId}, Location (${validatedPolicy.latitude.toFixed(4)}, ${validatedPolicy.longitude.toFixed(4)}), Window: ${validatedPolicy.startDate} to ${validatedPolicy.endDate}, Duration: ${validatedPolicy.duration}s, Threshold: ${validatedPolicy.thresholdMm} mm`
  )

  // ─── Step 3: Check Report Status (Prevent Duplicate Processing) ─
  if (validatedPolicy.reported) {
    runtime.log(
      `[Step 3] Policy #${policyId} has already received a verified report (reported = true, rainfall = ${validatedPolicy.rainfallMm} mm). Workflow safely stopped.`
    )
    return `Policy #${policyId} already processed.`
  }

  // ─── Step 4: Determine Granularity & Window ────────────────
  const useHourly = isHourlyGranularityRequired(
    validatedPolicy.startTime,
    validatedPolicy.endTime,
    validatedPolicy.optionId,
  )

  const weatherParams: WeatherParams = {
    latitude: validatedPolicy.latitude,
    longitude: validatedPolicy.longitude,
    startDate: validatedPolicy.startDate,
    endDate: validatedPolicy.endDate,
  }

  let calcResult: RainfallCalculationResult

  if (useHourly) {
    runtime.log(
      `[Step 4] Granularity: HOURLY (Window does not align to full UTC calendar days or is sub-daily demo option).`
    )
    runtime.log(
      `[Step 4] Coordinates: (${weatherParams.latitude}, ${weatherParams.longitude}) | Hourly Window: [${validatedPolicy.startTime}, ${validatedPolicy.endTime}) (${(validatedPolicy.endTime - validatedPolicy.startTime) / 3600} hours)`
    )

    // ─── Step 5 & 6: Fetch & Validate Hourly Weather from Open-Meteo ──
    runtime.log('[Step 5] Fetching historical hourly rainfall via CRE HTTP capability (DON consensus)...')

    const hourlyParams: HourlyWeatherParams = {
      ...weatherParams,
      startTime: validatedPolicy.startTime,
      endTime: validatedPolicy.endTime,
    }

    let hourlyRecords: HourlyRainfallRecord[]
    try {
      hourlyRecords = fetchValidatedHourlyWeather(runtime, hourlyParams)
    } catch (err: any) {
      runtime.log(`[Step 5/6 Error] Hourly weather verification failed: ${err.message}. Aborting workflow.`)
      throw err
    }

    runtime.log(`[Step 6] Hourly weather data validated. Received ${hourlyRecords.length} consecutive hourly observations.`)

    // ─── Step 7: Calculate Total Rainfall & Apply Rounding Rule
    runtime.log('[Step 7] Calculating cumulative rainfall total from hourly observations...')
    calcResult = calculateCumulativeRainfall(hourlyRecords)
  } else {
    runtime.log(
      `[Step 4] Granularity: DAILY (Observation period aligns to full UTC calendar days).`
    )
    runtime.log(
      `[Step 4] Coordinates: (${weatherParams.latitude}, ${weatherParams.longitude}) | Observation Period: ${weatherParams.startDate} -> ${weatherParams.endDate}`
    )

    // ─── Step 5 & 6: Fetch & Validate Daily Weather from Open-Meteo ──
    runtime.log('[Step 5] Fetching historical daily rainfall via CRE HTTP capability (DON consensus)...')

    let dailyRecords: DailyRainfallRecord[]
    try {
      dailyRecords = fetchValidatedWeather(runtime, weatherParams)
    } catch (err: any) {
      runtime.log(`[Step 5/6 Error] Daily weather verification failed: ${err.message}. Aborting workflow.`)
      throw err
    }

    runtime.log(`[Step 6] Daily weather data validated. Received ${dailyRecords.length} consecutive daily records.`)

    // ─── Step 7: Calculate Total Rainfall & Apply Rounding Rule
    runtime.log('[Step 7] Calculating cumulative rainfall total from daily observations...')
    calcResult = calculateCumulativeRainfall(dailyRecords)
  }

  runtime.log(
    `[Step 7] Total raw rainfall: ${calcResult.rawTotalMm.toFixed(2)} mm -> Rounded integer: ${calcResult.roundedTotalMm} mm (${calcResult.roundingRule})`
  )

  // ─── Step 8: Encode Report ABI Tuple ──────────────────────
  const reportData: RainfallReportData = {
    version: 1,
    policyId: validatedPolicy.policyId,
    startTime: validatedPolicy.startTime,
    endTime: validatedPolicy.endTime,
    rainfallMm: calcResult.roundedTotalMm,
  }

  const encodedPayload = encodeRainfallReport(reportData)
  runtime.log(
    `[Step 8] ABI Encoded report payload: ${encodedPayload} (version: 1, policyId: ${reportData.policyId}, start: ${reportData.startTime}, end: ${reportData.endTime}, rainfall: ${reportData.rainfallMm} mm)`
  )

  // ─── Step 9 & 10: Generate CRE Report & Submit On-Chain ───
  if (!evm.receiverAddress || evm.receiverAddress === zeroAddress) {
    runtime.log('[Step 9] receiverAddress is zero address; generating signed report without broadcast.')
    const reportResponse = generateCreReport(runtime, encodedPayload)
    runtime.log('[Step 9] DON threshold signature generated successfully.')
    runtime.log('============================================================')
    runtime.log(' [END WORKFLOW] Dry-run completed successfully')
    runtime.log('============================================================')
    return `Policy #${policyId} report ready: ${calcResult.roundedTotalMm} mm rainfall (dry-run)`
  }

  runtime.log(`[Step 9 & 10] Signing and submitting report on-chain to receiver: ${evm.receiverAddress}...`)
  const submitResult = generateAndSubmitRainfallReport(
    runtime,
    evmClient,
    evm.receiverAddress as Address,
    reportData,
    evm.gasLimit,
  )

  runtime.log(`[Step 10] Report submitted successfully! TxHash: ${submitResult.txHashHex ?? 'N/A'}`)
  runtime.log('============================================================')
  runtime.log(' [END WORKFLOW] Execution Finished Successfully')
  runtime.log('============================================================')

  return `Policy #${policyId} recorded: ${calcResult.roundedTotalMm} mm rainfall. Tx: ${submitResult.txHashHex ?? 'submitted'}`
}

// ─── Workflow Initializer ───────────────────────────────────

/**
 * Initializes the workflow with an HTTP trigger for flexible testing.
 */
export function initWorkflow(config: Config) {
  const httpTrigger = new cre.capabilities.HTTPCapability()

  return [
    cre.handler(
      httpTrigger.trigger({}),
      onHttpTrigger,
    ),
  ]
}
