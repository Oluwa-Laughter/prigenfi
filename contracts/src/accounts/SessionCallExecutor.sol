// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {
    IERC7579Module,
    IERC7579ModuleConfig,
    IERC7579Execution,
    MODULE_TYPE_EXECUTOR
} from "@openzeppelin/contracts/interfaces/draft-IERC7579.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Session call executor PROTOTYPE (Anvil-only, UNAUDITED)
 * @notice ERC-7579 executor module that lets an account owner grant an agent a
 * narrowly scoped, expiring, call-count-bounded, revocable permission to make
 * exactly one kind of call: `target.selector(...)` with zero native value, as a
 * single (never batch, never delegatecall) execution from the account.
 *
 * Configuration functions are keyed by `msg.sender`, so only the account
 * itself — i.e. an owner-authorized account execution — can grant or revoke its
 * sessions. Uninstalling the module bumps the account epoch, so reinstalling it
 * never resurrects old sessions.
 *
 * Deliberate limits: this module does NOT bound token amounts. Confidential
 * (ERC-7984/FHE) amounts are encrypted, so a plaintext cap would be either
 * meaningless or a privacy leak; an FHE-aware budget is Milestone 3 work.
 * Token-movement and authority-escalating selectors are therefore refused
 * outright. No confidential venue is registered; this grants no trading.
 */
