// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";

/// @notice Non-custodial, upgradeable PUBLIC research safety limits.
/// @dev Does NOT authorize trades, hold tokens, deploy user wallets, approve spend,
/// or get called by the existing immutable AgentVault. Never imply it guards
/// capital until a separately audited integration proves it on-chain.
contract AgentSafetyPolicy is Initializable, Ownable2StepUpgradeable, UUPSUpgradeable {
    uint256 public constant UPGRADE_DELAY = 2 days;
    uint256 public constant UPGRADE_EXPIRY = 7 days;

    /// @custom:storage-location erc7201:prigenfi.storage.AgentSafetyPolicy
    struct SafetyStorage {
        uint16 maxSlippageBps;
        uint16 maxResearchAllocationBps;
        uint128 minimumPublicLiquidityUsd;
        bool paused;
        address queuedImplementation;
        bytes32 queuedCodeHash;
        uint64 upgradeReadyAt;
        uint64 upgradeExpiresAt;
    }
    // keccak256(abi.encode(uint256(keccak256("prigenfi.storage.AgentSafetyPolicy")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant SAFETY_SLOT = 0xd065a32101d1f7c6ba8cfc7870d1895aa013204ece914e977365b5d06971a500;

    error InvalidSafetyLimits();
    error UpgradeNotScheduled();
    error UpgradeNotReady();
    error UpgradeWindowExpired();
    error OwnershipRenunciationDisabled();

    event ResearchLimitsChanged(uint16 maxSlippageBps, uint16 maxAllocationBps, uint128 minLiquidityUsd);
    event ResearchPaused(bool isPaused);
    event UpgradeScheduled(address indexed implementation, bytes32 codeHash, uint64 readyAt, uint64 expiresAt);
    event UpgradeCancelled(address indexed implementation);

    function _safety() private pure returns (SafetyStorage storage $) {
        bytes32 slot = SAFETY_SLOT;
        assembly { $.slot := slot }
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address initialOwner) external initializer {
        __Ownable_init(initialOwner);
        __Ownable2Step_init();
        SafetyStorage storage $ = _safety();
        $.maxSlippageBps = 100;
        $.maxResearchAllocationBps = 1_000;
        $.minimumPublicLiquidityUsd = 75_000;
        $.paused = false;
        emit ResearchLimitsChanged(100, 1_000, 75_000);
    }

    function researchPolicy()
        external
        view
        returns (
            uint16 maxSlippageBps,
            uint16 maxAllocationBps,
            uint128 minLiquidityUsd,
            bool isPaused,
            bool executionAllowed
        )
    {
        SafetyStorage storage $ = _safety();
        return ($.maxSlippageBps, $.maxResearchAllocationBps, $.minimumPublicLiquidityUsd, $.paused, false);
    }

    /// @dev Conservative, non-authoritative screen; public pool metrics can be
    /// manipulated and independent contract/code/venue audits remain mandatory.
    function assessResearch(uint16 slippageBps, uint16 allocationBps, uint128 observedPublicLiquidityUsd)
        external
        view
        returns (bool withinDeclaredResearchLimits, bool executionAllowed)
    {
        SafetyStorage storage $ = _safety();
        bool withinLimits = !$.paused && slippageBps <= $.maxSlippageBps && allocationBps <= $.maxResearchAllocationBps
            && observedPublicLiquidityUsd >= $.minimumPublicLiquidityUsd;
        return (withinLimits, false);
    }

    /// @dev Owner should be an independently secured multisig before any public deployment.
    function setResearchLimits(uint16 slippageBps, uint16 allocationBps, uint128 minLiquidityUsd) external onlyOwner {
        if (
            slippageBps == 0 || slippageBps > 300 || allocationBps == 0 || allocationBps > 2_500
                || minLiquidityUsd < 25_000
        ) revert InvalidSafetyLimits();
        SafetyStorage storage $ = _safety();
        $.maxSlippageBps = slippageBps;
        $.maxResearchAllocationBps = allocationBps;
        $.minimumPublicLiquidityUsd = minLiquidityUsd;
        emit ResearchLimitsChanged(slippageBps, allocationBps, minLiquidityUsd);
    }

    function setResearchPaused(bool value) external onlyOwner {
        _safety().paused = value;
        emit ResearchPaused(value);
    }

    function scheduleUpgrade(address implementation) external onlyOwner {
        if (
            implementation.code.length == 0 || implementation == address(this)
                || block.timestamp > type(uint64).max - UPGRADE_DELAY - UPGRADE_EXPIRY
        ) {
            revert UpgradeNotScheduled();
        }
        SafetyStorage storage $ = _safety();
        $.queuedImplementation = implementation;
        $.queuedCodeHash = implementation.codehash;
        $.upgradeReadyAt = uint64(block.timestamp + UPGRADE_DELAY);
        $.upgradeExpiresAt = uint64(block.timestamp + UPGRADE_DELAY + UPGRADE_EXPIRY);
        emit UpgradeScheduled(implementation, $.queuedCodeHash, $.upgradeReadyAt, $.upgradeExpiresAt);
    }

    function cancelUpgrade() external onlyOwner {
        SafetyStorage storage $ = _safety();
        address previous = $.queuedImplementation;
        delete $.queuedImplementation;
        delete $.queuedCodeHash;
        delete $.upgradeReadyAt;
        delete $.upgradeExpiresAt;
        emit UpgradeCancelled(previous);
    }

    function pendingUpgrade()
        external
        view
        returns (address implementation, bytes32 codeHash, uint64 readyAt, uint64 expiresAt)
    {
        SafetyStorage storage $ = _safety();
        return ($.queuedImplementation, $.queuedCodeHash, $.upgradeReadyAt, $.upgradeExpiresAt);
    }

    /// @dev UUPS/ERC-1822 additionally validates the new implementation's proxiableUUID.
    function _authorizeUpgrade(address nextImplementation) internal override onlyOwner {
        SafetyStorage storage $ = _safety();
        if (
            $.queuedImplementation == address(0) || nextImplementation != $.queuedImplementation
                || nextImplementation.codehash != $.queuedCodeHash
        ) revert UpgradeNotScheduled();
        if (block.timestamp < $.upgradeReadyAt) revert UpgradeNotReady();
        if (block.timestamp >= $.upgradeExpiresAt) revert UpgradeWindowExpired();
        delete $.queuedImplementation;
        delete $.queuedCodeHash;
        delete $.upgradeReadyAt;
        delete $.upgradeExpiresAt;
    }

    /// @dev Pending implementation approvals must never silently survive a
    /// change to a new governance owner/multisig.
    function _transferOwnership(address newOwner) internal override {
        super._transferOwnership(newOwner);
        SafetyStorage storage $ = _safety();
        address previous = $.queuedImplementation;
        if (previous != address(0)) {
            delete $.queuedImplementation;
            delete $.queuedCodeHash;
            delete $.upgradeReadyAt;
            delete $.upgradeExpiresAt;
            emit UpgradeCancelled(previous);
        }
    }

    function renounceOwnership() public pure override {
        revert OwnershipRenunciationDisabled();
    }
}
