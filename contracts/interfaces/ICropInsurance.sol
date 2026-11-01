// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ICropInsurance
/// @notice Interface agreed between the contract, CRE workflow and frontend.
/// @dev Units:
///      - rainfall and trigger: whole millimetres (uint256)
///      - latitude / longitude: degrees x 1e6 (int32), e.g. 13.1367 -> 13136700
///      - startTime / endTime: Unix timestamps in seconds, UTC; window is [startTime, endTime)
///      - duration: seconds
interface ICropInsurance {
    /// @notice One entry in the fixed policy catalogue. Set once at deployment.
    struct PolicyOption {
        uint256 thresholdMm;
        uint64 duration;
        uint256 payoutAmount;
    }

    /// @notice A farmer's enrolment in one catalogue option.
    struct Policy {
        address owner;
        uint256 optionId;
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

    event PolicyCreated(uint256 indexed policyId, address indexed owner, uint256 indexed optionId);
    event RainfallReportAccepted(uint256 indexed policyId, uint256 rainfallMm);
    event ClaimPaid(uint256 indexed policyId, address indexed owner, uint256 amount);

    /// @notice Enrol in a catalogue option. Start must be in the future and on a full UTC hour.
    function enroll(uint256 optionId, int32 latitudeE6, int32 longitudeE6, uint64 startTime)
        external
        returns (uint256 policyId);

    /// @notice Called only by the authorised report receiver.
    function recordRainfall(uint256 policyId, uint64 startTime, uint64 endTime, uint256 rainfallMm) external;

    function claim(uint256 policyId) external;

    function optionCount() external view returns (uint256);

    function getOption(uint256 optionId) external view returns (PolicyOption memory);

    function getPolicy(uint256 policyId) external view returns (Policy memory);

    function isEligible(uint256 policyId) external view returns (bool);
}
