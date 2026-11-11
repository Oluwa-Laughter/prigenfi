// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @dev Test-only verifier for wallet-authentication integration on Anvil.
/// Not part of PrigenFi production infrastructure; never deploy for users.
contract LocalAuth1271 {
    address private immutable allowedSigner;
    bytes4 private constant VALID_SIGNATURE = 0x1626ba7e;

    constructor(address signer_) {
        require(signer_ != address(0), "INVALID_SIGNER");
        allowedSigner = signer_;
    }

    function isValidSignature(bytes32 digest, bytes calldata signature) external view returns (bytes4) {
        (address recovered, ECDSA.RecoverError error,) = ECDSA.tryRecover(digest, signature);
        return error == ECDSA.RecoverError.NoError && recovered == allowedSigner ? VALID_SIGNATURE : bytes4(0xffffffff);
    }
}
