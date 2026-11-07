// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Public faucet token for LOCAL tests. Has no monetary value.
contract MockUSD is ERC20 {
    constructor() ERC20("PrigenFi Local Mock USD", "mockUSD") {
        require(block.chainid == 31337, "LOCAL_ONLY");
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        require(amount <= 1_000_000 * 10 ** 6, "FAUCET_CAP");
        _mint(to, amount);
    }
}
