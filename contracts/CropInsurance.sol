// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ICropInsurance} from "./interfaces/ICropInsurance.sol";

/// @title CropInsurance
/// @notice Rainfall-based parametric crop insurance prototype. Test tokens only; not a real insurance product.
/// @dev Claim eligibility depends only on the accepted rainfall report, the policy threshold,
///      the observation window and the claimed flag. No other input (including AI predictions)
///      can change policy terms or trigger a payout.
contract CropInsurance is ICropInsurance, Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable payoutToken;
    address public reportReceiver;
    uint256 public nextPolicyId = 1;

    mapping(uint256 => Policy) private policies;

    event ReportReceiverUpdated(address indexed previousReceiver, address indexed newReceiver);

    error ZeroAddress();
    error InvalidThreshold();
    error InvalidPayout();
    error InvalidPeriod();
    error InvalidLocation();
    error PolicyNotFound(uint256 policyId);
    error NotReportReceiver();
    error PeriodMismatch();
    error ObservationNotEnded(uint256 policyId);
    error ReportAlreadyAccepted(uint256 policyId);
    error NotPolicyOwner();
    error NoReport(uint256 policyId);
    error AlreadyClaimed(uint256 policyId);
    error NotEligible(uint256 policyId);
    error InsufficientPayoutBalance(uint256 available, uint256 required);

    modifier onlyReportReceiver() {
        if (msg.sender != reportReceiver) revert NotReportReceiver();
        _;
    }

    constructor(address token) Ownable(msg.sender) {
        if (token == address(0)) revert ZeroAddress();
        payoutToken = IERC20(token);
    }

    /// @notice Sets the CRE report receiver contract allowed to record rainfall.
    function setReportReceiver(address receiver) external onlyOwner {
        if (receiver == address(0)) revert ZeroAddress();
        emit ReportReceiverUpdated(reportReceiver, receiver);
        reportReceiver = receiver;
    }

    /// @inheritdoc ICropInsurance
    function createPolicy(
        int32 latitudeE6,
        int32 longitudeE6,
        uint64 startTime,
        uint64 endTime,
        uint256 thresholdMm,
        uint256 payoutAmount
    ) external returns (uint256 policyId) {
        if (thresholdMm == 0) revert InvalidThreshold();
        if (payoutAmount == 0) revert InvalidPayout();
        if (startTime >= endTime) revert InvalidPeriod();
        if (latitudeE6 < -90_000_000 || latitudeE6 > 90_000_000) revert InvalidLocation();
        if (longitudeE6 < -180_000_000 || longitudeE6 > 180_000_000) revert InvalidLocation();

        policyId = nextPolicyId++;
        policies[policyId] = Policy({
            owner: msg.sender,
            latitudeE6: latitudeE6,
            longitudeE6: longitudeE6,
            startTime: startTime,
            endTime: endTime,
            thresholdMm: thresholdMm,
            payoutAmount: payoutAmount,
            reported: false,
            rainfallMm: 0,
            claimed: false
        });

        emit PolicyCreated(policyId, msg.sender);
    }

    /// @inheritdoc ICropInsurance
    /// @dev One final report per policy. The observation window must match and must have ended.
    function recordRainfall(uint256 policyId, uint64 startTime, uint64 endTime, uint256 rainfallMm)
        external
        onlyReportReceiver
    {
        Policy storage policy = _getExisting(policyId);
        if (policy.startTime != startTime || policy.endTime != endTime) revert PeriodMismatch();
        if (block.timestamp < policy.endTime) revert ObservationNotEnded(policyId);
        if (policy.reported) revert ReportAlreadyAccepted(policyId);

        policy.reported = true;
        policy.rainfallMm = rainfallMm;

        emit RainfallReportAccepted(policyId, rainfallMm);
    }

    /// @inheritdoc ICropInsurance
    function claim(uint256 policyId) external {
        Policy storage policy = _getExisting(policyId);

        // Checks
        if (msg.sender != policy.owner) revert NotPolicyOwner();
        if (!policy.reported) revert NoReport(policyId);
        if (policy.claimed) revert AlreadyClaimed(policyId);
        if (policy.rainfallMm >= policy.thresholdMm) revert NotEligible(policyId);

        uint256 balance = payoutToken.balanceOf(address(this));
        if (balance < policy.payoutAmount) revert InsufficientPayoutBalance(balance, policy.payoutAmount);

        // Effects
        policy.claimed = true;

        // Interactions
        payoutToken.safeTransfer(policy.owner, policy.payoutAmount);

        emit ClaimPaid(policyId, policy.owner, policy.payoutAmount);
    }

    /// @inheritdoc ICropInsurance
    function getPolicy(uint256 policyId) external view returns (Policy memory) {
        return _getExisting(policyId);
    }

    /// @inheritdoc ICropInsurance
    /// @dev Eligible only if a report was accepted, rainfall is strictly below the threshold and not yet claimed.
    function isEligible(uint256 policyId) external view returns (bool) {
        Policy storage policy = _getExisting(policyId);
        return policy.reported && !policy.claimed && policy.rainfallMm < policy.thresholdMm;
    }

    function _getExisting(uint256 policyId) private view returns (Policy storage policy) {
        policy = policies[policyId];
        if (policy.owner == address(0)) revert PolicyNotFound(policyId);
    }
}
