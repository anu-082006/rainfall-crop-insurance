import {
  bytesToHex,
  cre,
  encodeCallMsg,
  EVMClient,
  getNetwork,
  LAST_FINALIZED_BLOCK_NUMBER,
  type Runtime,
} from '@chainlink/cre-sdk'
import {
  decodeFunctionResult,
  encodeFunctionData,
  zeroAddress,
  type Address,
} from 'viem'
import { type Config, getPrimaryEVMConfig } from './config'

// ─── Constants ───────────────────────────────────────────────
export const COORDINATE_SCALING_FACTOR = 1_000_000

// ─── ICropInsurance ABI (getPolicy view function) ───────────
export const CROP_INSURANCE_ABI = [
  {
    type: 'function',
    name: 'getPolicy',
    inputs: [{ name: 'policyId', type: 'uint256', internalType: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        internalType: 'struct ICropInsurance.Policy',
        components: [
          { name: 'owner', type: 'address', internalType: 'address' },
          { name: 'latitudeE6', type: 'int32', internalType: 'int32' },
          { name: 'longitudeE6', type: 'int32', internalType: 'int32' },
          { name: 'startTime', type: 'uint64', internalType: 'uint64' },
          { name: 'endTime', type: 'uint64', internalType: 'uint64' },
          { name: 'thresholdMm', type: 'uint256', internalType: 'uint256' },
          { name: 'payoutAmount', type: 'uint256', internalType: 'uint256' },
          { name: 'reported', type: 'bool', internalType: 'bool' },
          { name: 'rainfallMm', type: 'uint256', internalType: 'uint256' },
          { name: 'claimed', type: 'bool', internalType: 'bool' },
        ],
      },
    ],
    stateMutability: 'view',
  },
] as const

// ─── Policy Data Structures ─────────────────────────────────

/**
 * Raw on-chain Policy struct returned by CropInsurance.getPolicy()
 */
export interface RawPolicyData {
  owner: `0x${string}`
  latitudeE6: number
  longitudeE6: number
  startTime: bigint
  endTime: bigint
  thresholdMm: bigint
  payoutAmount: bigint
  reported: boolean
  rainfallMm: bigint
  claimed: boolean
}

/**
 * Validated, typed policy object containing converted coordinates and ISO dates
 */
export interface ValidatedPolicy {
  policyId: number
  owner: `0x${string}`
  /** Converted decimal latitude (-90 to +90) */
  latitude: number
  /** Converted decimal longitude (-180 to +180) */
  longitude: number
  /** Stored raw microdegree coordinates */
  latitudeE6: number
  longitudeE6: number
  /** Observation start Unix timestamp (UTC seconds) */
  startTime: number
  /** Observation end Unix timestamp (UTC seconds) */
  endTime: number
  /** Formatted calendar start date (YYYY-MM-DD, UTC) */
  startDate: string
  /** Formatted calendar end date (inclusive final observation day, YYYY-MM-DD, UTC) */
  endDate: string
  /** Rainfall threshold in whole millimeters */
  thresholdMm: number
  /** Payout amount in RTT wei */
  payoutAmount: bigint
  /** Whether the policy has already received a verified rainfall report */
  reported: boolean
  /** Cumulative rainfall recorded on-chain (if reported) */
  rainfallMm: number
  /** Whether insurance payout has been claimed by the farmer */
  claimed: boolean
  /** Whether current time is past the observation window */
  observationEnded: boolean
}

// ─── Coordinate Conversion Utilities ────────────────────────

/**
 * Converts microdegrees (int32 multiplied by 1,000,000) to decimal degrees.
 * e.g. 12971000 -> 12.971
 */
export function e6ToDecimal(coordinateE6: number): number {
  return coordinateE6 / COORDINATE_SCALING_FACTOR
}

/**
 * Converts decimal degrees to microdegrees (multiplied by 1,000,000).
 * e.g. 12.971 -> 12971000
 */
export function decimalToE6(coordinate: number): number {
  return Math.round(coordinate * COORDINATE_SCALING_FACTOR)
}

// ─── Validation & Transformation ────────────────────────────

/**
 * Validates on-chain policy fields and converts units:
 * - Checks that policy exists (non-zero owner address)
 * - Checks that policy has not already been reported
 * - Converts latitudeE6 / longitudeE6 to standard floating-point degrees
 * - Formats observation window timestamps to calendar date strings (YYYY-MM-DD)
 */
