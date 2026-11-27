// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {
    IERC7579AccountConfig,
    IERC7579ModuleConfig,
    IERC7579Execution,
    IERC7579Module,
    MODULE_TYPE_VALIDATOR,
    MODULE_TYPE_EXECUTOR,
    MODULE_TYPE_FALLBACK,
    MODULE_TYPE_HOOK
} from "@openzeppelin/contracts/interfaces/draft-IERC7579.sol";
import {IERC1271} from "@openzeppelin/contracts/interfaces/IERC1271.sol";
import {Account} from "@openzeppelin/contracts/account/Account.sol";
import {LocalDenyAllValidator, LocalOzErc7579Account} from "./helpers/Erc7579Fixtures.sol";

interface VmErc7579 {
    function prank(address) external;
    function expectRevert(bytes calldata) external;
    function assume(bool) external pure;
}

/// @dev Cross-checks the selectors and mode encodings hard-coded in
/// packages/shared/src/erc7579-assessment.ts against the pinned OpenZeppelin
/// interface source, and proves the fixture account grants no authority.
contract Erc7579FixturesTest {
    VmErc7579 private constant vm = VmErc7579(address(uint160(uint256(keccak256("hevm cheat code")))));
    LocalDenyAllValidator private validator;
    LocalOzErc7579Account private account;

    function setUp() public {
        validator = new LocalDenyAllValidator();
        account = new LocalOzErc7579Account(address(validator));
    }

    function assertEq(bytes4 a, bytes4 b) internal pure {
        require(a == b, "BYTES4_MISMATCH");
    }

    function assertEq(string memory a, string memory b) internal pure {
        require(keccak256(bytes(a)) == keccak256(bytes(b)), "STRING_MISMATCH");
    }

    function assertTrue(bool value) internal pure {
        require(value, "EXPECTED_TRUE");
    }

    function assertFalse(bool value) internal pure {
        require(!value, "EXPECTED_FALSE");
    }

    function test_canonicalSelectorsMatchAssessorConstants() public pure {
        assertEq(IERC7579AccountConfig.accountId.selector, bytes4(0x9cfd7cff));
        assertEq(IERC7579AccountConfig.supportsExecutionMode.selector, bytes4(0xd03c7914));
        assertEq(IERC7579AccountConfig.supportsModule.selector, bytes4(0xf2dc691d));
        assertEq(IERC7579ModuleConfig.isModuleInstalled.selector, bytes4(0x112d3a7d));
        assertEq(IERC7579ModuleConfig.installModule.selector, bytes4(0x9517e29f));
        assertEq(IERC7579ModuleConfig.uninstallModule.selector, bytes4(0xa71763a8));
        assertEq(IERC7579Execution.execute.selector, bytes4(0xe9ae5c53));
        assertEq(IERC7579Execution.executeFromExecutor.selector, bytes4(0xd691c964));
        assertEq(IERC7579Module.isModuleType.selector, bytes4(0xecd05961));
        assertEq(IERC1271.isValidSignature.selector, bytes4(0x1626ba7e));
    }

    function test_ozAccountSelfReport() public view {
        assertEq(account.accountId(), "@openzeppelin/contracts.AccountERC7579.v1.0.0");
        assertTrue(account.supportsModule(MODULE_TYPE_VALIDATOR));
        assertTrue(account.supportsModule(MODULE_TYPE_EXECUTOR));
        assertTrue(account.supportsModule(MODULE_TYPE_FALLBACK));
        assertFalse(account.supportsModule(MODULE_TYPE_HOOK));
        assertFalse(account.supportsModule(0));
        assertFalse(account.supportsModule(type(uint256).max));
        // callType (byte 0) | execType (byte 1) | unused | selector | payload
        assertTrue(account.supportsExecutionMode(bytes32(0)));
        assertTrue(account.supportsExecutionMode(bytes32(uint256(0x01) << 248)));
        assertTrue(account.supportsExecutionMode(bytes32(uint256(0xff) << 248)));
        assertFalse(account.supportsExecutionMode(bytes32(uint256(0xfe) << 248)));
        assertFalse(account.supportsExecutionMode(bytes32(uint256(0x7f) << 248)));
        assertFalse(account.supportsExecutionMode(bytes32(uint256(0x7f) << 240)));
        assertTrue(account.isModuleInstalled(MODULE_TYPE_VALIDATOR, address(validator), ""));
        assertFalse(account.isModuleInstalled(MODULE_TYPE_VALIDATOR, address(0xBEEF), ""));
        assertFalse(account.isModuleInstalled(MODULE_TYPE_EXECUTOR, address(validator), ""));
    }

    function test_fixtureAcceptsNoSignature() public view {
        bytes32 digest = keccak256("prigenfi.erc7579.probe");
        assertEq(account.isValidSignature(digest, ""), bytes4(0xffffffff));
        bytes memory routed = abi.encodePacked(address(validator), bytes32(uint256(1)));
        assertEq(account.isValidSignature(digest, routed), bytes4(0xffffffff));
    }

    function test_outsiderCannotInstallModuleOrExecute() public {
        address outsider = address(0xBAD0);
        vm.prank(outsider);
        vm.expectRevert(abi.encodeWithSelector(Account.AccountUnauthorized.selector, outsider));
        account.installModule(MODULE_TYPE_EXECUTOR, outsider, "");

        vm.prank(outsider);
        vm.expectRevert(abi.encodeWithSelector(Account.AccountUnauthorized.selector, outsider));
        account.execute(bytes32(0), abi.encodePacked(outsider, uint256(0), bytes("")));
    }

    function testFuzz_undefinedModuleTypesUnsupported(uint256 moduleTypeId) public view {
        vm.assume(moduleTypeId < 1 || moduleTypeId > 3);
        assertFalse(account.supportsModule(moduleTypeId));
    }
}
