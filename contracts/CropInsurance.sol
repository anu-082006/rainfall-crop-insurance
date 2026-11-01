// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ICropInsurance} from "./interfaces/ICropInsurance.sol";

/// @title CropInsurance
/// @notice Rainfall-based parametric crop insurance prototype. Test tokens only; not a real insurance product.
/// @dev Farmers enrol in options from a fixed catalogue set at deployment. Claim eligibility depends only on
///      the accepted rainfall report, the policy trigger, the coverage window and the claimed flag.
///      No other input (including AI recommendations) can change policy terms or trigger a payout.
contract CropInsurance is ICropInsurance, Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable payoutToken;
    address public reportReceiver;
    uint256 public nextPolicyId = 1;

    PolicyOption[] private options;
    mapping(uint256 => Policy) private policies;

    event ReportReceiverUpdated(address indexed previousReceiver, address indexed newReceiver);

    error ZeroAddress();
    error EmptyCatalogue();
    error InvalidOptionTerms(uint256 optionId);
    error InvalidOption(uint256 optionId);
    error InvalidLocation();
    error StartNotInFuture();
    error StartNotOnFullHour();
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

    /// @param token The ERC-20 used for payouts.
    /// @param catalogue The fixed policy options. They cannot be changed after deployment.
    constructor(address token, PolicyOption[] memory catalogue) Ownable(msg.sender) {
        if (token == address(0)) revert ZeroAddress();
        if (catalogue.length == 0) revert EmptyCatalogue();
        payoutToken = IERC20(token);

        for (uint256 i = 0; i < catalogue.length; i++) {
            PolicyOption memory option = catalogue[i];
            // Duration must be whole hours so the end time also falls on a full hour.
            if (
                option.thresholdMm == 0 || option.payoutAmount == 0 || option.duration == 0
                    || option.duration % 1 hours != 0
            ) {
                revert InvalidOptionTerms(i);
            }
            options.push(option);
        }
    }

    /// @notice Sets the CRE report receiver contract allowed to record rainfall.
    function setReportReceiver(address receiver) external onlyOwner {
        if (receiver == address(0)) revert ZeroAddress();
        emit ReportReceiverUpdated(reportReceiver, receiver);
        reportReceiver = receiver;
    }

    /// @inheritdoc ICropInsurance
    function enroll(uint256 optionId, int32 latitudeE6, int32 longitudeE6, uint64 startTime)
        external
        returns (uint256 policyId)
    {
        if (optionId >= options.length) revert InvalidOption(optionId);
        if (latitudeE6 < -90_000_000 || latitudeE6 > 90_000_000) revert InvalidLocation();
        if (longitudeE6 < -180_000_000 || longitudeE6 > 180_000_000) revert InvalidLocation();
        if (startTime <= block.timestamp) revert StartNotInFuture();
        if (startTime % 1 hours != 0) revert StartNotOnFullHour();

        PolicyOption memory option = options[optionId];

        policyId = nextPolicyId++;
        policies[policyId] = Policy({
            owner: msg.sender,
            optionId: optionId,
            latitudeE6: latitudeE6,
            longitudeE6: longitudeE6,
            startTime: startTime,
            endTime: startTime + option.duration,
            thresholdMm: option.thresholdMm,
            payoutAmount: option.payoutAmount,
            reported: false,
            rainfallMm: 0,
            claimed: false
        });

        emit PolicyCreated(policyId, msg.sender, optionId);
    }

    /// @inheritdoc ICropInsurance
    /// @dev One final report per policy. The coverage window must match and must have ended.
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
    function optionCount() external view returns (uint256) {
        return options.length;
    }

    /// @inheritdoc ICropInsurance
    function getOption(uint256 optionId) external view returns (PolicyOption memory) {
        if (optionId >= options.length) revert InvalidOption(optionId);
        return options[optionId];
    }

    /// @inheritdoc ICropInsurance
    function getPolicy(uint256 policyId) external view returns (Policy memory) {
        return _getExisting(policyId);
    }

    /// @inheritdoc ICropInsurance
    /// @dev Eligible only if a report was accepted, rainfall is strictly below the trigger and not yet claimed.
    function isEligible(uint256 policyId) external view returns (bool) {
        Policy storage policy = _getExisting(policyId);
        return policy.reported && !policy.claimed && policy.rainfallMm < policy.thresholdMm;
    }

    function _getExisting(uint256 policyId) private view returns (Policy storage policy) {
        policy = policies[policyId];
        if (policy.owner == address(0)) revert PolicyNotFound(policyId);
    }
}
