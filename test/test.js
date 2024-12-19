var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Web3Engine } from "../Web3Engine.js";
import { providers } from "../../web3-data/networks/Providers.js";
import { deployed } from "../../web3-data/networks/DeployedContracts.js";
import { yellow, green, gray } from "../../web3-data/functions/ConsoleColors.js";
import { contractFactoryV2 } from "../../contract-factory-v2/ContractFactoryV2.js";
import fs from "fs";
import { ecrecover, toBuffer } from "ethereumjs-util";
const network = "Ganache";
const deployContracts = true;
let mnemonic;
let uuid;
let engine;
let wallet;
let account;
try {
    mnemonic = (fs.readFileSync("")).toString();
}
catch (_a) {
    mnemonic = (fs.readFileSync("../../secret/.secret-mn-ganache")).toString();
}
try {
    uuid = (fs.readFileSync("../secret/.uuid")).toString();
}
catch (_b) {
    uuid = (fs.readFileSync("../../secret/.uuid")).toString();
}
const main = () => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    let prvdrs = {};
    prvdrs[network] = providers[network];
    const engineArgs = {
        browser: false,
        mnemonic,
        defaultAccount: 0,
        networks: [network],
        defaultNetwork: network,
        providers: prvdrs,
        deployed,
        contractFactory: contractFactoryV2,
        contractFactoryVersion: 2
    };
    engine = yield Web3Engine.initialize(engineArgs);
    console.log(green(), "Engine Init.");
    wallet = (_a = engine.defaultInstance) === null || _a === void 0 ? void 0 : _a.wallet;
    account = wallet[0].address;
    yield deploy();
    yield register();
    //publicKey = wallet[1].address as string;
    process.exit(0);
});
const deploy = () => __awaiter(void 0, void 0, void 0, function* () {
    console.log(yellow(), "Deploy", deployed[network]["PublicKeys"]);
    if (deployContracts) {
        const contract = yield engine.deploy(network, "PublicKeys", [], { from: account });
        console.log(gray(), contract);
    }
    console.log(green(), `Contract PublicKeys can be used.`);
});
const register = () => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    // get enable hash
    const enableHash = (yield engine.sendTransaction(network, { from: account }, "PublicKeys", "EnableHash", [], true)).transaction;
    //console.log(yellow(), enableHash)
    // sign enable message
    let sig = yield ((_a = engine.defaultInstance) === null || _a === void 0 ? void 0 : _a.wallet[0].sign("Enable Public Key."));
    //register
    yield engine.sendTransaction(network, { from: account }, "PublicKeys", "register", [sig === null || sig === void 0 ? void 0 : sig.signature]);
    let key = (yield engine.sendTransaction(network, { from: account }, "PublicKeys", "SignKeys", [account], true)).transaction;
    console.log(green(), `Public Key: ${JSON.stringify(key)}`);
    let keybuf = ecrecover(toBuffer(enableHash), Number(key.v), toBuffer(key.r), toBuffer(key.s));
    let encrypted = yield engine.encrypt(keybuf, "This is my message.");
    console.log(encrypted);
    let decrypt = yield engine.decrypt(0, encrypted);
    console.log(decrypt);
});
main();
