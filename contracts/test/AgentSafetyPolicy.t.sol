// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {AgentSafetyPolicy} from "../src/AgentSafetyPolicy.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

interface VmSafety {
    function warp(uint256) external;
    function prank(address) external;
    function expectRevert() external;
    function expectRevert(bytes4) external;
}

/// @dev Inherits namespaced parent storage; no token custody or execution added.
contract AgentSafetyPolicyV2 is AgentSafetyPolicy {
    function version() external pure returns (uint256) {
        return 2;
    }
}

contract InvalidUupsTarget {
    function version() external pure returns (uint256) {
        return 99;
    }
}

contract AgentSafetyPolicyTest {
    VmSafety constant vm = VmSafety(address(uint160(uint256(keccak256("hevm cheat code")))));
    AgentSafetyPolicy policy;
    AgentSafetyPolicy implementation;
    address constant ATTACKER = address(0xDEAD);
    address constant FUTURE_OWNER = address(0xB0B);

    function setUp() public {
        implementation = new AgentSafetyPolicy();
        ERC1967Proxy proxy =
            new ERC1967Proxy(address(implementation), abi.encodeCall(AgentSafetyPolicy.initialize, (address(this))));
        policy = AgentSafetyPolicy(address(proxy));
    }

    function testImplementationCannotInitializeAndProxyIsOneTime() public {
        vm.expectRevert();
        implementation.initialize(ATTACKER);
        vm.expectRevert();
        policy.initialize(ATTACKER);
        require(policy.owner() == address(this));
        AgentSafetyPolicyV2 next = new AgentSafetyPolicyV2();
        vm.expectRevert();
        implementation.upgradeToAndCall(address(next), "");
    }

    function testResearchChecksNeverAuthorizeCapital() public {
        (uint16 maxSlip, uint16 maxAlloc, uint128 minLiquidity, bool paused, bool executionAllowed) =
            policy.researchPolicy();
        require(maxSlip == 100 && maxAlloc == 1000 && minLiquidity == 75000 && !paused && !executionAllowed);
        (bool ok, bool execute) = policy.assessResearch(50, 250, 100000);
        require(ok && !execute);
        (ok, execute) = policy.assessResearch(101, 250, 100000);
        require(!ok && !execute);
        (ok, execute) = policy.assessResearch(50, 1001, 100000);
        require(!ok && !execute);
        (ok, execute) = policy.assessResearch(50, 250, 74999);
        require(!ok && !execute);
        policy.setResearchPaused(true);
        (ok, execute) = policy.assessResearch(50, 250, 100000);
        require(!ok && !execute);
        policy.setResearchPaused(false);
        policy.setResearchLimits(125, 500, 90000);
        (maxSlip, maxAlloc, minLiquidity,, executionAllowed) = policy.researchPolicy();
        require(maxSlip == 125 && maxAlloc == 500 && minLiquidity == 90000 && !executionAllowed);
    }

    function testOnlyOwnerAndInvalidLimits() public {
        AgentSafetyPolicyV2 next = new AgentSafetyPolicyV2();
        vm.expectRevert();
        vm.prank(ATTACKER);
        policy.setResearchPaused(true);
        vm.expectRevert();
        vm.prank(ATTACKER);
        policy.scheduleUpgrade(address(next));
        vm.expectRevert(AgentSafetyPolicy.InvalidSafetyLimits.selector);
        policy.setResearchLimits(0, 500, 75000);
        vm.expectRevert(AgentSafetyPolicy.InvalidSafetyLimits.selector);
        policy.setResearchLimits(301, 500, 75000);
        vm.expectRevert(AgentSafetyPolicy.InvalidSafetyLimits.selector);
        policy.setResearchLimits(100, 2501, 75000);
        vm.expectRevert(AgentSafetyPolicy.InvalidSafetyLimits.selector);
        policy.setResearchLimits(100, 500, 100);
        vm.expectRevert(AgentSafetyPolicy.OwnershipRenunciationDisabled.selector);
        policy.renounceOwnership();
    }

    function testEmergencyGuardianCanOnlyPauseAndOwnerCanRecover() public {
        address guardian = address(0xA11CE);
        vm.expectRevert();
        vm.prank(ATTACKER);
        policy.setEmergencyGuardian(guardian);
        policy.setEmergencyGuardian(guardian);
        require(policy.emergencyGuardian() == guardian);
        vm.expectRevert(AgentSafetyPolicy.UnauthorizedGuardian.selector);
        vm.prank(ATTACKER);
        policy.emergencyPause();
        vm.prank(guardian);
        policy.emergencyPause();
        (bool accepted, bool execute) = policy.assessResearch(20, 50, 100000);
        require(!accepted && !execute);
        vm.expectRevert();
        vm.prank(guardian);
        policy.setResearchPaused(false);
        vm.expectRevert();
        vm.prank(guardian);
        policy.setResearchLimits(100, 500, 75000);
        AgentSafetyPolicyV2 next = new AgentSafetyPolicyV2();
        vm.expectRevert();
        vm.prank(guardian);
        policy.scheduleUpgrade(address(next));
        policy.setResearchPaused(false);
        (accepted, execute) = policy.assessResearch(20, 50, 100000);
        require(accepted && !execute);
        policy.setEmergencyGuardian(address(0));
        vm.expectRevert(AgentSafetyPolicy.UnauthorizedGuardian.selector);
        vm.prank(guardian);
        policy.emergencyPause();
    }

    function testOwnershipTransferRevokesEmergencyGuardian() public {
        address guardian = address(0xA11CE);
        policy.setEmergencyGuardian(guardian);
        policy.transferOwnership(FUTURE_OWNER);
        vm.prank(FUTURE_OWNER);
        policy.acceptOwnership();
        require(policy.emergencyGuardian() == address(0));
        vm.expectRevert(AgentSafetyPolicy.UnauthorizedGuardian.selector);
        vm.prank(guardian);
        policy.emergencyPause();
        vm.prank(FUTURE_OWNER);
        policy.setEmergencyGuardian(guardian);
        vm.prank(guardian);
        policy.emergencyPause();
        (,,, bool paused, bool allowed) = policy.researchPolicy();
        require(paused && !allowed);
    }

    function testDelayedAuthorizedUpgradePreservesStorage() public {
        policy.setResearchLimits(120, 850, 130000);
        policy.setEmergencyGuardian(address(0xA11CE));
        AgentSafetyPolicyV2 next = new AgentSafetyPolicyV2();
        vm.expectRevert(AgentSafetyPolicy.UpgradeNotScheduled.selector);
        policy.upgradeToAndCall(address(next), "");
        policy.scheduleUpgrade(address(next));
        (, bytes32 codeHash, uint64 readyAt, uint64 expiresAt) = policy.pendingUpgrade();
        require(codeHash == address(next).codehash && readyAt + 7 days == expiresAt);
        vm.expectRevert(AgentSafetyPolicy.UpgradeNotReady.selector);
        policy.upgradeToAndCall(address(next), "");
        vm.warp(readyAt);
        policy.upgradeToAndCall(address(next), "");
        require(AgentSafetyPolicyV2(address(policy)).version() == 2);
        (uint16 maxSlip, uint16 maxAlloc, uint128 minLiq,, bool execute) = policy.researchPolicy();
        require(maxSlip == 120 && maxAlloc == 850 && minLiq == 130000 && !execute);
        require(policy.emergencyGuardian() == address(0xA11CE));
        (address queued,,,) = policy.pendingUpgrade();
        require(queued == address(0));
        vm.expectRevert();
        policy.initialize(ATTACKER);
    }

    function testCancelExpiryAndWrongImplementation() public {
        AgentSafetyPolicyV2 next = new AgentSafetyPolicyV2();
        AgentSafetyPolicyV2 other = new AgentSafetyPolicyV2();
        policy.scheduleUpgrade(address(next));
        vm.warp(block.timestamp + 2 days);
        vm.expectRevert(AgentSafetyPolicy.UpgradeNotScheduled.selector);
        policy.upgradeToAndCall(address(other), "");
        policy.cancelUpgrade();
        vm.expectRevert(AgentSafetyPolicy.UpgradeNotScheduled.selector);
        policy.upgradeToAndCall(address(next), "");
        policy.scheduleUpgrade(address(next));
        vm.warp(block.timestamp + 2 days + 7 days);
        vm.expectRevert(AgentSafetyPolicy.UpgradeWindowExpired.selector);
        policy.upgradeToAndCall(address(next), "");
    }

    function testRejectsNonUupsImplementationAndRetainsSchedule() public {
        InvalidUupsTarget wrong = new InvalidUupsTarget();
        policy.scheduleUpgrade(address(wrong));
        vm.warp(block.timestamp + 2 days);
        vm.expectRevert();
        policy.upgradeToAndCall(address(wrong), "");
        (address proposed,,,) = policy.pendingUpgrade();
        require(proposed == address(wrong));
        (,, uint128 liquidity,, bool executionAllowed) = policy.researchPolicy();
        require(liquidity == 75000 && !executionAllowed);
    }

    function testOwnerTransferInvalidatesPendingUpgrade() public {
        AgentSafetyPolicyV2 next = new AgentSafetyPolicyV2();
        policy.scheduleUpgrade(address(next));
        policy.transferOwnership(FUTURE_OWNER);
        vm.prank(FUTURE_OWNER);
        policy.acceptOwnership();
        (address scheduled,,,) = policy.pendingUpgrade();
        require(scheduled == address(0));
        vm.warp(block.timestamp + 2 days);
        vm.expectRevert();
        vm.prank(FUTURE_OWNER);
        policy.upgradeToAndCall(address(next), "");
    }

    function testTwoStepOwnerControlsUpgrades() public {
        policy.transferOwnership(FUTURE_OWNER);
        require(policy.owner() == address(this));
        vm.expectRevert();
        vm.prank(ATTACKER);
        policy.acceptOwnership();
        vm.prank(FUTURE_OWNER);
        policy.acceptOwnership();
        require(policy.owner() == FUTURE_OWNER);
        AgentSafetyPolicyV2 next = new AgentSafetyPolicyV2();
        vm.expectRevert();
        policy.scheduleUpgrade(address(next));
        vm.prank(FUTURE_OWNER);
        policy.scheduleUpgrade(address(next));
        vm.warp(block.timestamp + 2 days);
        vm.prank(FUTURE_OWNER);
        policy.upgradeToAndCall(address(next), "");
        require(AgentSafetyPolicyV2(address(policy)).version() == 2);
    }
}
