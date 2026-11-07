// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @notice Testnet-only isolated capital. No arbitrary calls, approvals, native or confidential execution.
/// @dev Not an ERC-4337 account. The immutable owner remains the withdrawal and policy authority.
contract AgentVault is ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Permission {
        address recipient;
        uint128 perOperation;
        uint128 dailyLimit;
        uint128 spent;
        uint64 day;
        uint64 expiresAt;
        bool active;
    }

    address public immutable owner;
    bool public paused;
    mapping(address agent => mapping(address token => Permission)) public permissions;
    mapping(address agent => uint256) public nonces;

    error Unauthorized();
    error InvalidPermission();
    error PolicyDenied();
    error UnsupportedChain();
    event PermissionSet(
        address indexed agent,
        address indexed token,
        address recipient,
        uint128 perOperation,
        uint128 dailyLimit,
        uint64 expiresAt
    );
    event Revoked(address indexed agent, address indexed token);
    event PauseChanged(bool paused);
    event Executed(
        address indexed agent, address indexed token, address indexed recipient, uint256 amount, uint256 nonce
    );
    event Withdrawn(address indexed token, address indexed recipient, uint256 amount);

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    constructor(address owner_) {
        if (block.chainid != 31337 && block.chainid != 11155111) revert UnsupportedChain();
        if (owner_ == address(0)) revert InvalidPermission();
        owner = owner_;
    }

    /// @dev Reauthorization is an explicit owner action and resets that token's spending window.
    function setPermission(
        address agent,
        address token,
        address recipient,
        uint128 perOperation,
        uint128 dailyLimit,
        uint64 expiresAt
    ) external onlyOwner {
        if (
            agent == address(0) || agent == owner || token.code.length == 0 || recipient == address(0)
                || recipient == address(this) || perOperation == 0 || dailyLimit < perOperation
                || expiresAt <= block.timestamp || expiresAt > block.timestamp + 30 days
        ) revert InvalidPermission();
        permissions[agent][token] =
            Permission(recipient, perOperation, dailyLimit, 0, uint64(block.timestamp / 1 days), expiresAt, true);
        emit PermissionSet(agent, token, recipient, perOperation, dailyLimit, expiresAt);
    }

    function revoke(address agent, address token) external onlyOwner {
        permissions[agent][token].active = false;
        emit Revoked(agent, token);
    }

    function setPaused(bool value) external onlyOwner {
        paused = value;
        emit PauseChanged(value);
    }

    /// @notice Only the caller's own scoped ERC-20 transfer. Token is the only target; transfer is the only selector.
    /// @dev Nonces survive revocation and reauthorization. A reverted transfer rolls back accounting.
    function executeTransfer(address token, address recipient, uint128 amount, uint256 nonce) external nonReentrant {
        if (block.chainid != 31337 && block.chainid != 11155111) revert UnsupportedChain();
        Permission storage p = permissions[msg.sender][token];
        if (
            paused || !p.active || block.timestamp >= p.expiresAt || recipient != p.recipient || amount == 0
                || amount > p.perOperation || nonce != nonces[msg.sender]
        ) revert PolicyDenied();
        uint64 day = uint64(block.timestamp / 1 days);
        if (p.day != day) {
            p.day = day;
            p.spent = 0;
        }
        if (uint256(p.spent) + amount > p.dailyLimit) revert PolicyDenied();
        p.spent += amount;
        nonces[msg.sender] = nonce + 1;
        // Verify actual vault debit, rejecting fee-on-top and rebasing behavior that exceeds the cap.
        uint256 beforeBalance = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransfer(recipient, amount);
        uint256 afterBalance = IERC20(token).balanceOf(address(this));
        if (afterBalance > beforeBalance || beforeBalance - afterBalance != amount) revert PolicyDenied();
        emit Executed(msg.sender, token, recipient, amount, nonce);
    }

    /// @notice Owner can recover ERC-20 capital even while paused.
    function withdraw(address token, address recipient, uint256 amount) external onlyOwner nonReentrant {
        if (recipient == address(0)) revert InvalidPermission();
        IERC20(token).safeTransfer(recipient, amount);
        emit Withdrawn(token, recipient, amount);
    }
}
