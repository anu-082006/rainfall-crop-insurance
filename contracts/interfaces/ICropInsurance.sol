// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ICropInsurance
/// @notice Interface agreed between the contract, CRE workflow and frontend.
/// @dev Units:
///      - rainfall and threshold: whole millimetres (uint256)
///      - latitude / longitude: degrees x 1e6 (int32), e.g. 12.971599 -> 12971599
///      - startTime / endTime: Unix timestamps in seconds, UTC
interface ICropInsurance {
    struct Policy {
        address owner;
        int32 latitudeE6;
        int32 longitudeE6;
        uint64 startTime;
        uint64 endTime;
        uint256 thresholdMm;
        uint256 payoutAmount;
        bool reported;
        uint256 rainfallMm;
        bool claimed;
    }

    event PolicyCreated(uint256 indexed policyId, address indexed owner);
    event RainfallReportAccepted(uint256 indexed policyId, uint256 rainfallMm);
    event ClaimPaid(uint256 indexed policyId, address indexed owner, uint256 amount);

    function createPolicy(
        int32 latitudeE6,
        int32 longitudeE6,
        uint64 startTime,
        uint64 endTime,
        uint256 thresholdMm,
        uint256 payoutAmount
    ) external returns (uint256 policyId);

    /// @notice Called only by the authorised report receiver.
    function recordRainfall(uint256 policyId, uint64 startTime, uint64 endTime, uint256 rainfallMm) external;

    function claim(uint256 policyId) external;

    function getPolicy(uint256 policyId) external view returns (Policy memory);

    function isEligible(uint256 policyId) external view returns (bool);
}
