// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {PrigenAccountPrototype} from "../src/accounts/PrigenAccountPrototype.sol";
import {SessionCallExecutor} from "../src/accounts/SessionCallExecutor.sol";
import {Account} from "@openzeppelin/contracts/account/Account.sol";
import {ERC7579Utils} from "@openzeppelin/contracts/account/utils/draft-ERC7579Utils.sol";
import {
    IERC7579ModuleConfig,
    MODULE_TYPE_EXECUTOR,
    MODULE_TYPE_HOOK,
    MODULE_TYPE_VALIDATOR
} from "@openzeppelin/contracts/interfaces/draft-IERC7579.sol";
import {PackedUserOperation} from "@openzeppelin/contracts/interfaces/draft-IERC4337.sol";

interface VmSession {
    function prank(address) external;
    function warp(uint256) external;
    function expectRevert(bytes calldata) external;
    function expectRevert() external;
    function assume(bool) external pure;
    function addr(uint256) external pure returns (address);
    function sign(uint256, bytes32) external pure returns (uint8, bytes32, bytes32);
}

/// @dev Test-only call target that records who called it.
contract LocalSessionTarget {
    address public lastCaller;
    uint256 public pings;

    function ping(uint256 value) external returns (uint256) {
        lastCaller = msg.sender;
        pings += 1;
        return value + 1;
    }

    function other() external {}
}

