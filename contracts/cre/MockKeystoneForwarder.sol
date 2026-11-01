// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IReceiver} from "./IReceiver.sol";

/// @title MockKeystoneForwarder
/// @notice Lightweight mock forwarder for local CRE simulation.
///         Unwraps Keystone report envelopes and routes payloads to consumer onReport().
contract MockKeystoneForwarder {
    function report(
        address receiver,
        bytes calldata rawReport,
        bytes calldata reportContext,
        bytes[] calldata /* signatures */
    ) external {
        bytes calldata metadata;
        bytes calldata payload;

        if (rawReport.length > 109 && rawReport[0] == 0x01) {
            // Keystone envelope format:
            // rawReport[45:109] is the 64-byte metadata (workflowId, workflowName, workflowOwner, reportId)
            // rawReport[109:] is the inner report payload
            metadata = rawReport[45:109];
            payload = rawReport[109:];
        } else {
            metadata = reportContext;
            payload = rawReport;
        }

        IReceiver(receiver).onReport(metadata, payload);
    }
}