export function validateAndTransformPolicy(
  policyId: number,
  raw: RawPolicyData,
  currentTimestampSec?: number,
): ValidatedPolicy {
  // 1. Check existence
  if (!raw.owner || raw.owner === zeroAddress) {
    throw new Error(`Policy #${policyId} does not exist on-chain (zero owner address).`)
  }

  // 2. Prevent re-processing an already reported policy
  if (raw.reported) {
    throw new Error(
      `Policy #${policyId} has already received a final report (reported = true, rainfall = ${raw.rainfallMm} mm). Processing skipped.`
    )
  }

  // 3. Convert coordinates: latitude = latitudeE6 / 1_000_000
  const latitude = e6ToDecimal(raw.latitudeE6)
  const longitude = e6ToDecimal(raw.longitudeE6)

  if (latitude < -90 || latitude > 90) {
    throw new Error(`Policy #${policyId} contains invalid latitude: ${latitude} (raw: ${raw.latitudeE6})`)
  }
  if (longitude < -180 || longitude > 180) {
    throw new Error(`Policy #${policyId} contains invalid longitude: ${longitude} (raw: ${raw.longitudeE6})`)
  }

  // 4. Validate time periods
  const startTime = Number(raw.startTime)
  const endTime = Number(raw.endTime)

  if (startTime >= endTime) {
    throw new Error(
      `Policy #${policyId} contains invalid observation window: startTime (${startTime}) >= endTime (${endTime})`
    )
  }

  // Convert Unix seconds to ISO calendar dates (YYYY-MM-DD, UTC)
  const startDate = new Date(startTime * 1000).toISOString().split('T')[0]
  // endTime is the exclusive boundary (e.g. 00:00:00 of next day), so (endTime - 1) gives the inclusive final day
  const endDate = new Date((endTime - 1) * 1000).toISOString().split('T')[0]

  const observationEnded = currentTimestampSec !== undefined ? currentTimestampSec >= endTime : true

  return {
    policyId,
    owner: raw.owner,
    latitude,
    longitude,
    latitudeE6: raw.latitudeE6,
    longitudeE6: raw.longitudeE6,
    startTime,
    endTime,
    startDate,
    endDate,
    thresholdMm: Number(raw.thresholdMm),
    payoutAmount: raw.payoutAmount,
    reported: raw.reported,
    rainfallMm: Number(raw.rainfallMm),
    claimed: raw.claimed,
    observationEnded,
  }
}

// ─── CRE EVM Read Capability ────────────────────────────────

/**
 * Calls getPolicy(policyId) on CropInsurance via CRE EVMClient.callContract().
 */
export function readPolicyFromContract(
  runtime: Runtime<Config>,
  policyId: number,
  insuranceAddress: Address,
  evmClient: EVMClient,
): RawPolicyData {
  const callData = encodeFunctionData({
    abi: CROP_INSURANCE_ABI,
    functionName: 'getPolicy',
    args: [BigInt(policyId)],
  })

  const callReply = evmClient
    .callContract(runtime, {
      call: encodeCallMsg({ from: zeroAddress, to: insuranceAddress, data: callData }),
    })
    .result()

  return decodeFunctionResult({
    abi: CROP_INSURANCE_ABI,
    functionName: 'getPolicy',
    data: bytesToHex(callReply.data),
  }) as RawPolicyData
}

/**
 * High-level helper: Reads policy from chain using CRE EVM Read and validates its terms.
 */
export function fetchAndValidatePolicy(
  runtime: Runtime<Config>,
  config: Config,
): ValidatedPolicy {
  const evm = getPrimaryEVMConfig(config)
  const network = getNetwork({
    chainFamily: 'evm',
    chainSelectorName: evm.chainSelectorName,
    isTestnet: true,
  })

  if (!network) {
    throw new Error(`Unsupported network chain selector: ${evm.chainSelectorName}`)
  }

  const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector)
  const rawPolicy = readPolicyFromContract(
    runtime,
    config.policyId,
    evm.insuranceAddress as Address,
    evmClient,
  )

  return validateAndTransformPolicy(config.policyId, rawPolicy)
}
