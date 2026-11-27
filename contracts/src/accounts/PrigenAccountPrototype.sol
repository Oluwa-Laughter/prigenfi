// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {AccountERC7579} from "@openzeppelin/contracts/account/extensions/draft-AccountERC7579.sol";
import {AccountERC7579Hooked} from "@openzeppelin/contracts/account/extensions/draft-AccountERC7579Hooked.sol";
import {ERC7579Utils, Mode, CallType} from "@openzeppelin/contracts/account/utils/draft-ERC7579Utils.sol";
import {SignerECDSA} from "@openzeppelin/contracts/utils/cryptography/signers/SignerECDSA.sol";

/**
 * @title PrigenFi smart-account PROTOTYPE (Anvil-only, UNAUDITED)
 * @notice Thin composition of OpenZeppelin 5.6.1 `AccountERC7579Hooked` and
 * `SignerECDSA`. The only PrigenFi deltas are: (1) a single ECDSA owner is the
 * native UserOperation signer, and (2) delegatecall execution is refused, so
 * no validator, executor or owner batch can run foreign code in account
 * storage. Everything else is unmodified OpenZeppelin behaviour.
 *
 * NOT a production account: no recovery, no owner rotation, no deployment
 * factory, no independent audit of this composition. Never deploy to a public
 * chain or hold value with it. See docs/SMART_ACCOUNT_ARCHITECTURE.md.
 */
contract PrigenAccountPrototype is AccountERC7579Hooked, SignerECDSA {
    error PrigenDelegatecallForbidden();

    constructor(address owner) SignerECDSA(owner) {
        require(owner != address(0), "OWNER_REQUIRED");
    }

    function accountId() public view virtual override returns (string memory) {
        // Distinct id so assessors never mistake this for stock OpenZeppelin code.
        return "prigenfi.account-prototype.0.1.0";
    }

    /// @dev OpenZeppelin modes minus delegatecall.
    function supportsExecutionMode(bytes32 encodedMode) public view virtual override returns (bool) {
        if (_callType(Mode.wrap(encodedMode)) == ERC7579Utils.CALLTYPE_DELEGATECALL) return false;
        return super.supportsExecutionMode(encodedMode);
    }

    function _execute(Mode mode, bytes calldata executionCalldata) internal virtual override returns (bytes[] memory) {
        if (_callType(mode) == ERC7579Utils.CALLTYPE_DELEGATECALL) revert PrigenDelegatecallForbidden();
        return super._execute(mode, executionCalldata);
    }

    /// @dev ERC-7579 mode layout: byte 0 is the call type.
    function _callType(Mode mode) private pure returns (CallType) {
        return CallType.wrap(bytes1(Mode.unwrap(mode)));
    }

    /// @dev Owner ECDSA signature is the native fallback when no validator module is selected.
    function _rawSignatureValidation(bytes32 hash, bytes calldata signature)
        internal
        view
        virtual
        override(AccountERC7579, SignerECDSA)
        returns (bool)
    {
        return SignerECDSA._rawSignatureValidation(hash, signature);
    }
}
