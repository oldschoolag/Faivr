// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {FaivrVerificationRegistry} from "../src/FaivrVerificationRegistry.sol";

contract DeployVerification is Script {
    function run() external {
        address admin = vm.envAddress("ADMIN");
        address identityRegistry = address(0x8D97B74fA9bFa67Db1A8Cf315dA91390612B90F6);

        vm.startBroadcast();

        FaivrVerificationRegistry impl = new FaivrVerificationRegistry();
        console.log("VerificationRegistry impl:", address(impl));

        ERC1967Proxy proxy = new ERC1967Proxy(
            address(impl),
            abi.encodeCall(FaivrVerificationRegistry.initialize, (admin, identityRegistry))
        );
        console.log("VerificationRegistry proxy:", address(proxy));

        vm.stopBroadcast();

        console.log("\n=== Verification Deployment Complete ===");
        console.log("Admin:          ", admin);
        console.log("Identity:       ", identityRegistry);
        console.log("Proxy:          ", address(proxy));
    }
}
