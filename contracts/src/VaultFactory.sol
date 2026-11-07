// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;
import {AgentVault} from "./AgentVault.sol";

contract VaultFactory {
    event VaultCreated(address indexed owner, address indexed vault);

    function createVault() external returns (address vault) {
        vault = address(new AgentVault(msg.sender));
        emit VaultCreated(msg.sender, vault);
    }
}
