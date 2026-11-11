// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;
import {AgentVault} from "../src/AgentVault.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

interface TestVm {
    function prank(address) external;
    function expectRevert() external;
}

contract FeeOnTop is ERC20 {
    constructor() ERC20("Fee on top", "FEE") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function transfer(address to, uint256 value) public override returns (bool) {
        super.transfer(to, value);
        super.transfer(address(0xFEE), 1);
        return true;
    }
}

contract CallbackToken is ERC20 {
    AgentVault public vault;
    bool public blocked;
    constructor() ERC20("Callback", "CALL") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function setVault(AgentVault v) external {
        vault = v;
    }

    function transfer(address to, uint256 value) public override returns (bool) {
        try vault.executeTransfer(address(this), to, 1, 0) {
            blocked = false;
        } catch {
            blocked = true;
        }
        return super.transfer(to, value);
    }
}

contract FalseReturnToken is ERC20 {
    constructor() ERC20("False return", "FALSE") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function transfer(address, uint256) public pure override returns (bool) {
        return false;
    }
}

contract AdversarialTokenTest {
    TestVm constant vm = TestVm(address(uint160(uint256(keccak256("hevm cheat code")))));
    address constant AGENT = address(0xA11CE);

    function testFeeCannotExceedBudget() public {
        AgentVault vault = new AgentVault(address(this));
        FeeOnTop token = new FeeOnTop();
        token.mint(address(vault), 1000);
        vault.setTokenDailyLimit(address(token), 200);
        vault.setPermission(AGENT, address(token), address(0xB0B), 100, 200, uint64(block.timestamp + 1 days));
        vm.expectRevert();
        vm.prank(AGENT);
        vault.executeTransfer(address(token), address(0xB0B), 100, 0);
        require(token.balanceOf(address(vault)) == 1000);
        require(vault.nonces(AGENT) == 0);
        (, uint128 spent,) = vault.tokenBudgets(address(token));
        require(spent == 0);
    }

    function testCallbackReentrancyBlocked() public {
        AgentVault vault = new AgentVault(address(this));
        CallbackToken token = new CallbackToken();
        token.setVault(vault);
        token.mint(address(vault), 1000);
        vault.setTokenDailyLimit(address(token), 200);
        vault.setPermission(AGENT, address(token), address(0xB0B), 100, 200, uint64(block.timestamp + 1 days));
        vault.setPermission(address(token), address(token), address(0xB0B), 100, 200, uint64(block.timestamp + 1 days));
        vm.prank(AGENT);
        vault.executeTransfer(address(token), address(0xB0B), 100, 0);
        require(token.blocked());
        require(vault.nonces(address(token)) == 0);
        require(token.balanceOf(address(0xB0B)) == 100);
    }

    function testFalseReturnRollsBackAccounting() public {
        AgentVault vault = new AgentVault(address(this));
        FalseReturnToken token = new FalseReturnToken();
        token.mint(address(vault), 1000);
        vault.setTokenDailyLimit(address(token), 200);
        vault.setPermission(AGENT, address(token), address(0xB0B), 100, 200, uint64(block.timestamp + 1 days));
        vm.expectRevert();
        vm.prank(AGENT);
        vault.executeTransfer(address(token), address(0xB0B), 100, 0);
        require(vault.nonces(AGENT) == 0);
        (, uint128 spent,) = vault.tokenBudgets(address(token));
        require(spent == 0);
    }
}
