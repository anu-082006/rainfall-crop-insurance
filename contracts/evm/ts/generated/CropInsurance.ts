// Code generated — DO NOT EDIT.
import {
  decodeEventLog,
  decodeFunctionResult,
  encodeEventTopics,
  encodeFunctionData,
  zeroAddress,
} from 'viem'
import type { Address, Hex } from 'viem'
import {
  bytesToHex,
  encodeCallMsg,
  EVMClient,
  hexToBase64,
  LAST_FINALIZED_BLOCK_NUMBER,
  prepareReportRequest,
  type EVMLog,
  type Runtime,
} from '@chainlink/cre-sdk'

export interface DecodedLog<T> extends Omit<EVMLog, 'data'> { data: T }

const encodeTopicValue = (t: Hex | Hex[] | null): string[] => {
  if (t == null) return []
  if (Array.isArray(t)) return t.map(hexToBase64)
  return [hexToBase64(t)]
}





/**
 * Filter params for ClaimPaid. Only indexed fields can be used for filtering.
 * Indexed string/bytes must be passed as keccak256 hash (Hex).
 */
export type ClaimPaidTopics = {
  policyId?: bigint
  owner?: `0x${string}`
}

/**
 * Decoded ClaimPaid event data.
 */
export type ClaimPaidDecoded = {
  policyId: bigint
  owner: `0x${string}`
  amount: bigint
}


/**
 * Filter params for OwnershipTransferred. Only indexed fields can be used for filtering.
 * Indexed string/bytes must be passed as keccak256 hash (Hex).
 */
export type OwnershipTransferredTopics = {
  previousOwner?: `0x${string}`
  newOwner?: `0x${string}`
}

/**
 * Decoded OwnershipTransferred event data.
 */
export type OwnershipTransferredDecoded = {
  previousOwner: `0x${string}`
  newOwner: `0x${string}`
}


/**
 * Filter params for PolicyCreated. Only indexed fields can be used for filtering.
 * Indexed string/bytes must be passed as keccak256 hash (Hex).
 */
export type PolicyCreatedTopics = {
  policyId?: bigint
  owner?: `0x${string}`
}

/**
 * Decoded PolicyCreated event data.
 */
export type PolicyCreatedDecoded = {
  policyId: bigint
  owner: `0x${string}`
}


/**
 * Filter params for RainfallReportAccepted. Only indexed fields can be used for filtering.
 * Indexed string/bytes must be passed as keccak256 hash (Hex).
 */
export type RainfallReportAcceptedTopics = {
  policyId?: bigint
}

/**
 * Decoded RainfallReportAccepted event data.
 */
export type RainfallReportAcceptedDecoded = {
  policyId: bigint
  rainfallMm: bigint
}


/**
 * Filter params for ReportReceiverUpdated. Only indexed fields can be used for filtering.
 * Indexed string/bytes must be passed as keccak256 hash (Hex).
 */
export type ReportReceiverUpdatedTopics = {
  previousReceiver?: `0x${string}`
  newReceiver?: `0x${string}`
}

/**
 * Decoded ReportReceiverUpdated event data.
 */
export type ReportReceiverUpdatedDecoded = {
  previousReceiver: `0x${string}`
  newReceiver: `0x${string}`
}