contract SessionCallExecutor is IERC7579Module, ReentrancyGuard {
    uint48 public constant MAX_SESSION_DURATION = 7 days;
    uint32 public constant MAX_SESSION_CALLS = 100;

    struct Session {
        address agent;
        address target;
        bytes4 selector;
        uint48 validAfter;
        uint48 validUntil;
        uint32 maxCalls;
        uint32 callsUsed;
        uint64 epoch;
        bool revoked;
    }

    mapping(address account => uint64) public epochOf;
    mapping(address account => uint256) private _nonceOf;
    mapping(address account => mapping(bytes32 sessionId => Session)) private _sessions;

    event SessionGranted(
        address indexed account,
        bytes32 indexed sessionId,
        address indexed agent,
        address target,
        bytes4 selector,
        uint48 validAfter,
        uint48 validUntil,
        uint32 maxCalls
    );
    event SessionRevoked(address indexed account, bytes32 indexed sessionId);
    event AllSessionsRevoked(address indexed account, uint64 newEpoch);
    event SessionCallExecuted(address indexed account, bytes32 indexed sessionId, uint32 callNumber);

    error ModuleNotInstalled(address account);
    error InvalidAgent();
    error InvalidTarget();
    error ForbiddenSelector(bytes4 selector);
    error InvalidWindow();
    error InvalidCallLimit();
    error UnknownSession();
    error SessionNotActive();
    error NotSessionAgent();
    error SelectorMismatch();
    error CallLimitReached();

    // ---------------------------------------------------------------- module

    function onInstall(bytes calldata) external {}

    /// @dev Invalidate every session of the uninstalling account.
    function onUninstall(bytes calldata) external {
        _revokeAll(msg.sender);
    }

    function isModuleType(uint256 moduleTypeId) external pure returns (bool) {
        return moduleTypeId == MODULE_TYPE_EXECUTOR;
    }

    // ---------------------------------------------------------- owner config

    /// @notice Grant a session for the calling account. Must be called by the account itself.
    function grantSession(
        address agent,
        address target,
        bytes4 selector,
        uint48 validAfter,
        uint48 validUntil,
        uint32 maxCalls
    ) external returns (bytes32 sessionId) {
        address account = msg.sender;
        _requireInstalled(account);
        if (agent == address(0) || agent == account || agent == address(this)) revert InvalidAgent();
        if (target == account || target == address(this) || target == agent || target.code.length == 0) {
            revert InvalidTarget();
        }
        if (isForbiddenSelector(selector)) revert ForbiddenSelector(selector);
        if (validUntil <= block.timestamp || validUntil <= validAfter || validUntil - validAfter > MAX_SESSION_DURATION)
        {
            revert InvalidWindow();
        }
        if (validUntil > block.timestamp + MAX_SESSION_DURATION) revert InvalidWindow();
        if (maxCalls == 0 || maxCalls > MAX_SESSION_CALLS) revert InvalidCallLimit();

        uint64 epoch = epochOf[account];
        sessionId = keccak256(abi.encode(block.chainid, address(this), account, epoch, ++_nonceOf[account]));
        _sessions[account][sessionId] = Session({
            agent: agent,
            target: target,
            selector: selector,
            validAfter: validAfter,
            validUntil: validUntil,
            maxCalls: maxCalls,
            callsUsed: 0,
            epoch: epoch,
            revoked: false
        });
        emit SessionGranted(account, sessionId, agent, target, selector, validAfter, validUntil, maxCalls);
    }

    function revokeSession(bytes32 sessionId) external {
        Session storage session = _sessions[msg.sender][sessionId];
        if (session.agent == address(0)) revert UnknownSession();
        session.revoked = true;
        emit SessionRevoked(msg.sender, sessionId);
    }

    function revokeAllSessions() external {
        _revokeAll(msg.sender);
    }

    // ------------------------------------------------------------- agent use

    /**
     * @notice Execute one in-scope call from `account`. The account re-checks that this
     * module is an installed executor; the module checks agent, window, epoch,
     * revocation, selector and remaining calls. Value is always zero and the mode
     * is always single-call, revert-on-failure.
     */
    function executeSession(address account, bytes32 sessionId, bytes calldata callData)
        external
        nonReentrant
        returns (bytes memory result)
    {
        Session storage session = _sessions[account][sessionId];
        if (session.agent == address(0)) revert UnknownSession();
        if (msg.sender != session.agent) revert NotSessionAgent();
        if (
            session.revoked || session.epoch != epochOf[account] || block.timestamp < session.validAfter
                || block.timestamp >= session.validUntil
        ) revert SessionNotActive();
        if (callData.length < 4 || bytes4(callData[0:4]) != session.selector) revert SelectorMismatch();
        if (session.callsUsed >= session.maxCalls) revert CallLimitReached();
        uint32 callNumber = ++session.callsUsed;

        // mode 0x00..: CALLTYPE_SINGLE + EXECTYPE_DEFAULT; payload = target | value(0) | calldata
        bytes[] memory results = IERC7579Execution(account)
            .executeFromExecutor(bytes32(0), abi.encodePacked(session.target, uint256(0), callData));
        emit SessionCallExecuted(account, sessionId, callNumber);
        return results.length > 0 ? results[0] : bytes("");
    }

    // ------------------------------------------------------------------ views

    function getSession(address account, bytes32 sessionId) external view returns (Session memory) {
        return _sessions[account][sessionId];
    }

    function isSessionActive(address account, bytes32 sessionId) external view returns (bool) {
        Session storage session = _sessions[account][sessionId];
        return session.agent != address(0) && !session.revoked && session.epoch == epochOf[account]
            && block.timestamp >= session.validAfter && block.timestamp < session.validUntil
            && session.callsUsed < session.maxCalls;
    }

    /**
     * @notice Selectors a session may never target: token movement/approval
     * (ERC-20/721/1155/2612/7984) and account/module/upgrade authority.
     */
    function isForbiddenSelector(bytes4 selector) public pure returns (bool) {
        return selector == bytes4(0) // empty / fallback
            || selector == 0xa9059cbb // transfer(address,uint256)
            || selector == 0x23b872dd // transferFrom(address,address,uint256)
            || selector == 0x095ea7b3 // approve(address,uint256)
            || selector == 0x39509351 // increaseAllowance(address,uint256)
            || selector == 0xd505accf // permit(...) ERC-2612
            || selector == 0xa22cb465 // setApprovalForAll(address,bool)
            || selector == 0x42842e0e // safeTransferFrom(address,address,uint256)
            || selector == 0xb88d4fde // safeTransferFrom(address,address,uint256,bytes)
            || selector == 0xf242432a // safeTransferFrom ERC-1155
            || selector == 0x2eb2c2d6 // safeBatchTransferFrom ERC-1155
            || 
            // ERC-7984 confidential tokens (signatures from @zama-fhe/sdk 3.7.1 ABI)
            selector == 0xd4febb96 // setOperator(address,uint48)
            || selector == 0x5bebed7e // confidentialTransfer(address,bytes32)
            || selector == 0x2fb74e62 // confidentialTransfer(address,bytes32,bytes)
            || selector == 0x537d3c50 // confidentialTransferAndCall(address,bytes32,bytes)
            || selector == 0xde642119 // confidentialTransferAndCall(address,bytes32,bytes,bytes)
            || selector == 0xeb3155b5 // confidentialTransferFrom(address,address,bytes32)
            || selector == 0xe064b9bb // confidentialTransferFrom(address,address,bytes32,bytes)
            || selector == 0xc7b8a75e // confidentialTransferFromAndCall(address,address,bytes32,bytes)
            || selector == 0x34c45743 // confidentialTransferFromAndCall(address,address,bytes32,bytes,bytes)
            || selector == 0xbf376c7a // wrap(address,uint256)
            || selector == 0xe8c15fd4 // unwrap(address,address,bytes32)
            || selector == 0x5bf4ef06 // unwrap(address,address,bytes32,bytes)
            || 
            // account / module / upgrade authority
            selector == 0x9517e29f // installModule
            || selector == 0xa71763a8 // uninstallModule
            || selector == 0xe9ae5c53 // execute
            || selector == 0xd691c964 // executeFromExecutor
            || selector == 0x4f1ef286 // upgradeToAndCall
            || selector == 0x3659cfe6; // upgradeTo
    }

    // -------------------------------------------------------------- internal

    function _requireInstalled(address account) private view {
        if (account.code.length == 0) revert ModuleNotInstalled(account);
        try IERC7579ModuleConfig(account).isModuleInstalled(MODULE_TYPE_EXECUTOR, address(this), "") returns (
            bool installed
        ) {
            if (!installed) revert ModuleNotInstalled(account);
        } catch {
            revert ModuleNotInstalled(account);
        }
    }

    function _revokeAll(address account) private {
        uint64 next = ++epochOf[account];
        emit AllSessionsRevoked(account, next);
    }
}
