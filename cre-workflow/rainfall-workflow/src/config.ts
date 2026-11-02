import { z } from 'zod'

// ─── EVM Chain Configuration Schema ──────────────────────────
export const evmConfigSchema = z.object({
  /**
   * Chainlink chain selector name identifying the blockchain.
   * e.g. "ethereum-testnet-sepolia", "ethereum-mainnet"
   */
  chainSelectorName: z.string().min(1, 'chainSelectorName is required'),

  /**
   * Deployed CropInsurance smart contract address.
   * Used for querying policy terms and reading state.
   */
  insuranceAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'insuranceAddress must be a valid 20-byte EVM hex address'),

  /**
   * Optional RainfallReportReceiver consumer contract address.
   * Used for submitting verified rainfall reports via the forwarder.
   */
  receiverAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'receiverAddress must be a valid 20-byte EVM hex address')
    .optional(),

  /**
   * Gas limit allocated for on-chain contract transactions.
   */
  gasLimit: z.string().optional().default('500000'),
})

// ─── Main Workflow Configuration Schema ──────────────────────
export const configSchema = z.object({
  /**
   * Standard cron schedule expression for the workflow trigger.
   * e.g. "0 0 * * *" (daily at midnight)
   */
  schedule: z.string().default('0 0 * * *'),

  /**
   * Policy ID on the CropInsurance contract to process during this execution.
   */
  policyId: z.number().int().positive('policyId must be a positive integer'),

  /**
   * The smart contract interface used by this workflow.
   * Identifies the ABI specification (e.g. "ICropInsurance").
   */
  contractInterface: z.string().default('ICropInsurance'),

  /**
   * Target blockchain networks and deployed contract addresses.
   * Do not hardcode contract addresses across multiple files; define them here.
   */
  evms: z.array(evmConfigSchema).min(1, 'At least one EVM chain configuration is required'),

  /**
   * Optional manual coordinate/date overrides (primarily used for local/offline testing).
   */
  overrides: z
    .object({
      latitude: z.number().min(-90).max(90).optional(),
      longitude: z.number().min(-180).max(180).optional(),
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    })
    .optional(),
})

// ─── Inferred TypeScript Types ──────────────────────────────
export type Config = z.infer<typeof configSchema>
export type EVMConfig = z.infer<typeof evmConfigSchema>

/**
 * High-level configuration interface for the workflow components.
 */
export interface WorkflowConfig {
  chainSelectorName: string
  insuranceAddress: string
  receiverAddress?: string
  policyId: number
  contractInterface: string
  gasLimit?: string
  rpcUrl?: string
}

// ─── Helper Utilities ───────────────────────────────────────

/**
 * Returns the primary EVM configuration from the workflow config.
 * Throws if no EVM configuration is present.
 */
export function getPrimaryEVMConfig(config: Config): EVMConfig {
  const primary = config.evms[0]
  if (!primary) {
    throw new Error('Missing EVM chain configuration in workflow config')
  }
  return primary
}

/**
 * Converts the validated configuration into a simplified WorkflowConfig object.
 */
export function toWorkflowConfig(config: Config, rpcUrl?: string): WorkflowConfig {
  const evm = getPrimaryEVMConfig(config)
  return {
    chainSelectorName: evm.chainSelectorName,
    insuranceAddress: evm.insuranceAddress,
    receiverAddress: evm.receiverAddress,
    policyId: config.policyId,
    contractInterface: config.contractInterface,
    gasLimit: evm.gasLimit,
    rpcUrl,
  }
}
