/**
 * abi.ts
 *
 * Smart contract interface specifications according to Person 1's actual Solidity contracts:
 * - CropInsurance.sol (ICropInsurance)
 * - TestToken.sol (ERC-20 RTT with admin mint)
 *
 * Synchronized with team_repo/contracts/CropInsurance.sol:
 * 1. INSURANCE_ABI: Complete on-chain interface for Parametric Crop Insurance.
 * 2. RTT_TOKEN_ABI: Standard ERC-20 interface with admin mint for test tokens.
 * 3. CONTRACT_CUSTOM_ERRORS: Enumerated list of custom errors from CropInsurance.sol.
 */

export const INSURANCE_ABI = [
  // ── Catalogue view functions ─────────────────────────────────────────────
  "function optionCount() view returns (uint256)",
  "function getOption(uint256 optionId) view returns (tuple(uint256 thresholdMm, uint64 duration, uint256 payoutAmount))",

  // ── Policy lifecycle functions ───────────────────────────────────────────
  "function enroll(uint256 optionId, int32 latitudeE6, int32 longitudeE6, uint64 startTime) returns (uint256)",
  "function getPolicy(uint256 policyId) view returns (tuple(address owner, uint256 optionId, int32 latitudeE6, int32 longitudeE6, uint64 startTime, uint64 endTime, uint256 thresholdMm, uint256 payoutAmount, bool reported, uint256 rainfallMm, bool claimed))",
  "function isEligible(uint256 policyId) view returns (bool)",
  "function nextPolicyId() view returns (uint256)",
  "function claim(uint256 policyId)",
  "function payoutToken() view returns (address)",
  "function reportReceiver() view returns (address)",
  "function owner() view returns (address)",

  // ── Contract Events (Person 1 CropInsurance.sol) ──────────────────────────
  "event PolicyCreated(uint256 indexed policyId, address indexed owner, uint256 indexed optionId)",
  "event RainfallReportAccepted(uint256 indexed policyId, uint256 rainfallMm)",
  "event ClaimPaid(uint256 indexed policyId, address indexed owner, uint256 amount)",
  "event ReportReceiverUpdated(address indexed previousReceiver, address indexed newReceiver)",

  // ── Custom Contract Errors (CropInsurance.sol) ───────────────────────────
  "error ZeroAddress()",
  "error EmptyCatalogue()",
  "error InvalidOptionTerms(uint256 optionId)",
  "error InvalidOption(uint256 optionId)",
  "error InvalidLocation()",
  "error StartNotInFuture()",
  "error StartNotOnFullHour()",
  "error PolicyNotFound(uint256 policyId)",
  "error NotReportReceiver()",
  "error PeriodMismatch()",
  "error ObservationNotEnded(uint256 policyId)",
  "error ReportAlreadyAccepted(uint256 policyId)",
  "error NotPolicyOwner()",
  "error NoReport(uint256 policyId)",
  "error AlreadyClaimed(uint256 policyId)",
  "error NotEligible(uint256 policyId)",
  "error InsufficientPayoutBalance(uint256 available, uint256 required)",
] as const;

export const RTT_TOKEN_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  "function mint(address to, uint256 amount)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
] as const;

export const CONTRACT_CUSTOM_ERRORS = [
  "ZeroAddress",
  "EmptyCatalogue",
  "InvalidOptionTerms",
  "InvalidOption",
  "InvalidLocation",
  "StartNotInFuture",
  "StartNotOnFullHour",
  "PolicyNotFound",
  "NotReportReceiver",
  "PeriodMismatch",
  "ObservationNotEnded",
  "ReportAlreadyAccepted",
  "NotPolicyOwner",
  "NoReport",
  "AlreadyClaimed",
  "NotEligible",
  "InsufficientPayoutBalance",
  // Legacy aliases for backward compatibility
  "StartTimeInPast",
  "InvalidStartAlignment",
  "ReportNotAccepted",
  "ReportTooEarly",
] as const;

export type ContractCustomError = (typeof CONTRACT_CUSTOM_ERRORS)[number];
