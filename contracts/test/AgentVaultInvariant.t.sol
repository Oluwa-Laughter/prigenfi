// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;
import {AgentVault} from "../src/AgentVault.sol";
import {MockUSD} from "../src/MockUSD.sol";

contract TransferHandler {
    AgentVault public vault;
    MockUSD public token;
    address public recipient;

    constructor(AgentVault v, MockUSD t, address r) {
        vault = v;
        token = t;
        recipient = r;
    }

    function attempt(uint128 input) public {
        uint128 amount = input % 151;
        try vault.executeTransfer(address(token), recipient, amount, vault.nonces(address(this))) {} catch {}
    }
}

contract AgentVaultInvariantTest {
    AgentVault public vault;
    MockUSD public token;
    TransferHandler public handler;
    address[] private targets;
    address constant RECIPIENT = address(0xB0B);

    function setUp() public {
        vault = new AgentVault(address(this));
        token = new MockUSD();
        handler = new TransferHandler(vault, token, RECIPIENT);
        token.mint(address(vault), 1000);
        vault.setPermission(address(handler), address(token), RECIPIENT, 100, 200, uint64(block.timestamp + 30 days));
        targets.push(address(handler));
    }

    function targetContracts() public view returns (address[] memory) {
        return targets;
    }

    function invariantCapitalBoundary() public view {
        require(token.balanceOf(RECIPIENT) <= 200, "daily cap bypass");
        require(token.balanceOf(address(vault)) >= 800, "principal boundary");
        require(token.balanceOf(address(vault)) + token.balanceOf(RECIPIENT) == 1000, "capital not conserved");
    }
}
