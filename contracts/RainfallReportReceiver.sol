// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReceiverTemplate} from "./cre/ReceiverTemplate.sol";
import {ICropInsurance} from "./interfaces/ICropInsurance.sol";

/// @title RainfallReportReceiver
/// @notice CRE consumer contract. Accepts verified reports from the configured forwarder,
///         decodes the rainfall payload and passes it to CropInsurance.
/// @dev Report payload (ABI-encoded):
///      (uint8 version, uint256 policyId, uint64 startTime, uint64 endTime, uint256 rainfallMm)
contract RainfallReportReceiver is ReceiverTemplate {
    uint8 public constant REPORT_VERSION = 1;

    ICropInsurance public immutable insurance;

    error ZeroInsuranceAddress();
    error UnsupportedReportVersion(uint8 version);

    constructor(address forwarder, address insuranceAddress) ReceiverTemplate(forwarder) {
        if (insuranceAddress == address(0)) revert ZeroInsuranceAddress();
        insurance = ICropInsurance(insuranceAddress);
    }

    function _processReport(bytes calldata report) internal override {
        // If a 109-byte Keystone envelope header is present (envelope version 1), unwrap payload
        if (report.length > 109 && report[0] == 0x01) {
            report = report[109:];
        }

        (uint8 version, uint256 policyId, uint64 startTime, uint64 endTime, uint256 rainfallMm) =
            abi.decode(report, (uint8, uint256, uint64, uint64, uint256));

        if (version != REPORT_VERSION) revert UnsupportedReportVersion(version);

        // Policy existence, window match, period end and duplicate checks happen in CropInsurance.
        insurance.recordRainfall(policyId, startTime, endTime, rainfallMm);
    }
}