contract SessionCallExecutorTest {
    VmSession private constant vm = VmSession(address(uint160(uint256(keccak256("hevm cheat code")))));
    // Ephemeral Foundry test key for signature-path tests only; not a real secret.
    uint256 private constant OWNER_TEST_KEY = 0xA11CE;
    address private constant AGENT = address(0xA6E47);
    address private constant OUTSIDER = address(0xBAD0);

    PrigenAccountPrototype private account;
    SessionCallExecutor private executor;
    LocalSessionTarget private target;
    address private owner;
    address private entryPoint;

    function setUp() public {
        vm.warp(1_800_000_000);
        owner = vm.addr(OWNER_TEST_KEY);
        account = new PrigenAccountPrototype(owner);
        executor = new SessionCallExecutor();
        target = new LocalSessionTarget();
        entryPoint = address(account.entryPoint());
    }

    // ------------------------------------------------------------ helpers

    /// @dev Simulates an owner-validated UserOperation: EntryPoint calls account.execute.
    function _ownerExecute(address to, bytes memory data) internal returns (bytes[] memory) {
        vm.prank(entryPoint);
        return _executeSingle(to, data);
    }

    function _executeSingle(address to, bytes memory data) internal returns (bytes[] memory) {
        account.execute(bytes32(0), abi.encodePacked(to, uint256(0), data));
        return new bytes[](0);
    }

    function _install() internal {
        _ownerExecute(
            address(account),
            abi.encodeCall(IERC7579ModuleConfig.installModule, (MODULE_TYPE_EXECUTOR, address(executor), ""))
        );
    }

    function _grant(bytes4 selector, uint48 duration, uint32 maxCalls) internal returns (bytes32 sessionId) {
        uint256 nonceBefore = _countGrants();
        _ownerExecute(
            address(executor),
            abi.encodeCall(
                SessionCallExecutor.grantSession,
                (
                    AGENT,
                    address(target),
                    selector,
                    uint48(block.timestamp),
                    uint48(block.timestamp) + duration,
                    maxCalls
                )
            )
        );
        sessionId = keccak256(
            abi.encode(
                block.chainid, address(executor), address(account), executor.epochOf(address(account)), nonceBefore + 1
            )
        );
        require(executor.isSessionActive(address(account), sessionId), "SESSION_NOT_ACTIVE");
    }

    uint256 private grants;

    function _countGrants() internal returns (uint256 previous) {
        previous = grants;
        grants += 1;
    }

    function _agentPing(bytes32 sessionId, uint256 value) internal returns (bytes memory) {
        vm.prank(AGENT);
        return executor.executeSession(address(account), sessionId, abi.encodeCall(LocalSessionTarget.ping, (value)));
    }

    // -------------------------------------------------------------- account

    function test_accountIdentityAndDelegatecallRefusal() public {
        require(keccak256(bytes(account.accountId())) == keccak256("prigenfi.account-prototype.0.1.0"), "ACCOUNT_ID");
        require(account.supportsModule(MODULE_TYPE_HOOK), "HOOKS_SUPPORTED");
        require(account.supportsExecutionMode(bytes32(0)), "SINGLE_SUPPORTED");
        require(!account.supportsExecutionMode(bytes32(uint256(0xff) << 248)), "DELEGATECALL_UNSUPPORTED");
        require(!account.supportsExecutionMode(bytes32(uint256(0xff01) << 240)), "DELEGATECALL_TRY_UNSUPPORTED");

        vm.prank(entryPoint);
        vm.expectRevert(abi.encodeWithSelector(PrigenAccountPrototype.PrigenDelegatecallForbidden.selector));
        account.execute(bytes32(uint256(0xff) << 248), abi.encodePacked(address(target), bytes("")));
    }

    function test_outsiderAndOwnerEoaCannotExecuteDirectly() public {
        vm.prank(OUTSIDER);
        vm.expectRevert(abi.encodeWithSelector(Account.AccountUnauthorized.selector, OUTSIDER));
        _executeSingle(address(target), abi.encodeCall(LocalSessionTarget.ping, (1)));
        // The owner key authorizes UserOperations; it is not a direct caller.
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(Account.AccountUnauthorized.selector, owner));
        _executeSingle(address(target), abi.encodeCall(LocalSessionTarget.ping, (1)));
    }

    function test_onlyOwnerSignatureValidatesUserOp() public {
        bytes32 userOpHash = keccak256("prigenfi.test.userop");
        PackedUserOperation memory op;
        op.sender = address(account);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(OWNER_TEST_KEY, userOpHash);
        op.signature = abi.encodePacked(r, s, v);
        vm.prank(entryPoint);
        require(account.validateUserOp(op, userOpHash, 0) == 0, "OWNER_SIG_VALID");

        (v, r, s) = vm.sign(0xB0B, userOpHash);
        op.signature = abi.encodePacked(r, s, v);
        vm.prank(entryPoint);
        require(account.validateUserOp(op, userOpHash, 0) == 1, "OTHER_SIG_INVALID");

        vm.prank(OUTSIDER);
        vm.expectRevert(abi.encodeWithSelector(Account.AccountUnauthorized.selector, OUTSIDER));
        account.validateUserOp(op, userOpHash, 0);
    }

    function test_outsiderCannotInstallModule() public {
        vm.prank(OUTSIDER);
        vm.expectRevert(abi.encodeWithSelector(Account.AccountUnauthorized.selector, OUTSIDER));
        account.installModule(MODULE_TYPE_EXECUTOR, address(executor), "");
        require(!account.isModuleInstalled(MODULE_TYPE_EXECUTOR, address(executor), ""), "NOT_INSTALLED");
    }

    function test_executorCannotBeInstalledAsValidator() public {
        vm.prank(entryPoint);
        vm.expectRevert(
            abi.encodeWithSelector(
                ERC7579Utils.ERC7579MismatchedModuleTypeId.selector, MODULE_TYPE_VALIDATOR, address(executor)
            )
        );
        account.execute(
            bytes32(0),
            abi.encodePacked(
                address(account),
                uint256(0),
                abi.encodeCall(IERC7579ModuleConfig.installModule, (MODULE_TYPE_VALIDATOR, address(executor), ""))
            )
        );
    }

    // ------------------------------------------------------------- sessions

    function test_agentExecutesInScopeCallFromAccount() public {
        _install();
        bytes32 sessionId = _grant(LocalSessionTarget.ping.selector, 1 hours, 2);
        bytes memory result = _agentPing(sessionId, 41);
        require(abi.decode(result, (uint256)) == 42, "RESULT");
        require(target.lastCaller() == address(account), "CALLER_IS_ACCOUNT");
        require(executor.getSession(address(account), sessionId).callsUsed == 1, "CALLS_USED");
    }

    function test_grantRequiresInstalledModuleAndAccountCaller() public {
        // Not installed yet: an owner-authorized grant still fails.
        vm.prank(entryPoint);
        vm.expectRevert(abi.encodeWithSelector(SessionCallExecutor.ModuleNotInstalled.selector, address(account)));
        _executeSingle(
            address(executor),
            abi.encodeCall(
                SessionCallExecutor.grantSession,
                (
                    AGENT,
                    address(target),
                    LocalSessionTarget.ping.selector,
                    uint48(block.timestamp),
                    uint48(block.timestamp + 1 hours),
                    1
                )
            )
        );
        _install();
        // An outsider calling directly grants only for itself, which is not an account.
        vm.prank(OUTSIDER);
        vm.expectRevert(abi.encodeWithSelector(SessionCallExecutor.ModuleNotInstalled.selector, OUTSIDER));
        executor.grantSession(
            AGENT,
            address(target),
            LocalSessionTarget.ping.selector,
            uint48(block.timestamp),
            uint48(block.timestamp + 1 hours),
            1
        );
    }

    function test_rejectsUnsafeGrants() public {
        _install();
        uint48 nowTs = uint48(block.timestamp);
        _expectGrantRevert(
            address(0),
            address(target),
            LocalSessionTarget.ping.selector,
            nowTs,
            nowTs + 1 hours,
            1,
            abi.encodeWithSelector(SessionCallExecutor.InvalidAgent.selector)
        );
        _expectGrantRevert(
            AGENT,
            address(account),
            LocalSessionTarget.ping.selector,
            nowTs,
            nowTs + 1 hours,
            1,
            abi.encodeWithSelector(SessionCallExecutor.InvalidTarget.selector)
        );
        _expectGrantRevert(
            AGENT,
            address(executor),
            LocalSessionTarget.ping.selector,
            nowTs,
            nowTs + 1 hours,
            1,
            abi.encodeWithSelector(SessionCallExecutor.InvalidTarget.selector)
        );
        _expectGrantRevert(
            AGENT,
            address(0xC0FFEE),
            LocalSessionTarget.ping.selector,
            nowTs,
            nowTs + 1 hours,
            1,
            abi.encodeWithSelector(SessionCallExecutor.InvalidTarget.selector)
        );
        _expectGrantRevert(
            AGENT,
            address(target),
            bytes4(0xa9059cbb),
            nowTs,
            nowTs + 1 hours,
            1,
            abi.encodeWithSelector(SessionCallExecutor.ForbiddenSelector.selector, bytes4(0xa9059cbb))
        );
        _expectGrantRevert(
            AGENT,
            address(target),
            bytes4(0x2fb74e62),
            nowTs,
            nowTs + 1 hours,
            1,
            abi.encodeWithSelector(SessionCallExecutor.ForbiddenSelector.selector, bytes4(0x2fb74e62))
        );
        _expectGrantRevert(
            AGENT,
            address(target),
            LocalSessionTarget.ping.selector,
            nowTs,
            nowTs,
            1,
            abi.encodeWithSelector(SessionCallExecutor.InvalidWindow.selector)
        );
        _expectGrantRevert(
            AGENT,
            address(target),
            LocalSessionTarget.ping.selector,
            nowTs,
            nowTs + 8 days,
            1,
            abi.encodeWithSelector(SessionCallExecutor.InvalidWindow.selector)
        );
        _expectGrantRevert(
            AGENT,
            address(target),
            LocalSessionTarget.ping.selector,
            nowTs + 7 days,
            nowTs + 8 days,
            1,
            abi.encodeWithSelector(SessionCallExecutor.InvalidWindow.selector)
        );
        _expectGrantRevert(
            AGENT,
            address(target),
            LocalSessionTarget.ping.selector,
            nowTs,
            nowTs + 1 hours,
            0,
            abi.encodeWithSelector(SessionCallExecutor.InvalidCallLimit.selector)
        );
        _expectGrantRevert(
            AGENT,
            address(target),
            LocalSessionTarget.ping.selector,
            nowTs,
            nowTs + 1 hours,
            101,
            abi.encodeWithSelector(SessionCallExecutor.InvalidCallLimit.selector)
        );
    }

    function _expectGrantRevert(
        address agent,
        address to,
        bytes4 selector,
        uint48 validAfter,
        uint48 validUntil,
        uint32 maxCalls,
        bytes memory reason
    ) internal {
        vm.prank(entryPoint);
        vm.expectRevert(reason);
        _executeSingle(
            address(executor),
            abi.encodeCall(SessionCallExecutor.grantSession, (agent, to, selector, validAfter, validUntil, maxCalls))
        );
    }

    function test_onlySessionAgentCanExecute() public {
        _install();
        bytes32 sessionId = _grant(LocalSessionTarget.ping.selector, 1 hours, 5);
        vm.prank(OUTSIDER);
        vm.expectRevert(abi.encodeWithSelector(SessionCallExecutor.NotSessionAgent.selector));
        executor.executeSession(address(account), sessionId, abi.encodeCall(LocalSessionTarget.ping, (1)));
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(SessionCallExecutor.NotSessionAgent.selector));
        executor.executeSession(address(account), sessionId, abi.encodeCall(LocalSessionTarget.ping, (1)));
    }

    function test_unknownSessionAndCrossAccountReplayRejected() public {
        _install();
        bytes32 sessionId = _grant(LocalSessionTarget.ping.selector, 1 hours, 5);
        PrigenAccountPrototype other = new PrigenAccountPrototype(owner);
        vm.prank(AGENT);
        vm.expectRevert(abi.encodeWithSelector(SessionCallExecutor.UnknownSession.selector));
        executor.executeSession(address(other), sessionId, abi.encodeCall(LocalSessionTarget.ping, (1)));
    }

    function test_selectorScopeEnforced() public {
        _install();
        bytes32 sessionId = _grant(LocalSessionTarget.ping.selector, 1 hours, 5);
        vm.prank(AGENT);
        vm.expectRevert(abi.encodeWithSelector(SessionCallExecutor.SelectorMismatch.selector));
        executor.executeSession(address(account), sessionId, abi.encodeCall(LocalSessionTarget.other, ()));
        vm.prank(AGENT);
        vm.expectRevert(abi.encodeWithSelector(SessionCallExecutor.SelectorMismatch.selector));
        executor.executeSession(address(account), sessionId, hex"0102");
    }

    function test_callLimitEnforced() public {
        _install();
        bytes32 sessionId = _grant(LocalSessionTarget.ping.selector, 1 hours, 2);
        _agentPing(sessionId, 1);
        _agentPing(sessionId, 2);
        vm.prank(AGENT);
        vm.expectRevert(abi.encodeWithSelector(SessionCallExecutor.CallLimitReached.selector));
        executor.executeSession(address(account), sessionId, abi.encodeCall(LocalSessionTarget.ping, (3)));
        require(target.pings() == 2, "TWO_PINGS");
    }

    function test_expiryEnforced() public {
        _install();
        bytes32 sessionId = _grant(LocalSessionTarget.ping.selector, 1 hours, 5);
        vm.warp(block.timestamp + 1 hours);
        vm.prank(AGENT);
        vm.expectRevert(abi.encodeWithSelector(SessionCallExecutor.SessionNotActive.selector));
        executor.executeSession(address(account), sessionId, abi.encodeCall(LocalSessionTarget.ping, (1)));
    }

    function test_notYetValidSessionRejected() public {
        _install();
        uint48 start = uint48(block.timestamp + 1 hours);
        _ownerExecute(
            address(executor),
            abi.encodeCall(
                SessionCallExecutor.grantSession,
                (AGENT, address(target), LocalSessionTarget.ping.selector, start, start + 1 hours, 1)
            )
        );
        bytes32 sessionId =
            keccak256(abi.encode(block.chainid, address(executor), address(account), uint64(0), uint256(1)));
        vm.prank(AGENT);
        vm.expectRevert(abi.encodeWithSelector(SessionCallExecutor.SessionNotActive.selector));
        executor.executeSession(address(account), sessionId, abi.encodeCall(LocalSessionTarget.ping, (1)));
        vm.warp(start);
        _agentPing(sessionId, 1);
    }

    function test_revokeSessionIsImmediateAndOwnerOnly() public {
        _install();
        bytes32 sessionId = _grant(LocalSessionTarget.ping.selector, 1 hours, 5);
        // An outsider "revoking" only touches its own namespace.
        vm.prank(OUTSIDER);
        vm.expectRevert(abi.encodeWithSelector(SessionCallExecutor.UnknownSession.selector));
        executor.revokeSession(sessionId);
        require(executor.isSessionActive(address(account), sessionId), "STILL_ACTIVE");

        _ownerExecute(address(executor), abi.encodeCall(SessionCallExecutor.revokeSession, (sessionId)));
        vm.prank(AGENT);
        vm.expectRevert(abi.encodeWithSelector(SessionCallExecutor.SessionNotActive.selector));
        executor.executeSession(address(account), sessionId, abi.encodeCall(LocalSessionTarget.ping, (1)));
    }

    function test_revokeAllInvalidatesEverySession() public {
        _install();
        bytes32 first = _grant(LocalSessionTarget.ping.selector, 1 hours, 5);
        bytes32 second = _grant(LocalSessionTarget.ping.selector, 2 hours, 5);
        _ownerExecute(address(executor), abi.encodeCall(SessionCallExecutor.revokeAllSessions, ()));
        require(!executor.isSessionActive(address(account), first), "FIRST_REVOKED");
        require(!executor.isSessionActive(address(account), second), "SECOND_REVOKED");
    }

    function test_uninstallRevokesAndReinstallDoesNotResurrect() public {
        _install();
        bytes32 sessionId = _grant(LocalSessionTarget.ping.selector, 1 hours, 5);
        _ownerExecute(
            address(account),
            abi.encodeCall(IERC7579ModuleConfig.uninstallModule, (MODULE_TYPE_EXECUTOR, address(executor), ""))
        );
        vm.prank(AGENT);
        vm.expectRevert(); // account rejects a non-installed executor and the epoch is bumped
        executor.executeSession(address(account), sessionId, abi.encodeCall(LocalSessionTarget.ping, (1)));

        _install();
        require(!executor.isSessionActive(address(account), sessionId), "NOT_RESURRECTED");
        vm.prank(AGENT);
        vm.expectRevert(abi.encodeWithSelector(SessionCallExecutor.SessionNotActive.selector));
        executor.executeSession(address(account), sessionId, abi.encodeCall(LocalSessionTarget.ping, (1)));
    }

    function test_forbiddenSelectorList() public view {
        bytes4[29] memory forbidden = [
            bytes4(0),
            bytes4(0xa9059cbb),
            0x23b872dd,
            0x095ea7b3,
            0x39509351,
            0xd505accf,
            0xa22cb465,
            0x42842e0e,
            0xb88d4fde,
            0xf242432a,
            0x2eb2c2d6,
            0xd4febb96,
            0x5bebed7e,
            0x2fb74e62,
            0x537d3c50,
            0xde642119,
            0xeb3155b5,
            0xe064b9bb,
            0xc7b8a75e,
            0x34c45743,
            0xbf376c7a,
            0xe8c15fd4,
            0x5bf4ef06,
            0x9517e29f,
            0xa71763a8,
            0xe9ae5c53,
            0xd691c964,
            0x4f1ef286,
            0x3659cfe6
        ];
        for (uint256 i = 0; i < forbidden.length; i++) {
            require(executor.isForbiddenSelector(forbidden[i]), "MUST_BE_FORBIDDEN");
        }
        require(IERC7579ModuleConfig.installModule.selector == bytes4(0x9517e29f), "INSTALL_SELECTOR");
        require(!executor.isForbiddenSelector(LocalSessionTarget.ping.selector), "PING_ALLOWED");
    }

    function testFuzz_onlyGrantedSelectorExecutes(bytes4 selector, bytes calldata tail) public {
        vm.assume(selector != LocalSessionTarget.ping.selector);
        _install();
        bytes32 sessionId = _grant(LocalSessionTarget.ping.selector, 1 hours, 5);
        vm.prank(AGENT);
        vm.expectRevert(abi.encodeWithSelector(SessionCallExecutor.SelectorMismatch.selector));
        executor.executeSession(address(account), sessionId, abi.encodePacked(selector, tail));
        require(target.pings() == 0, "NO_CALL");
    }

    function testFuzz_callsNeverExceedLimit(uint8 limitSeed, uint8 attemptsSeed) public {
        uint32 limit = uint32(limitSeed % 10) + 1;
        uint256 attempts = uint256(attemptsSeed % 20);
        _install();
        bytes32 sessionId = _grant(LocalSessionTarget.ping.selector, 1 hours, limit);
        for (uint256 i = 0; i < attempts; i++) {
            vm.prank(AGENT);
            try executor.executeSession(address(account), sessionId, abi.encodeCall(LocalSessionTarget.ping, (i))) {}
                catch {}
        }
        uint256 expected = attempts < limit ? attempts : limit;
        require(target.pings() == expected, "CALLS_BOUNDED");
    }
}
