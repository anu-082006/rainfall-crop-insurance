import {
  bytesToHex,
  EVMClient,
  prepareReportRequest,
  TxStatus,
  type Runtime,
} from '@chainlink/cre-sdk'
import {
  decodeAbiParameters,
  encodeAbiParameters,
  parseAbiParameters,
  type Address,
  type Hex,
} from 'viem'

// ─── Protocol Specification & Constants ─────────────────────
/**
 * RainfallReportReceiver version constant.
 * Matches `uint8 public constant REPORT_VERSION = 1;` in RainfallReportReceiver.sol
 */
export const REPORT_VERSION = 1

/**
 * ABI Tuple schema expected by RainfallReportReceiver._processReport():
 * abi.decode(report, (uint8, uint256, uint64, uint64, uint256))
 *
 * Position 1: uint8   - Version (must be 1)
 * Position 2: uint256 - Policy ID
 * Position 3: uint64  - Start timestamp (Unix UTC seconds)
 * Position 4: uint64  - End timestamp (Unix UTC seconds)
 * Position 5: uint256 - Total cumulative rainfall in whole millimeters
 */
export const REPORT_ABI_PARAMS = parseAbiParameters(
  'uint8 version, uint256 policyId, uint64 startTime, uint64 endTime, uint256 rainfallMm'
)

// ─── Interfaces ─────────────────────────────────────────────

export interface RainfallReportData {
  /** Optional version number (defaults to REPORT_VERSION = 1) */
  version?: number
  /** ID of the policy on CropInsurance contract */
  policyId: number | bigint
  /** Observation window start timestamp (Unix UTC seconds) */
  startTime: number | bigint
  /** Observation window end timestamp (Unix UTC seconds) */
  endTime: number | bigint
  /** Validated cumulative rainfall in whole millimeters */
  rainfallMm: number | bigint
}

export interface DecodedRainfallReport {
  version: number
  policyId: bigint
  startTime: bigint
  endTime: bigint
  rainfallMm: bigint
}

export interface SubmitReportResult {
  txStatus: TxStatus
  txHashHex?: Hex
  errorMessage?: string
  receiverContractExecutionStatus?: number
}

// ─── ABI Encoding & Decoding ────────────────────────────────

/**
 * Encodes report parameters into standard ABI format matching RainfallReportReceiver.sol.
 *
 * Example:
 *   encodeRainfallReport({ policyId: 7, startTime: 1790812800, endTime: 1791417600, rainfallMm: 32 })
 */
export function encodeRainfallReport(data: RainfallReportData): Hex {
  const version = data.version ?? REPORT_VERSION

  if (version !== REPORT_VERSION) {
    throw new Error(
      `Unsupported report version ${version}. RainfallReportReceiver requires version ${REPORT_VERSION}.`
    )
  }

  const policyId = BigInt(data.policyId)
  const startTime = BigInt(data.startTime)
  const endTime = BigInt(data.endTime)
  const rainfallMm = BigInt(data.rainfallMm)

  if (startTime >= endTime) {
    throw new Error(`Invalid report observation window: startTime (${startTime}) >= endTime (${endTime})`)
  }

  if (rainfallMm < 0n) {
    throw new Error(`Invalid report rainfall amount: ${rainfallMm} mm cannot be negative`)
  }

  return encodeAbiParameters(REPORT_ABI_PARAMS, [
    version,
    policyId,
    startTime,
    endTime,
    rainfallMm,
  ])
}

/**
 * Decodes raw ABI bytes back into structured report fields (useful for verification and tests).
 */
export function decodeRainfallReport(reportBytes: Hex): DecodedRainfallReport {
  const [version, policyId, startTime, endTime, rainfallMm] = decodeAbiParameters(
    REPORT_ABI_PARAMS,
    reportBytes,
  )

  return {
    version,
    policyId,
    startTime,
    endTime,
    rainfallMm,
  }
}

// ─── Operation 1: Generate Report (CRE DON Consensus & Signature) ─

/**
 * Creates and signs a CRE report containing the encoded rainfall payload.
 *
 * Uses prepareReportRequest() from the CRE SDK to wrap the data into the EVM encoder,
 * then calls runtime.report() so the Decentralized Oracle Network (DON) generates
 * the required cryptographic signatures across the threshold committee.
 */
export function generateCreReport(
  runtime: Runtime<unknown>,
  encodedPayload: Hex,
) {
  const reportRequest = prepareReportRequest(encodedPayload)
  return runtime.report(reportRequest).result()
}

// ─── Operation 2: Submit Report (On-chain Forwarder Mechanism) ───

/**
 * Submits the DON-signed report to the receiver through the configured forwarder mechanism.
 *
 * NOTE: Do NOT send a raw transaction directly from an ordinary EOA wallet to onReport().
 * RainfallReportReceiver validates caller against s_forwarderAddress (and optional workflow metadata).
 * EVMClient.writeReport() routes the signed payload through KeystoneForwarder.
 */
export function submitCreReport(
  runtime: Runtime<unknown>,
  evmClient: EVMClient,
  receiverAddress: Address,
  reportResponse: ReturnType<typeof generateCreReport>,
  gasLimit?: string,
): SubmitReportResult {
  const writeResult = evmClient
    .writeReport(runtime, {
      receiver: receiverAddress,
      report: reportResponse,
      gasConfig: gasLimit ? { gasLimit } : undefined,
    })
    .result()

  const txHashHex = writeResult.txHash ? bytesToHex(writeResult.txHash) : undefined

  if (writeResult.txStatus !== TxStatus.SUCCESS) {
    const errorMsg = writeResult.errorMessage || `Transaction failed with status: ${writeResult.txStatus}`
    throw new Error(`[CRE WriteReport Error] ${errorMsg}`)
  }

  if (
    writeResult.receiverContractExecutionStatus !== undefined &&
    writeResult.receiverContractExecutionStatus !== 0
  ) {
    throw new Error(
      `[CRE Receiver Execution Failed] Status code: ${writeResult.receiverContractExecutionStatus}`
    )
  }

  return {
    txStatus: writeResult.txStatus,
    txHashHex,
    errorMessage: writeResult.errorMessage,
    receiverContractExecutionStatus: writeResult.receiverContractExecutionStatus,
  }
}

// ─── Combined High-Level Workflow Operation ─────────────────

/**
 * End-to-end report pipeline:
 * 1. Encodes the rainfall data into ABI format.
 * 2. Generates the DON consensus-signed report via runtime.report().
 * 3. Transmits the signed report on-chain to the receiver via evmClient.writeReport().
 */
export function generateAndSubmitRainfallReport(
  runtime: Runtime<unknown>,
  evmClient: EVMClient,
  receiverAddress: Address,
  reportData: RainfallReportData,
  gasLimit?: string,
): SubmitReportResult {
  // Step 1: ABI Encode
  const encodedPayload = encodeRainfallReport(reportData)

  // Step 2: Generate Signed CRE Report
  const signedReport = generateCreReport(runtime, encodedPayload)

  // Step 3: Submit On-Chain via Forwarder
  return submitCreReport(runtime, evmClient, receiverAddress, signedReport, gasLimit)
}
