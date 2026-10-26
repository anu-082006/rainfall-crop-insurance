// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {CropInsurance} from "../contracts/CropInsurance.sol";
import {RainfallReportReceiver} from "../contracts/RainfallReportReceiver.sol";
import {TestToken} from "../contracts/TestToken.sol";
import {IReceiver} from "../contracts/cre/IReceiver.sol";
import {ReceiverTemplate} from "../contracts/cre/ReceiverTemplate.sol";

contract RainfallReportReceiverTest is Test {
    CropInsurance insurance;
    RainfallReportReceiver receiver;

    address forwarder = makeAddr("forwarder");
    address attacker = makeAddr("attacker");
    address farmer = makeAddr("farmer");

    uint64 constant START = 1_000_000;
    uint64 constant END = START + 7 days;
    bytes32 constant WORKFLOW_ID = keccak256("rainfall-workflow");
    address workflowOwner = makeAddr("workflowOwner");

    uint256 policyId;

    function setUp() public {
        TestToken token = new TestToken();
        insurance = new CropInsurance(address(token));
        receiver = new RainfallReportReceiver(forwarder, address(insurance));
        insurance.setReportReceiver(address(receiver));

        vm.prank(farmer);
        policyId = insurance.createPolicy(12_971_599, 77_594_566, START, END, 50, 100e18);
        vm.warp(END + 1 days);
    }

    function _payload(uint8 version) internal view returns (bytes memory) {
        return abi.encode(version, policyId, START, END, uint256(10));
    }

    /// 64-byte metadata as delivered by KeystoneForwarder: workflowId, workflowName, owner, reportId.
    function _metadata(bytes32 workflowId) internal view returns (bytes memory) {
        return abi.encodePacked(workflowId, bytes10("rainfall"), workflowOwner, bytes2(0));
    }

    function test_ForwarderReportIsAccepted() public {
        vm.prank(forwarder);
        receiver.onReport("", _payload(1));
        assertTrue(insurance.getPolicy(policyId).reported);
    }

    function test_RevertWhen_CallerIsNotForwarder() public {
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(ReceiverTemplate.InvalidSender.selector, attacker, forwarder));
        receiver.onReport("", _payload(1));
    }

    function test_RevertWhen_ReportVersionUnsupported() public {
        vm.prank(forwarder);
        vm.expectRevert(abi.encodeWithSelector(RainfallReportReceiver.UnsupportedReportVersion.selector, 2));
        receiver.onReport("", _payload(2));
    }

    function test_RevertWhen_PayloadMalformed() public {
        vm.prank(forwarder);
        vm.expectRevert();
        receiver.onReport("", abi.encode(uint256(1)));
    }

    function test_WorkflowIdCheck_AcceptsExpectedWorkflow() public {
        receiver.setExpectedWorkflowId(WORKFLOW_ID);

        vm.prank(forwarder);
        receiver.onReport(_metadata(WORKFLOW_ID), _payload(1));
        assertTrue(insurance.getPolicy(policyId).reported);
    }

    function test_RevertWhen_WorkflowIdDoesNotMatch() public {
        receiver.setExpectedWorkflowId(WORKFLOW_ID);
        bytes32 otherId = keccak256("other-workflow");

        vm.prank(forwarder);
        vm.expectRevert(abi.encodeWithSelector(ReceiverTemplate.InvalidWorkflowId.selector, otherId, WORKFLOW_ID));
        receiver.onReport(_metadata(otherId), _payload(1));
    }

    function test_SupportsIReceiverInterface() public view {
        assertTrue(receiver.supportsInterface(type(IReceiver).interfaceId));
        assertTrue(receiver.supportsInterface(type(IERC165).interfaceId));
    }
}