export const CropInsuranceABI = [{"type":"constructor","inputs":[{"name":"token","type":"address","internalType":"address"}],"stateMutability":"nonpayable"},{"type":"function","name":"claim","inputs":[{"name":"policyId","type":"uint256","internalType":"uint256"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"createPolicy","inputs":[{"name":"latitudeE6","type":"int32","internalType":"int32"},{"name":"longitudeE6","type":"int32","internalType":"int32"},{"name":"startTime","type":"uint64","internalType":"uint64"},{"name":"endTime","type":"uint64","internalType":"uint64"},{"name":"thresholdMm","type":"uint256","internalType":"uint256"},{"name":"payoutAmount","type":"uint256","internalType":"uint256"}],"outputs":[{"name":"policyId","type":"uint256","internalType":"uint256"}],"stateMutability":"nonpayable"},{"type":"function","name":"getPolicy","inputs":[{"name":"policyId","type":"uint256","internalType":"uint256"}],"outputs":[{"name":"","type":"tuple","internalType":"structICropInsurance.Policy","components":[{"name":"owner","type":"address","internalType":"address"},{"name":"latitudeE6","type":"int32","internalType":"int32"},{"name":"longitudeE6","type":"int32","internalType":"int32"},{"name":"startTime","type":"uint64","internalType":"uint64"},{"name":"endTime","type":"uint64","internalType":"uint64"},{"name":"thresholdMm","type":"uint256","internalType":"uint256"},{"name":"payoutAmount","type":"uint256","internalType":"uint256"},{"name":"reported","type":"bool","internalType":"bool"},{"name":"rainfallMm","type":"uint256","internalType":"uint256"},{"name":"claimed","type":"bool","internalType":"bool"}]}],"stateMutability":"view"},{"type":"function","name":"isEligible","inputs":[{"name":"policyId","type":"uint256","internalType":"uint256"}],"outputs":[{"name":"","type":"bool","internalType":"bool"}],"stateMutability":"view"},{"type":"function","name":"nextPolicyId","inputs":[],"outputs":[{"name":"","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},{"type":"function","name":"owner","inputs":[],"outputs":[{"name":"","type":"address","internalType":"address"}],"stateMutability":"view"},{"type":"function","name":"payoutToken","inputs":[],"outputs":[{"name":"","type":"address","internalType":"contractIERC20"}],"stateMutability":"view"},{"type":"function","name":"recordRainfall","inputs":[{"name":"policyId","type":"uint256","internalType":"uint256"},{"name":"startTime","type":"uint64","internalType":"uint64"},{"name":"endTime","type":"uint64","internalType":"uint64"},{"name":"rainfallMm","type":"uint256","internalType":"uint256"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"renounceOwnership","inputs":[],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"reportReceiver","inputs":[],"outputs":[{"name":"","type":"address","internalType":"address"}],"stateMutability":"view"},{"type":"function","name":"setReportReceiver","inputs":[{"name":"receiver","type":"address","internalType":"address"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"transferOwnership","inputs":[{"name":"newOwner","type":"address","internalType":"address"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"event","name":"ClaimPaid","inputs":[{"name":"policyId","type":"uint256","indexed":true,"internalType":"uint256"},{"name":"owner","type":"address","indexed":true,"internalType":"address"},{"name":"amount","type":"uint256","indexed":false,"internalType":"uint256"}],"anonymous":false},{"type":"event","name":"OwnershipTransferred","inputs":[{"name":"previousOwner","type":"address","indexed":true,"internalType":"address"},{"name":"newOwner","type":"address","indexed":true,"internalType":"address"}],"anonymous":false},{"type":"event","name":"PolicyCreated","inputs":[{"name":"policyId","type":"uint256","indexed":true,"internalType":"uint256"},{"name":"owner","type":"address","indexed":true,"internalType":"address"}],"anonymous":false},{"type":"event","name":"RainfallReportAccepted","inputs":[{"name":"policyId","type":"uint256","indexed":true,"internalType":"uint256"},{"name":"rainfallMm","type":"uint256","indexed":false,"internalType":"uint256"}],"anonymous":false},{"type":"event","name":"ReportReceiverUpdated","inputs":[{"name":"previousReceiver","type":"address","indexed":true,"internalType":"address"},{"name":"newReceiver","type":"address","indexed":true,"internalType":"address"}],"anonymous":false},{"type":"error","name":"AlreadyClaimed","inputs":[{"name":"policyId","type":"uint256","internalType":"uint256"}]},{"type":"error","name":"InsufficientPayoutBalance","inputs":[{"name":"available","type":"uint256","internalType":"uint256"},{"name":"required","type":"uint256","internalType":"uint256"}]},{"type":"error","name":"InvalidLocation","inputs":[]},{"type":"error","name":"InvalidPayout","inputs":[]},{"type":"error","name":"InvalidPeriod","inputs":[]},{"type":"error","name":"InvalidThreshold","inputs":[]},{"type":"error","name":"NoReport","inputs":[{"name":"policyId","type":"uint256","internalType":"uint256"}]},{"type":"error","name":"NotEligible","inputs":[{"name":"policyId","type":"uint256","internalType":"uint256"}]},{"type":"error","name":"NotPolicyOwner","inputs":[]},{"type":"error","name":"NotReportReceiver","inputs":[]},{"type":"error","name":"ObservationNotEnded","inputs":[{"name":"policyId","type":"uint256","internalType":"uint256"}]},{"type":"error","name":"OwnableInvalidOwner","inputs":[{"name":"owner","type":"address","internalType":"address"}]},{"type":"error","name":"OwnableUnauthorizedAccount","inputs":[{"name":"account","type":"address","internalType":"address"}]},{"type":"error","name":"PeriodMismatch","inputs":[]},{"type":"error","name":"PolicyNotFound","inputs":[{"name":"policyId","type":"uint256","internalType":"uint256"}]},{"type":"error","name":"ReportAlreadyAccepted","inputs":[{"name":"policyId","type":"uint256","internalType":"uint256"}]},{"type":"error","name":"SafeERC20FailedOperation","inputs":[{"name":"token","type":"address","internalType":"address"}]},{"type":"error","name":"ZeroAddress","inputs":[]}] as const

export class CropInsurance {
  constructor(
    private readonly client: EVMClient,
    public readonly address: Address,
  ) {}

  getPolicy(
    runtime: Runtime<unknown>,
    policyId: bigint,
  ): { owner: `0x${string}`; latitudeE6: number; longitudeE6: number; startTime: bigint; endTime: bigint; thresholdMm: bigint; payoutAmount: bigint; reported: boolean; rainfallMm: bigint; claimed: boolean } {
    const callData = encodeFunctionData({
      abi: CropInsuranceABI,
      functionName: 'getPolicy' as const,
      args: [policyId],
    })

    const result = this.client
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: this.address, data: callData }),
        blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
      })
      .result()

    return decodeFunctionResult({
      abi: CropInsuranceABI,
      functionName: 'getPolicy' as const,
      data: bytesToHex(result.data),
    }) as { owner: `0x${string}`; latitudeE6: number; longitudeE6: number; startTime: bigint; endTime: bigint; thresholdMm: bigint; payoutAmount: bigint; reported: boolean; rainfallMm: bigint; claimed: boolean }
  }

  isEligible(
    runtime: Runtime<unknown>,
    policyId: bigint,
  ): boolean {
    const callData = encodeFunctionData({
      abi: CropInsuranceABI,
      functionName: 'isEligible' as const,
      args: [policyId],
    })

    const result = this.client
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: this.address, data: callData }),
        blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
      })
      .result()

    return decodeFunctionResult({
      abi: CropInsuranceABI,
      functionName: 'isEligible' as const,
      data: bytesToHex(result.data),
    }) as boolean
  }

  nextPolicyId(
    runtime: Runtime<unknown>,
  ): bigint {
    const callData = encodeFunctionData({
      abi: CropInsuranceABI,
      functionName: 'nextPolicyId' as const,
    })

    const result = this.client
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: this.address, data: callData }),
        blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
      })
      .result()

    return decodeFunctionResult({
      abi: CropInsuranceABI,
      functionName: 'nextPolicyId' as const,
      data: bytesToHex(result.data),
    }) as bigint
  }

  owner(
    runtime: Runtime<unknown>,
  ): `0x${string}` {
    const callData = encodeFunctionData({
      abi: CropInsuranceABI,
      functionName: 'owner' as const,
    })

    const result = this.client
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: this.address, data: callData }),
        blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
      })
      .result()

    return decodeFunctionResult({
      abi: CropInsuranceABI,
      functionName: 'owner' as const,
      data: bytesToHex(result.data),
    }) as `0x${string}`
  }

  payoutToken(
    runtime: Runtime<unknown>,
  ): `0x${string}` {
    const callData = encodeFunctionData({
      abi: CropInsuranceABI,
      functionName: 'payoutToken' as const,
    })

    const result = this.client
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: this.address, data: callData }),
        blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
      })
      .result()

    return decodeFunctionResult({
      abi: CropInsuranceABI,
      functionName: 'payoutToken' as const,
      data: bytesToHex(result.data),
    }) as `0x${string}`
  }

  reportReceiver(
    runtime: Runtime<unknown>,
  ): `0x${string}` {
    const callData = encodeFunctionData({
      abi: CropInsuranceABI,
      functionName: 'reportReceiver' as const,
    })

    const result = this.client
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: this.address, data: callData }),
        blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
      })
      .result()

    return decodeFunctionResult({
      abi: CropInsuranceABI,
      functionName: 'reportReceiver' as const,
      data: bytesToHex(result.data),
    }) as `0x${string}`
  }

  writeReportFromClaim(
    runtime: Runtime<unknown>,
    policyId: bigint,
    gasConfig?: { gasLimit?: string },
  ) {
    const callData = encodeFunctionData({
      abi: CropInsuranceABI,
      functionName: 'claim' as const,
      args: [policyId],
    })

    const reportResponse = runtime
      .report(prepareReportRequest(callData))
      .result()

    return this.client
      .writeReport(runtime, {
        receiver: this.address,
        report: reportResponse,
        gasConfig,
      })
      .result()
  }

  writeReportFromCreatePolicy(
    runtime: Runtime<unknown>,
    latitudeE6: number,
    longitudeE6: number,
    startTime: bigint,
    endTime: bigint,
    thresholdMm: bigint,
    payoutAmount: bigint,
    gasConfig?: { gasLimit?: string },
  ) {
    const callData = encodeFunctionData({
      abi: CropInsuranceABI,
      functionName: 'createPolicy' as const,
      args: [latitudeE6, longitudeE6, startTime, endTime, thresholdMm, payoutAmount],
    })

    const reportResponse = runtime
      .report(prepareReportRequest(callData))
      .result()

    return this.client
      .writeReport(runtime, {
        receiver: this.address,
        report: reportResponse,
        gasConfig,
      })
      .result()
  }

  writeReportFromRecordRainfall(
    runtime: Runtime<unknown>,
    policyId: bigint,
    startTime: bigint,
    endTime: bigint,
    rainfallMm: bigint,
    gasConfig?: { gasLimit?: string },
  ) {
    const callData = encodeFunctionData({
      abi: CropInsuranceABI,
      functionName: 'recordRainfall' as const,
      args: [policyId, startTime, endTime, rainfallMm],
    })

    const reportResponse = runtime
      .report(prepareReportRequest(callData))
      .result()

    return this.client
      .writeReport(runtime, {
        receiver: this.address,
        report: reportResponse,
        gasConfig,
      })
      .result()
  }

  writeReportFromSetReportReceiver(
    runtime: Runtime<unknown>,
    receiver: `0x${string}`,
    gasConfig?: { gasLimit?: string },
  ) {
    const callData = encodeFunctionData({
      abi: CropInsuranceABI,
      functionName: 'setReportReceiver' as const,
      args: [receiver],
    })

    const reportResponse = runtime
      .report(prepareReportRequest(callData))
      .result()

    return this.client
      .writeReport(runtime, {
        receiver: this.address,
        report: reportResponse,
        gasConfig,
      })
      .result()
  }

  writeReportFromTransferOwnership(
    runtime: Runtime<unknown>,
    newOwner: `0x${string}`,
    gasConfig?: { gasLimit?: string },
  ) {
    const callData = encodeFunctionData({
      abi: CropInsuranceABI,
      functionName: 'transferOwnership' as const,
      args: [newOwner],
    })

    const reportResponse = runtime
      .report(prepareReportRequest(callData))
      .result()

    return this.client
      .writeReport(runtime, {
        receiver: this.address,
        report: reportResponse,
        gasConfig,
      })
      .result()
  }

  writeReport(
    runtime: Runtime<unknown>,
    callData: Hex,
    gasConfig?: { gasLimit?: string },
  ) {
    const reportResponse = runtime
      .report(prepareReportRequest(callData))
      .result()

    return this.client
      .writeReport(runtime, {
        receiver: this.address,
        report: reportResponse,
        gasConfig,
      })
      .result()
  }

  /**
   * Creates a log trigger for ClaimPaid events.
   * The returned trigger's adapt method decodes the raw log into ClaimPaidDecoded,
   * so the handler receives typed event data directly.
   * When multiple filters are provided, topic values are merged with OR semantics (match any).
   */
  logTriggerClaimPaid(
    filters?: ClaimPaidTopics[],
  ) {
    let topics: { values: string[] }[]
    if (!filters || filters.length === 0) {
      const encoded = encodeEventTopics({
        abi: CropInsuranceABI,
        eventName: 'ClaimPaid' as const,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else if (filters.length === 1) {
      const f = filters[0]
      const args = {
        policyId: f.policyId,
        owner: f.owner,
      }
      const encoded = encodeEventTopics({
        abi: CropInsuranceABI,
        eventName: 'ClaimPaid' as const,
        args,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else {
      const allEncoded = filters.map((f) => {
        const args = {
          policyId: f.policyId,
          owner: f.owner,
        }
        return encodeEventTopics({
          abi: CropInsuranceABI,
          eventName: 'ClaimPaid' as const,
          args,
        })
      })
      topics = allEncoded[0].map((_, i) => ({
        values: [...new Set(allEncoded.flatMap((row) => encodeTopicValue(row[i])))],
      }))
    }
    const baseTrigger = this.client.logTrigger({
      addresses: [hexToBase64(this.address)],
      topics,
    })
    const contract = this
    return {
      capabilityId: () => baseTrigger.capabilityId(),
      method: () => baseTrigger.method(),
      outputSchema: () => baseTrigger.outputSchema(),
      configAsAny: () => baseTrigger.configAsAny(),
      adapt: (rawOutput: EVMLog): DecodedLog<ClaimPaidDecoded> => contract.decodeClaimPaid(rawOutput),
    }
  }

  /**
   * Decodes a log into ClaimPaid data, preserving all log metadata.
   */
  decodeClaimPaid(log: EVMLog): DecodedLog<ClaimPaidDecoded> {
    const decoded = decodeEventLog({
      abi: CropInsuranceABI,
      data: bytesToHex(log.data),
      topics: log.topics.map((t) => bytesToHex(t)) as [Hex, ...Hex[]],
    })
    const { data: _, ...rest } = log
    return { ...rest, data: decoded.args as unknown as ClaimPaidDecoded }
  }

  /**
   * Creates a log trigger for OwnershipTransferred events.
   * The returned trigger's adapt method decodes the raw log into OwnershipTransferredDecoded,
   * so the handler receives typed event data directly.
   * When multiple filters are provided, topic values are merged with OR semantics (match any).
   */
  logTriggerOwnershipTransferred(
    filters?: OwnershipTransferredTopics[],
  ) {
    let topics: { values: string[] }[]
    if (!filters || filters.length === 0) {
      const encoded = encodeEventTopics({
        abi: CropInsuranceABI,
        eventName: 'OwnershipTransferred' as const,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else if (filters.length === 1) {
      const f = filters[0]
      const args = {
        previousOwner: f.previousOwner,
        newOwner: f.newOwner,
      }
      const encoded = encodeEventTopics({
        abi: CropInsuranceABI,
        eventName: 'OwnershipTransferred' as const,
        args,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else {
      const allEncoded = filters.map((f) => {
        const args = {
          previousOwner: f.previousOwner,
          newOwner: f.newOwner,
        }
        return encodeEventTopics({
          abi: CropInsuranceABI,
          eventName: 'OwnershipTransferred' as const,
          args,
        })
      })
      topics = allEncoded[0].map((_, i) => ({
        values: [...new Set(allEncoded.flatMap((row) => encodeTopicValue(row[i])))],
      }))
    }
    const baseTrigger = this.client.logTrigger({
      addresses: [hexToBase64(this.address)],
      topics,
    })
    const contract = this
    return {
      capabilityId: () => baseTrigger.capabilityId(),
      method: () => baseTrigger.method(),
      outputSchema: () => baseTrigger.outputSchema(),
      configAsAny: () => baseTrigger.configAsAny(),
      adapt: (rawOutput: EVMLog): DecodedLog<OwnershipTransferredDecoded> => contract.decodeOwnershipTransferred(rawOutput),
    }
  }

  /**
   * Decodes a log into OwnershipTransferred data, preserving all log metadata.
   */
  decodeOwnershipTransferred(log: EVMLog): DecodedLog<OwnershipTransferredDecoded> {
    const decoded = decodeEventLog({
      abi: CropInsuranceABI,
      data: bytesToHex(log.data),
      topics: log.topics.map((t) => bytesToHex(t)) as [Hex, ...Hex[]],
    })
    const { data: _, ...rest } = log
    return { ...rest, data: decoded.args as unknown as OwnershipTransferredDecoded }
  }

  /**
   * Creates a log trigger for PolicyCreated events.
   * The returned trigger's adapt method decodes the raw log into PolicyCreatedDecoded,
   * so the handler receives typed event data directly.
   * When multiple filters are provided, topic values are merged with OR semantics (match any).
   */
  logTriggerPolicyCreated(
    filters?: PolicyCreatedTopics[],
  ) {
    let topics: { values: string[] }[]
    if (!filters || filters.length === 0) {
      const encoded = encodeEventTopics({
        abi: CropInsuranceABI,
        eventName: 'PolicyCreated' as const,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else if (filters.length === 1) {
      const f = filters[0]
      const args = {
        policyId: f.policyId,
        owner: f.owner,
      }
      const encoded = encodeEventTopics({
        abi: CropInsuranceABI,
        eventName: 'PolicyCreated' as const,
        args,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else {
      const allEncoded = filters.map((f) => {
        const args = {
          policyId: f.policyId,
          owner: f.owner,
        }
        return encodeEventTopics({
          abi: CropInsuranceABI,
          eventName: 'PolicyCreated' as const,
          args,
        })
      })
      topics = allEncoded[0].map((_, i) => ({
        values: [...new Set(allEncoded.flatMap((row) => encodeTopicValue(row[i])))],
      }))
    }
    const baseTrigger = this.client.logTrigger({
      addresses: [hexToBase64(this.address)],
      topics,
    })
    const contract = this
    return {
      capabilityId: () => baseTrigger.capabilityId(),
      method: () => baseTrigger.method(),
      outputSchema: () => baseTrigger.outputSchema(),
      configAsAny: () => baseTrigger.configAsAny(),
      adapt: (rawOutput: EVMLog): DecodedLog<PolicyCreatedDecoded> => contract.decodePolicyCreated(rawOutput),
    }
  }

  /**
   * Decodes a log into PolicyCreated data, preserving all log metadata.
   */
  decodePolicyCreated(log: EVMLog): DecodedLog<PolicyCreatedDecoded> {
    const decoded = decodeEventLog({
      abi: CropInsuranceABI,
      data: bytesToHex(log.data),
      topics: log.topics.map((t) => bytesToHex(t)) as [Hex, ...Hex[]],
    })
    const { data: _, ...rest } = log
    return { ...rest, data: decoded.args as unknown as PolicyCreatedDecoded }
  }

  /**
   * Creates a log trigger for RainfallReportAccepted events.
   * The returned trigger's adapt method decodes the raw log into RainfallReportAcceptedDecoded,
   * so the handler receives typed event data directly.
   * When multiple filters are provided, topic values are merged with OR semantics (match any).
   */
  logTriggerRainfallReportAccepted(
    filters?: RainfallReportAcceptedTopics[],
  ) {
    let topics: { values: string[] }[]
    if (!filters || filters.length === 0) {
      const encoded = encodeEventTopics({
        abi: CropInsuranceABI,
        eventName: 'RainfallReportAccepted' as const,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else if (filters.length === 1) {
      const f = filters[0]
      const args = {
        policyId: f.policyId,
      }
      const encoded = encodeEventTopics({
        abi: CropInsuranceABI,
        eventName: 'RainfallReportAccepted' as const,
        args,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else {
      const allEncoded = filters.map((f) => {
        const args = {
          policyId: f.policyId,
        }
        return encodeEventTopics({
          abi: CropInsuranceABI,
          eventName: 'RainfallReportAccepted' as const,
          args,
        })
      })
      topics = allEncoded[0].map((_, i) => ({
        values: [...new Set(allEncoded.flatMap((row) => encodeTopicValue(row[i])))],
      }))
    }
    const baseTrigger = this.client.logTrigger({
      addresses: [hexToBase64(this.address)],
      topics,
    })
    const contract = this
    return {
      capabilityId: () => baseTrigger.capabilityId(),
      method: () => baseTrigger.method(),
      outputSchema: () => baseTrigger.outputSchema(),
      configAsAny: () => baseTrigger.configAsAny(),
      adapt: (rawOutput: EVMLog): DecodedLog<RainfallReportAcceptedDecoded> => contract.decodeRainfallReportAccepted(rawOutput),
    }
  }

  /**
   * Decodes a log into RainfallReportAccepted data, preserving all log metadata.
   */
  decodeRainfallReportAccepted(log: EVMLog): DecodedLog<RainfallReportAcceptedDecoded> {
    const decoded = decodeEventLog({
      abi: CropInsuranceABI,
      data: bytesToHex(log.data),
      topics: log.topics.map((t) => bytesToHex(t)) as [Hex, ...Hex[]],
    })
    const { data: _, ...rest } = log
    return { ...rest, data: decoded.args as unknown as RainfallReportAcceptedDecoded }
  }

  /**
   * Creates a log trigger for ReportReceiverUpdated events.
   * The returned trigger's adapt method decodes the raw log into ReportReceiverUpdatedDecoded,
   * so the handler receives typed event data directly.
   * When multiple filters are provided, topic values are merged with OR semantics (match any).
   */
  logTriggerReportReceiverUpdated(
    filters?: ReportReceiverUpdatedTopics[],
  ) {
    let topics: { values: string[] }[]
    if (!filters || filters.length === 0) {
      const encoded = encodeEventTopics({
        abi: CropInsuranceABI,
        eventName: 'ReportReceiverUpdated' as const,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else if (filters.length === 1) {
      const f = filters[0]
      const args = {
        previousReceiver: f.previousReceiver,
        newReceiver: f.newReceiver,
      }
      const encoded = encodeEventTopics({
        abi: CropInsuranceABI,
        eventName: 'ReportReceiverUpdated' as const,
        args,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else {
      const allEncoded = filters.map((f) => {
        const args = {
          previousReceiver: f.previousReceiver,
          newReceiver: f.newReceiver,
        }
        return encodeEventTopics({
          abi: CropInsuranceABI,
          eventName: 'ReportReceiverUpdated' as const,
          args,
        })
      })
      topics = allEncoded[0].map((_, i) => ({
        values: [...new Set(allEncoded.flatMap((row) => encodeTopicValue(row[i])))],
      }))
    }
    const baseTrigger = this.client.logTrigger({
      addresses: [hexToBase64(this.address)],
      topics,
    })
    const contract = this
    return {
      capabilityId: () => baseTrigger.capabilityId(),
      method: () => baseTrigger.method(),
      outputSchema: () => baseTrigger.outputSchema(),
      configAsAny: () => baseTrigger.configAsAny(),
      adapt: (rawOutput: EVMLog): DecodedLog<ReportReceiverUpdatedDecoded> => contract.decodeReportReceiverUpdated(rawOutput),
    }
  }

  /**
   * Decodes a log into ReportReceiverUpdated data, preserving all log metadata.
   */
  decodeReportReceiverUpdated(log: EVMLog): DecodedLog<ReportReceiverUpdatedDecoded> {
    const decoded = decodeEventLog({
      abi: CropInsuranceABI,
      data: bytesToHex(log.data),
      topics: log.topics.map((t) => bytesToHex(t)) as [Hex, ...Hex[]],
    })
    const { data: _, ...rest } = log
    return { ...rest, data: decoded.args as unknown as ReportReceiverUpdatedDecoded }
  }
}

