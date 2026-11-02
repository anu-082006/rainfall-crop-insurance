// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {MockKeystoneForwarder} from "../contracts/cre/MockKeystoneForwarder.sol";
import {RainfallReportReceiver} from "../contracts/RainfallReportReceiver.sol";
import {CropInsurance} from "../contracts/CropInsurance.sol";
import {TestToken} from "../contracts/TestToken.sol";
import {PolicyCatalogue} from "../script/PolicyCatalogue.sol";

contract MockForwarderTest is Test {
    MockKeystoneForwarder forwarder;
    CropInsurance insurance;
    RainfallReportReceiver receiver;

    function setUp() public {
        forwarder = new MockKeystoneForwarder();
        TestToken token = new TestToken();
        insurance = new CropInsurance(address(token), PolicyCatalogue.options());
        receiver = new RainfallReportReceiver(address(forwarder), address(insurance));
        insurance.setReportReceiver(address(receiver));
    }

    function test_ForwarderWithKeystoneReport() public {
        uint64 start = 1790863200;
        uint64 end = 1790870400;

        vm.warp(start - 3600);
        uint256 policyId = insurance.enroll(0, 12971000, 77594000, start);
        vm.warp(end + 3600);

        bytes memory innerPayload = abi.encode(uint8(1), policyId, start, end, uint256(0));
        bytes memory header109 = new bytes(109);
        header109[0] = 0x01; // Keystone version 1

        bytes memory rawReport = abi.encodePacked(header109, innerPayload);
        bytes memory reportContext = new bytes(32);
        bytes[] memory signatures = new bytes[](1);
        signatures[0] = hex"1234";

        forwarder.report(address(receiver), rawReport, reportContext, signatures);

        assertTrue(insurance.getPolicy(policyId).reported);
    }
}
