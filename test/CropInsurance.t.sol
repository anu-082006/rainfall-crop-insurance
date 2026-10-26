// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {CropInsurance} from "../contracts/CropInsurance.sol";
import {ICropInsurance} from "../contracts/interfaces/ICropInsurance.sol";
import {RainfallReportReceiver} from "../contracts/RainfallReportReceiver.sol";
import {TestToken} from "../contracts/TestToken.sol";

contract CropInsuranceTest is Test {
    TestToken token;
    CropInsurance insurance;
    RainfallReportReceiver receiver;

    address forwarder = makeAddr("forwarder");
    address farmer = makeAddr("farmer");
    address attacker = makeAddr("attacker");

    // Bengaluru, 7-day window
    int32 constant LAT = 12_971_599;
    int32 constant LON = 77_594_566;
    uint64 constant START = 1_000_000;
    uint64 constant END = START + 7 days;
    uint256 constant THRESHOLD = 50; // mm
    uint256 constant PAYOUT = 100e18;

    function setUp() public {
        token = new TestToken();
        insurance = new CropInsurance(address(token));
        receiver = new RainfallReportReceiver(forwarder, address(insurance));
        insurance.setReportReceiver(address(receiver));
        token.mint(address(insurance), 1_000e18);
    }

    // ---------- helpers ----------

    function _createPolicy() internal returns (uint256) {
        vm.prank(farmer);
        return insurance.createPolicy(LAT, LON, START, END, THRESHOLD, PAYOUT);
    }

    function _report(uint256 policyId, uint256 rainfallMm) internal {
        vm.warp(END + 1 days);
        vm.prank(forwarder);
        receiver.onReport("", abi.encode(uint8(1), policyId, START, END, rainfallMm));
    }

    // ---------- policy creation ----------

    function test_CreatePolicy_StoresPolicyAndEmits() public {
        vm.expectEmit(true, true, false, false);
        emit ICropInsurance.PolicyCreated(1, farmer);
        uint256 id = _createPolicy();

        ICropInsurance.Policy memory p = insurance.getPolicy(id);
        assertEq(id, 1);
        assertEq(p.owner, farmer);
        assertEq(p.latitudeE6, LAT);
        assertEq(p.longitudeE6, LON);
        assertEq(p.startTime, START);
        assertEq(p.endTime, END);
        assertEq(p.thresholdMm, THRESHOLD);
        assertEq(p.payoutAmount, PAYOUT);
        assertFalse(p.reported);
        assertFalse(p.claimed);
    }

    function test_RevertWhen_ThresholdIsZero() public {
        vm.expectRevert(CropInsurance.InvalidThreshold.selector);
        insurance.createPolicy(LAT, LON, START, END, 0, PAYOUT);
    }

    function test_RevertWhen_PayoutIsZero() public {
        vm.expectRevert(CropInsurance.InvalidPayout.selector);
        insurance.createPolicy(LAT, LON, START, END, THRESHOLD, 0);
    }

    function test_RevertWhen_PeriodIsInvalid() public {
        vm.expectRevert(CropInsurance.InvalidPeriod.selector);
        insurance.createPolicy(LAT, LON, END, START, THRESHOLD, PAYOUT);
    }

    function test_RevertWhen_LocationIsInvalid() public {
        vm.expectRevert(CropInsurance.InvalidLocation.selector);
        insurance.createPolicy(90_000_001, LON, START, END, THRESHOLD, PAYOUT);

        vm.expectRevert(CropInsurance.InvalidLocation.selector);
        insurance.createPolicy(LAT, -180_000_001, START, END, THRESHOLD, PAYOUT);
    }

    function test_RevertWhen_PolicyDoesNotExist() public {
        vm.expectRevert(abi.encodeWithSelector(CropInsurance.PolicyNotFound.selector, 99));
        insurance.getPolicy(99);
    }

    // ---------- rainfall reports ----------

    function test_RevertWhen_ReportFromUnauthorizedCaller() public {
        uint256 id = _createPolicy();
        vm.warp(END + 1 days);

        vm.prank(attacker);
        vm.expectRevert(CropInsurance.NotReportReceiver.selector);
        insurance.recordRainfall(id, START, END, 0);
    }

    function test_ReportAccepted_EmitsEvent() public {
        uint256 id = _createPolicy();
        vm.expectEmit(true, false, false, true);
        emit ICropInsurance.RainfallReportAccepted(id, 10);
        _report(id, 10);

        ICropInsurance.Policy memory p = insurance.getPolicy(id);
        assertTrue(p.reported);
        assertEq(p.rainfallMm, 10);
    }

    function test_RevertWhen_ReportBeforePeriodEnds() public {
        uint256 id = _createPolicy();
        vm.warp(END - 1);

        vm.prank(forwarder);
        vm.expectRevert(abi.encodeWithSelector(CropInsurance.ObservationNotEnded.selector, id));
        receiver.onReport("", abi.encode(uint8(1), id, START, END, uint256(10)));
    }

    function test_RevertWhen_ReportPeriodDoesNotMatch() public {
        uint256 id = _createPolicy();
        vm.warp(END + 1 days);

        vm.prank(forwarder);
        vm.expectRevert(CropInsurance.PeriodMismatch.selector);
        receiver.onReport("", abi.encode(uint8(1), id, START, END + 1 days, uint256(10)));
    }

    function test_RevertWhen_DuplicateFinalReport() public {
        uint256 id = _createPolicy();
        _report(id, 10);

        vm.prank(forwarder);
        vm.expectRevert(abi.encodeWithSelector(CropInsurance.ReportAlreadyAccepted.selector, id));
        receiver.onReport("", abi.encode(uint8(1), id, START, END, uint256(80)));
    }

    // ---------- eligibility and claims ----------

    function test_BelowThreshold_EligibleAndClaimPays() public {
        uint256 id = _createPolicy();
        _report(id, THRESHOLD - 1);
        assertTrue(insurance.isEligible(id));

        vm.expectEmit(true, true, false, true);
        emit ICropInsurance.ClaimPaid(id, farmer, PAYOUT);
        vm.prank(farmer);
        insurance.claim(id);

        assertEq(token.balanceOf(farmer), PAYOUT);
        assertTrue(insurance.getPolicy(id).claimed);
        assertFalse(insurance.isEligible(id));
    }

    function test_EqualToThreshold_NotEligible() public {
        uint256 id = _createPolicy();
        _report(id, THRESHOLD);
        assertFalse(insurance.isEligible(id));

        vm.prank(farmer);
        vm.expectRevert(abi.encodeWithSelector(CropInsurance.NotEligible.selector, id));
        insurance.claim(id);
    }

    function test_AboveThreshold_NotEligible() public {
        uint256 id = _createPolicy();
        _report(id, THRESHOLD + 1);
        assertFalse(insurance.isEligible(id));

        vm.prank(farmer);
        vm.expectRevert(abi.encodeWithSelector(CropInsurance.NotEligible.selector, id));
        insurance.claim(id);
    }

    function test_RevertWhen_DuplicateClaim() public {
        uint256 id = _createPolicy();
        _report(id, 0);
        vm.prank(farmer);
        insurance.claim(id);

        vm.prank(farmer);
        vm.expectRevert(abi.encodeWithSelector(CropInsurance.AlreadyClaimed.selector, id));
        insurance.claim(id);

        assertEq(token.balanceOf(farmer), PAYOUT); // no second transfer
    }

    function test_RevertWhen_InsufficientContractBalance() public {
        vm.prank(farmer);
        uint256 id = insurance.createPolicy(LAT, LON, START, END, THRESHOLD, 5_000e18);
        _report(id, 0);

        vm.prank(farmer);
        vm.expectRevert(abi.encodeWithSelector(CropInsurance.InsufficientPayoutBalance.selector, 1_000e18, 5_000e18));
        insurance.claim(id);
    }

    function test_RevertWhen_NotPolicyOwnerClaims() public {
        uint256 id = _createPolicy();
        _report(id, 0);

        vm.prank(attacker);
        vm.expectRevert(CropInsurance.NotPolicyOwner.selector);
        insurance.claim(id);
    }

    /// No accepted rainfall report means no payout, whatever any off-chain source
    /// (including the AI risk estimate) suggests.
    function test_RevertWhen_ClaimWithoutAcceptedReport() public {
        uint256 id = _createPolicy();
        vm.warp(END + 1 days);
        assertFalse(insurance.isEligible(id));

        vm.prank(farmer);
        vm.expectRevert(abi.encodeWithSelector(CropInsurance.NoReport.selector, id));
        insurance.claim(id);
    }

    // ---------- admin ----------

    function test_RevertWhen_NonOwnerSetsReportReceiver() public {
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, attacker));
        insurance.setReportReceiver(attacker);
    }
}
