// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ICropInsurance} from "../contracts/interfaces/ICropInsurance.sol";

/// @title PolicyCatalogue
/// @notice The fixed catalogue passed to CropInsurance at deployment (13 options).
/// @dev Rule: a typical crop needs ~5 mm/day. Triggers meet ~20% / 40% / 60% of that need.
///      Option 0     Demo      2 hours   trigger 1 mm              payout 10 RTT
///      Options 1-4  Severe    1 mm/day  payout 3 RTT/day  for 30 / 60 / 90 / 120 days
///      Options 5-8  Moderate  2 mm/day  payout 2 RTT/day  for 30 / 60 / 90 / 120 days
///      Options 9-12 Mild      3 mm/day  payout 1 RTT/day  for 30 / 60 / 90 / 120 days
library PolicyCatalogue {
    uint256 internal constant RTT = 1e18;

    function options() internal pure returns (ICropInsurance.PolicyOption[] memory list) {
        list = new ICropInsurance.PolicyOption[](13);
        list[0] = ICropInsurance.PolicyOption({thresholdMm: 1, duration: 2 hours, payoutAmount: 10 * RTT});

        uint64[4] memory durationsDays = [uint64(30), 60, 90, 120];
        uint256[3] memory mmPerDay = [uint256(1), 2, 3]; // severe, moderate, mild
        uint256[3] memory rttPerDay = [uint256(3), 2, 1];

        uint256 id = 1;
        for (uint256 level = 0; level < 3; level++) {
            for (uint256 d = 0; d < 4; d++) {
                uint64 daysCovered = durationsDays[d];
                list[id++] = ICropInsurance.PolicyOption({
                    thresholdMm: mmPerDay[level] * daysCovered,
                    duration: daysCovered * 1 days,
                    payoutAmount: rttPerDay[level] * daysCovered * RTT
                });
            }
        }
    }
}
