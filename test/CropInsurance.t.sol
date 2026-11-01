// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {CropInsurance} from "../contracts/CropInsurance.sol";
import {ICropInsurance} from "../contracts/interfaces/ICropInsurance.sol";
import {RainfallReportReceiver} from "../contracts/RainfallReportReceiver.sol";
import {TestToken} from "../contracts/TestToken.sol";
import {PolicyCatalogue} from "../script/PolicyCatalogue.sol";

contract CropInsuranceTest is Test {
    TestToken token;
    CropInsurance insurance;
    RainfallReportReceiver receiver;

    address forwarder = makeAddr("forwarder");
    address farmer = makeAddr("farmer");
    address attacker = makeAddr("attacker");

    // Kolar, Karnataka
    int32 constant LAT = 13_136_700;
    int32 constant LON = 78_129_200;

    // Option 6: Moderate drought, 60 days, trigger 120 mm, payout 120 RTT
    uint256 constant OPTION = 6;
    uint256 constant THRESHOLD = 120;
    uint256 constant PAYOUT = 120e18;

    uint64 constant START = 1_796_428_800; // 05 Dec 2026 00:00 UTC (full hour)
    uint64 constant END = START + 60 days; // 03 Feb 2027 00:00 UTC
    uint64 constant NOW = START - 30 days; // enrolment happens before coverage starts

    uint256 constant FUNDING = 300e18;

    function setUp() public {
        vm.warp(NOW);
        token = new TestToken();
        insurance = new CropInsurance(address(token), PolicyCatalogue.options());
        receiver = new RainfallReportReceiver(forwarder, address(insurance));
        insurance.setReportReceiver(address(receiver));
        token.mint(address(insurance), FUNDING);
    }

    // ---------- helpers ----------

    function _enroll() internal returns (uint256) {
        vm.prank(farmer);
        return insurance.enroll(OPTION, LAT, LON, START);
    }

    function _report(uint256 policyId, uint256 rainfallMm) internal {
        ICropInsurance.Policy memory p = insurance.getPolicy(policyId);
        vm.warp(p.endTime + 1 hours);
        vm.prank(forwarder);
        receiver.onReport("", abi.encode(uint8(1), policyId, p.startTime, p.endTime, rainfallMm));
    }

    // ---------- catalogue ----------

    function test_Catalogue_HasThirteenOptions() public view {
        assertEq(insurance.optionCount(), 13);
    }

    function test_Catalogue_DemoOption() public view {
        ICropInsurance.PolicyOption memory o = insurance.getOption(0);
        assertEq(o.thresholdMm, 1);
        assertEq(o.duration, 2 hours);
        assertEq(o.payoutAmount, 10e18);
    }

    /// Options 1-12 follow the rule: severe 1 mm/day & 3 RTT/day, moderate 2 & 2, mild 3 & 1.
    function test_Catalogue_FollowsRule() public view {
        uint64[4] memory durationsDays = [uint64(30), 60, 90, 120];
        uint256[3] memory mmPerDay = [uint256(1), 2, 3];
        uint256[3] memory rttPerDay = [uint256(3), 2, 1];

        for (uint256 level = 0; level < 3; level++) {
            for (uint256 d = 0; d < 4; d++) {
                ICropInsurance.PolicyOption memory o = insurance.getOption(1 + level * 4 + d);
                assertEq(o.duration, durationsDays[d] * 1 days);
                assertEq(o.thresholdMm, mmPerDay[level] * durationsDays[d]);
                assertEq(o.payoutAmount, rttPerDay[level] * durationsDays[d] * 1e18);
            }
        }
    }

    function test_RevertWhen_CatalogueIsEmpty() public {
        ICropInsurance.PolicyOption[] memory empty = new ICropInsurance.PolicyOption[](0);
        vm.expectRevert(CropInsurance.EmptyCatalogue.selector);
        new CropInsurance(address(token), empty);
    }

    function test_RevertWhen_OptionTermsAreInvalid() public {
        ICropInsurance.PolicyOption[] memory bad = new ICropInsurance.PolicyOption[](2);
        bad[0] = ICropInsurance.PolicyOption({thresholdMm: 10, duration: 1 days, payoutAmount: 1e18});
        bad[1] = ICropInsurance.PolicyOption({thresholdMm: 10, duration: 90 minutes, payoutAmount: 1e18});
        vm.expectRevert(abi.encodeWithSelector(CropInsurance.InvalidOptionTerms.selector, 1));
        new CropInsurance(address(token), bad);
    }

    function test_RevertWhen_GetOptionOutOfRange() public {
        vm.expectRevert(abi.encodeWithSelector(CropInsurance.InvalidOption.selector, 13));
        insurance.getOption(13);
    }

    // ---------- enrolment ----------

    function test_Enroll_StoresPolicyAndCopiesTerms() public {
        vm.expectEmit(true, true, true, false);
        emit ICropInsurance.PolicyCreated(1, farmer, OPTION);
        uint256 id = _enroll();

        ICropInsurance.Policy memory p = insurance.getPolicy(id);
        assertEq(id, 1);
        assertEq(p.owner, farmer);
        assertEq(p.optionId, OPTION);
        assertEq(p.latitudeE6, LAT);
        assertEq(p.longitudeE6, LON);
        assertEq(p.startTime, START);
        assertEq(p.endTime, END); // calculated by the contract
        assertEq(p.thresholdMm, THRESHOLD); // copied from option 6
        assertEq(p.payoutAmount, PAYOUT);
        assertFalse(p.reported);
        assertFalse(p.claimed);
    }

    function test_Enroll_DemoOptionEndsTwoHoursLater() public {
        uint64 start = START - 29 days; // still in the future, full hour
        vm.prank(farmer);
        uint256 id = insurance.enroll(0, LAT, LON, start);
        assertEq(insurance.getPolicy(id).endTime, start + 2 hours);
    }

    function test_RevertWhen_OptionDoesNotExist() public {
        vm.prank(farmer);
        vm.expectRevert(abi.encodeWithSelector(CropInsurance.InvalidOption.selector, 13));
        insurance.enroll(13, LAT, LON, START);
    }

    function test_RevertWhen_StartIsNotInFuture() public {
        uint64 pastHour = NOW - 1 hours;
        vm.prank(farmer);
        vm.expectRevert(CropInsurance.StartNotInFuture.selector);
        insurance.enroll(OPTION, LAT, LON, pastHour);

        vm.prank(farmer);
        vm.expectRevert(CropInsurance.StartNotInFuture.selector);
        insurance.enroll(OPTION, LAT, LON, NOW);
    }

    function test_RevertWhen_StartIsNotOnFullHour() public {
        vm.prank(farmer);
        vm.expectRevert(CropInsurance.StartNotOnFullHour.selector);
        insurance.enroll(OPTION, LAT, LON, START + 30 minutes);
    }

    function test_RevertWhen_LocationIsInvalid() public {
        vm.prank(farmer);
        vm.expectRevert(CropInsurance.InvalidLocation.selector);
        insurance.enroll(OPTION, 90_000_001, LON, START);

        vm.prank(farmer);
        vm.expectRevert(CropInsurance.InvalidLocation.selector);
        insurance.enroll(OPTION, LAT, -180_000_001, START);
    }

    function test_RevertWhen_PolicyDoesNotExist() public {
        vm.expectRevert(abi.encodeWithSelector(CropInsurance.PolicyNotFound.selector, 99));
        insurance.getPolicy(99);
    }

    // ---------- rainfall reports ----------

    function test_RevertWhen_ReportFromUnauthorizedCaller() public {
        uint256 id = _enroll();
        vm.warp(END + 1 hours);

        vm.prank(attacker);
        vm.expectRevert(CropInsurance.NotReportReceiver.selector);
        insurance.recordRainfall(id, START, END, 0);
    }

    function test_ReportAccepted_EmitsEvent() public {
        uint256 id = _enroll();
        vm.expectEmit(true, false, false, true);
        emit ICropInsurance.RainfallReportAccepted(id, 82);
        _report(id, 82);

        ICropInsurance.Policy memory p = insurance.getPolicy(id);
        assertTrue(p.reported);
        assertEq(p.rainfallMm, 82);
    }

    function test_RevertWhen_ReportBeforeCoverageEnds() public {
        uint256 id = _enroll();
        vm.warp(END - 1);

        vm.prank(forwarder);
        vm.expectRevert(abi.encodeWithSelector(CropInsurance.ObservationNotEnded.selector, id));
        receiver.onReport("", abi.encode(uint8(1), id, START, END, uint256(82)));
    }

    function test_RevertWhen_ReportPeriodDoesNotMatch() public {
        uint256 id = _enroll();
        vm.warp(END + 1 days);

        vm.prank(forwarder);
        vm.expectRevert(CropInsurance.PeriodMismatch.selector);
        receiver.onReport("", abi.encode(uint8(1), id, START, END + 1 days, uint256(82)));
    }

    function test_RevertWhen_DuplicateFinalReport() public {
        uint256 id = _enroll();
        _report(id, 82);

        vm.prank(forwarder);
        vm.expectRevert(abi.encodeWithSelector(CropInsurance.ReportAlreadyAccepted.selector, id));
        receiver.onReport("", abi.encode(uint8(1), id, START, END, uint256(200)));
    }

    // ---------- eligibility and claims ----------

    function test_BelowTrigger_EligibleAndClaimPays() public {
        uint256 id = _enroll();
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

    function test_EqualToTrigger_NotEligible() public {
        uint256 id = _enroll();
        _report(id, THRESHOLD);
        assertFalse(insurance.isEligible(id));

        vm.prank(farmer);
        vm.expectRevert(abi.encodeWithSelector(CropInsurance.NotEligible.selector, id));
        insurance.claim(id);
    }

    function test_AboveTrigger_NotEligible() public {
        uint256 id = _enroll();
        _report(id, THRESHOLD + 1);
        assertFalse(insurance.isEligible(id));

        vm.prank(farmer);
        vm.expectRevert(abi.encodeWithSelector(CropInsurance.NotEligible.selector, id));
        insurance.claim(id);
    }

    function test_DemoOption_FullCycle() public {
        uint64 start = NOW + 1 hours - (NOW % 1 hours); // next full hour
        vm.prank(farmer);
        uint256 id = insurance.enroll(0, LAT, LON, start);
        _report(id, 0);

        vm.prank(farmer);
        insurance.claim(id);
        assertEq(token.balanceOf(farmer), 10e18);
    }

    function test_RevertWhen_DuplicateClaim() public {
        uint256 id = _enroll();
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
        uint256 id = insurance.enroll(4, LAT, LON, START); // Severe 120 days pays 360 RTT; contract holds 300
        _report(id, 0);

        vm.prank(farmer);
        vm.expectRevert(abi.encodeWithSelector(CropInsurance.InsufficientPayoutBalance.selector, FUNDING, 360e18));
        insurance.claim(id);
    }

    function test_RevertWhen_NotPolicyOwnerClaims() public {
        uint256 id = _enroll();
        _report(id, 0);

        vm.prank(attacker);
        vm.expectRevert(CropInsurance.NotPolicyOwner.selector);
        insurance.claim(id);
    }

    /// No accepted rainfall report means no payout, whatever any off-chain source
    /// (including the AI recommendation) suggests.
    function test_RevertWhen_ClaimWithoutAcceptedReport() public {
        uint256 id = _enroll();
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
