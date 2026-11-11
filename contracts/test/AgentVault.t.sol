// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;
import {AgentVault} from "../src/AgentVault.sol";
import {MockUSD} from "../src/MockUSD.sol";
import {VaultFactory} from "../src/VaultFactory.sol";

interface Vm {
    function prank(address) external;
    function expectRevert() external;
    function expectRevert(bytes4) external;
    function warp(uint256) external;
    function chainId(uint256) external;
    function targetContract(address) external;
}

contract AgentVaultTest {
    Vm constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    AgentVault vault;
    MockUSD token;
    address constant AGENT = address(0xA11CE);
    address constant RECIPIENT = address(0xB0B);

    function setUp() public {
        vm.chainId(31337);
        vault = new AgentVault(address(this));
        token = new MockUSD();
        token.mint(address(vault), 1_000_000_000);
        vault.setTokenDailyLimit(address(token), 200);
        vault.setPermission(AGENT, address(token), RECIPIENT, 100, 200, uint64(block.timestamp + 1 days));
    }

    function send(uint128 amount, uint256 nonce) internal {
        vm.prank(AGENT);
        vault.executeTransfer(address(token), RECIPIENT, amount, nonce);
    }

    function testOwnerAndFactory() public {
        VaultFactory factory = new VaultFactory();
        vm.prank(RECIPIENT);
        AgentVault created = AgentVault(factory.createVault());
        require(created.owner() == RECIPIENT);
    }

    function testAllAgentsShareOneTokenBudget() public {
        address agentTwo = address(0xA2);
        vault.setTokenDailyLimit(address(token), 150);
        vault.setPermission(agentTwo, address(token), RECIPIENT, 100, 200, uint64(block.timestamp + 1 days));
        send(100, 0);
        vm.prank(agentTwo);
        vault.executeTransfer(address(token), RECIPIENT, 50, 0);
        vm.expectRevert(AgentVault.PolicyDenied.selector);
        vm.prank(agentTwo);
        vault.executeTransfer(address(token), RECIPIENT, 1, 1);
        // Reauthorizing resets the per-agent window but cannot reset aggregate token spending.
        vault.setPermission(AGENT, address(token), RECIPIENT, 100, 200, uint64(block.timestamp + 1 days));
        vm.expectRevert(AgentVault.PolicyDenied.selector);
        send(1, 1);
        (uint128 daily, uint128 spent,) = vault.tokenBudgets(address(token));
        require(daily == 150 && spent == 150);
        require(vault.nonces(AGENT) == 1);
        require(vault.nonces(agentTwo) == 1);
        require(token.balanceOf(RECIPIENT) == 150);
    }

    function testUnsetBudgetAndOwnerLimitUpdatesNeverResetSpending() public {
        vault.setTokenDailyLimit(address(token), 0);
        vm.expectRevert(AgentVault.PolicyDenied.selector);
        send(1, 0);
        vault.setTokenDailyLimit(address(token), 100);
        send(100, 0);
        vault.setTokenDailyLimit(address(token), 50);
        vm.expectRevert(AgentVault.PolicyDenied.selector);
        send(1, 1);
        vault.setTokenDailyLimit(address(token), 120);
        send(20, 1);
        vm.expectRevert(AgentVault.PolicyDenied.selector);
        send(1, 2);
        require(token.balanceOf(RECIPIENT) == 120);
        (uint128 daily, uint128 spent,) = vault.tokenBudgets(address(token));
        require(daily == 120 && spent == 120);
    }

    function testIndependentTokenBudgetsAndNextDayReset() public {
        MockUSD other = new MockUSD();
        other.mint(address(vault), 200);
        vault.setPermission(AGENT, address(other), RECIPIENT, 100, 200, uint64(block.timestamp + 2 days));
        vm.expectRevert(AgentVault.PolicyDenied.selector);
        vm.prank(AGENT);
        vault.executeTransfer(address(other), RECIPIENT, 1, 0);
        vault.setTokenDailyLimit(address(other), 25);
        vm.prank(AGENT);
        vault.executeTransfer(address(other), RECIPIENT, 25, 0);
        send(100, 1);
        require(other.balanceOf(RECIPIENT) == 25 && token.balanceOf(RECIPIENT) == 100);
        vm.warp(block.timestamp + 1 days);
        vault.setPermission(AGENT, address(token), RECIPIENT, 100, 200, uint64(block.timestamp + 1 days));
        send(100, 2);
        (, uint128 spent, uint64 day) = vault.tokenBudgets(address(token));
        require(spent == 100 && day == uint64(block.timestamp / 1 days));
    }

    function testFuzzMultiAgentCannotExceedSharedTokenLimit(uint128 amountA, uint128 amountB) public {
        uint128 a = uint128(uint256(amountA) % 101);
        uint128 b = uint128(uint256(amountB) % 101);
        address agentTwo = address(0xA2);
        vault.setTokenDailyLimit(address(token), 125);
        vault.setPermission(agentTwo, address(token), RECIPIENT, 100, 200, uint64(block.timestamp + 1 days));
        if (a > 0) send(a, 0);
        if (b > 0) {
            if (uint256(a) + b > 125) {
                vm.expectRevert(AgentVault.PolicyDenied.selector);
            }
            vm.prank(agentTwo);
            vault.executeTransfer(address(token), RECIPIENT, b, 0);
        }
        (uint128 limit, uint128 spent,) = vault.tokenBudgets(address(token));
        require(limit == 125 && spent <= limit);
        require(token.balanceOf(RECIPIENT) == spent);
    }

    function testDailyCapAndReplay() public {
        send(100, 0);
        vm.expectRevert(AgentVault.PolicyDenied.selector);
        send(100, 0);
        send(100, 1);
        vm.expectRevert(AgentVault.PolicyDenied.selector);
        send(1, 2);
        require(token.balanceOf(RECIPIENT) == 200);
    }

    function testExpiryAndUtcReset() public {
        send(100, 0);
        send(100, 1);
        vm.warp(block.timestamp + 1 days);
        vm.expectRevert(AgentVault.PolicyDenied.selector);
        send(1, 2);
        vault.setPermission(AGENT, address(token), RECIPIENT, 100, 200, uint64(block.timestamp + 2 days));
        send(100, 2);
        send(100, 3);
        vm.warp(block.timestamp + 1 days);
        send(100, 4);
    }

    function testRevocationAndPause() public {
        vault.revoke(AGENT, address(token));
        vm.expectRevert(AgentVault.PolicyDenied.selector);
        send(1, 0);
        vault.setPermission(AGENT, address(token), RECIPIENT, 100, 200, uint64(block.timestamp + 1 days));
        vault.setPaused(true);
        vm.expectRevert(AgentVault.PolicyDenied.selector);
        send(1, 0);
        vault.withdraw(address(token), address(this), 10);
        vault.setPaused(false);
        send(1, 0);
    }

    function testUnauthorizedManagement() public {
        vm.expectRevert(AgentVault.Unauthorized.selector);
        vm.prank(AGENT);
        vault.withdraw(address(token), AGENT, 1);
        vm.expectRevert(AgentVault.Unauthorized.selector);
        vm.prank(AGENT);
        vault.setTokenDailyLimit(address(token), 1);
        vm.expectRevert(AgentVault.InvalidPermission.selector);
        vault.setTokenDailyLimit(address(0), 100);
        vm.expectRevert(AgentVault.Unauthorized.selector);
        vm.prank(AGENT);
        vault.setPaused(false);
        vm.expectRevert(AgentVault.Unauthorized.selector);
        vm.prank(AGENT);
        vault.revoke(AGENT, address(token));
        vm.expectRevert(AgentVault.Unauthorized.selector);
        vm.prank(AGENT);
        vault.setPermission(AGENT, address(token), AGENT, 100, 200, uint64(block.timestamp + 1 days));
    }

    function testWrongTargetTokenAndChain() public {
        vm.expectRevert(AgentVault.PolicyDenied.selector);
        vm.prank(AGENT);
        vault.executeTransfer(address(token), AGENT, 1, 0);
        MockUSD other = new MockUSD();
        vm.expectRevert(AgentVault.PolicyDenied.selector);
        vm.prank(AGENT);
        vault.executeTransfer(address(other), RECIPIENT, 1, 0);
        vm.chainId(1);
        vm.expectRevert(AgentVault.UnsupportedChain.selector);
        send(1, 0);
        vm.expectRevert(AgentVault.UnsupportedChain.selector);
        new AgentVault(address(this));
    }

    function testTransferFailureRollsBackNonce() public {
        vault.withdraw(address(token), address(this), token.balanceOf(address(vault)));
        vm.expectRevert();
        send(1, 0);
        require(vault.nonces(AGENT) == 0);
    }

    function testFuzzCannotExceedOperationCap(uint128 amount) public {
        if (amount == 0 || amount > 100) {
            vm.expectRevert(AgentVault.PolicyDenied.selector);
            send(amount, 0);
        } else {
            send(amount, 0);
            require(token.balanceOf(RECIPIENT) == amount);
        }
        require(token.balanceOf(address(vault)) >= 1_000_000_000 - 100);
    }

    function testFuzzNonceCannotSkip(uint256 nonce) public {
        if (nonce == 0) return;
        vm.expectRevert(AgentVault.PolicyDenied.selector);
        send(1, nonce);
    }
}
