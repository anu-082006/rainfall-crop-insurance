// Code generated — DO NOT EDIT.
import type { Address } from 'viem'
import { addContractMock, type ContractMock, type EvmMock } from '@chainlink/cre-sdk/test'

import { CropInsuranceABI } from './CropInsurance'

export type CropInsuranceMock = {
  getPolicy?: (policyId: bigint) => { owner: `0x${string}`; latitudeE6: number; longitudeE6: number; startTime: bigint; endTime: bigint; thresholdMm: bigint; payoutAmount: bigint; reported: boolean; rainfallMm: bigint; claimed: boolean }
  isEligible?: (policyId: bigint) => boolean
  nextPolicyId?: () => bigint
  owner?: () => `0x${string}`
  payoutToken?: () => `0x${string}`
  reportReceiver?: () => `0x${string}`
} & Pick<ContractMock<typeof CropInsuranceABI>, 'writeReport'>

export function newCropInsuranceMock(address: Address, evmMock: EvmMock): CropInsuranceMock {
  return addContractMock(evmMock, { address, abi: CropInsuranceABI }) as CropInsuranceMock
}

