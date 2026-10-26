// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {CropInsurance} from "../contracts/CropInsurance.sol";
import {RainfallReportReceiver} from "../contracts/RainfallReportReceiver.sol";
import {TestToken} from "../contracts/TestToken.sol";

/// @notice Deploys TestToken, CropInsurance and RainfallReportReceiver, links them,
///         funds the insurance contract and writes addresses to deployments/<chainId>.json.
contract Deploy is Script {
    uint256 constant INITIAL_FUNDING = 1_000_000e18;

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address forwarder = vm.envAddress("FORWARDER_ADDRESS");

        vm.startBroadcast(deployerKey);
        TestToken token = new TestToken();
        CropInsurance insurance = new CropInsurance(address(token));
        RainfallReportReceiver receiver = new RainfallReportReceiver(forwarder, address(insurance));
        insurance.setReportReceiver(address(receiver));
        token.mint(address(insurance), INITIAL_FUNDING);
        vm.stopBroadcast();

        string memory key = "deployment";
        vm.serializeUint(key, "chainId", block.chainid);
        vm.serializeAddress(key, "testToken", address(token));
        vm.serializeAddress(key, "cropInsurance", address(insurance));
        vm.serializeAddress(key, "reportReceiver", address(receiver));
        string memory json = vm.serializeAddress(key, "forwarder", forwarder);
        vm.createDir("deployments", true);
        vm.writeJson(json, string.concat("deployments/", vm.toString(block.chainid), ".json"));

        console.log("TestToken:             ", address(token));
        console.log("CropInsurance:         ", address(insurance));
        console.log("RainfallReportReceiver:", address(receiver));
        console.log("Forwarder:             ", forwarder);
    }
}
