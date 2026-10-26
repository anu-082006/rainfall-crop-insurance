// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title TestToken
/// @notice TEST-ONLY ERC-20 used for demo payouts. Has no monetary value.
contract TestToken is ERC20, Ownable {
    constructor() ERC20("Rainfall Test Token", "RTT") Ownable(msg.sender) {}

    /// @notice TEST-ONLY mint, restricted to the deployer/test admin.
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
