// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {AccountERC7579} from "@openzeppelin/contracts/account/extensions/draft-AccountERC7579.sol";
import {
    IERC7579Validator,
    MODULE_TYPE_VALIDATOR,
    VALIDATION_FAILED
} from "@openzeppelin/contracts/interfaces/draft-IERC7579.sol";
import {PackedUserOperation} from "@openzeppelin/contracts/interfaces/draft-IERC4337.sol";

/*
 * TEST-ONLY ERC-7579 compatibility fixtures for local Anvil (chain 31337).
 *
 * These contracts exist solely so PrigenFi's read-only smart-account
 * compatibility assessor can be exercised against real deployed bytecode.
 * They are NOT PrigenFi accounts, hold no funds, validate no signatures and
 * must never be deployed to a public chain or offered to users.
 */

/// @dev Validator module that can never authorize anything: every UserOperation
/// and ERC-1271 request fails. Lets the fixture account report a genuinely
/// installed validator without creating any spending or signing authority.
contract LocalDenyAllValidator is IERC7579Validator {
    function onInstall(bytes calldata) external pure {}

    function onUninstall(bytes calldata) external pure {}

    function isModuleType(uint256 moduleTypeId) external pure returns (bool) {
        return moduleTypeId == MODULE_TYPE_VALIDATOR;
    }

    function validateUserOp(PackedUserOperation calldata, bytes32) external pure returns (uint256) {
        return VALIDATION_FAILED;
    }

    function isValidSignatureWithSender(address, bytes32, bytes calldata) external pure returns (bytes4) {
        return bytes4(0xffffffff);
    }
}

/// @dev Concrete OpenZeppelin 5.6.1 AccountERC7579 with one deny-all validator
/// installed at construction. Native (raw) signature validation is disabled by
/// the OpenZeppelin base, so this account cannot sign or execute anything.
contract LocalOzErc7579Account is AccountERC7579 {
    constructor(address denyAllValidator) {
        _installModule(MODULE_TYPE_VALIDATOR, denyAllValidator, "");
    }
}

/// @dev Adversarial account that claims every capability, reports every module
/// as installed and accepts any signature. The assessor must classify its self
/// report as unreliable rather than compatible.
contract LocalOverclaimingAccount {
    function accountId() external pure returns (string memory) {
        return "overclaim.anything.1.0.0";
    }

    function supportsExecutionMode(bytes32) external pure returns (bool) {
        return true;
    }

    function supportsModule(uint256) external pure returns (bool) {
        return true;
    }

    function isModuleInstalled(uint256, address, bytes calldata) external pure returns (bool) {
        return true;
    }

    function isValidSignature(bytes32, bytes calldata) external pure returns (bytes4) {
        return 0x1626ba7e;
    }
}

/// @dev Malformed account: returns a non-boolean ABI word from supportsModule
/// and reverts on supportsExecutionMode, violating ERC-7579's MUST-return rules.
contract LocalMalformedAccount {
    function accountId() external pure returns (string memory) {
        return "malformed.account.1.0.0";
    }

    function supportsExecutionMode(bytes32) external pure returns (bool) {
        revert("UNSUPPORTED");
    }

    function supportsModule(uint256) external pure returns (uint256) {
        return 2;
    }

    function isModuleInstalled(uint256, address, bytes calldata) external pure returns (bool) {
        return false;
    }

    function isValidSignature(bytes32, bytes calldata) external pure returns (bytes4) {
        return bytes4(0xffffffff);
    }
}

/// @dev Ordinary contract with code but no ERC-7579 interface.
contract LocalPlainContract {
    uint256 public value = 1;
}
