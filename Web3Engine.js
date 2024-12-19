var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _a, _Web3Engine_initProviders, _Web3Engine_initWallet, _Web3Engine_initContracts, _Web3Engine_updateContracts;
import Web3 from "web3";
import bip39 from "bip39";
import HDKey from "hdkey";
import fs from "fs";
import { URL } from 'url';
import { green, yellow, red, gray } from "../web3-data/functions/ConsoleColors.js";
//import { TruffleContract } from "../web3-data/interfaces/TruffleContract";
import eccrypto from "eccrypto";
const __dirname = new URL('.', import.meta.url).pathname;
export class Web3Engine {
    constructor(args) {
        _Web3Engine_initProviders.set(this, () => __awaiter(this, void 0, void 0, function* () {
            for (let n of this.networks) {
                if (!this.providers[n] === undefined || this.providers[n].url === undefined) {
                    console.log(red(), "Error provider was not found for given network");
                    continue;
                }
                console.log(gray(), this.providers[n].url);
                this.web3Instances[n] = {
                    web3: new Web3(this.providers[n].url),
                    id: 0,
                    wallet: {},
                    contracts: {}
                };
                let web3 = this.web3Instances[n].web3;
                try {
                    let id = yield web3.eth.getChainId();
                    console.log(yellow(), `${n} listening: ${id}`);
                    this.web3Instances[n].id = id;
                    if (this.defaultNetwork === n) {
                        this.defaultInstance = this.web3Instances[n];
                    }
                }
                catch (_b) {
                    //remove
                    console.log(red(), `Error connection to ${n} was unsuccessful.`);
                    delete this.web3Instances[n];
                    this.networks.splice(this.networks.indexOf(n, 1));
                    return false;
                }
            }
        }));
        _Web3Engine_initWallet.set(this, (defaultAccount) => __awaiter(this, void 0, void 0, function* () {
            let seed = bip39.mnemonicToSeedSync(this.mnemonic);
            let hdkey = HDKey.fromMasterSeed(seed);
            let privateKeys = [];
            for (let i = 0; i < 10; i++) {
                let key = hdkey.derive("m/44'/60'/0'/0/" + i.toString());
                privateKeys.push("0x" + key.privateKey.toString('hex'));
                this.publicKeys.push(key.publicKey.toString('hex'));
            }
            //console.log(privateKeys)
            for (var n of this.networks) {
                let web3 = this.web3Instances[n].web3;
                for (let i = 0; i < privateKeys.length; i++) {
                    let account = yield web3.eth.accounts.wallet.add(privateKeys[i]);
                    if (i === defaultAccount) {
                        this.defaultAccount = account.address;
                    }
                    if (!this.accounts.includes(account.address)) {
                        this.accounts.push(account.address);
                    }
                }
                this.web3Instances[n].wallet = web3.eth.accounts.wallet;
            }
        }));
        _Web3Engine_initContracts.set(this, () => __awaiter(this, void 0, void 0, function* () {
            for (var n of this.networks) {
                if (this.deployed[n] === undefined) {
                    continue;
                } /*
                if(this.contractFactoryVersion === 1){
                    for(var contract in this.contractFactory){
                        if(this.deployed[n][contract] !== undefined){
                        
                            try{
                                let contractInstance = this.contractFactory[contract] as TruffleContract;
                                contractInstance.setProvider(this.web3Instances[n].web3.eth.currentProvider);
                                contractInstance.setWallet(this.web3Instances[n].wallet);
                            
                                this.web3Instances[n].contracts[contract] = await contractInstance.at(this.deployed[n][contract].address);
                            }catch{
                                console.log(`Contract: ${contract} was not found on ${n} at ${this.deployed[n][contract]} v1`, red())
                            }
                        }
                            
                    }
                }*/
                if (this.contractFactoryVersion === 2) {
                    console.log(gray(), "Getting engine contracts");
                    let contractFactory = this.contractFactory(this.web3Instances[n].web3);
                    for (let contract in contractFactory) {
                        if (this.deployed[n][contract] !== undefined) {
                            try {
                                let contractInstance = contractFactory[contract];
                                contractInstance.options.address = this.deployed[n][contract].address;
                                this.web3Instances[n].contracts[contract] = contractInstance;
                            }
                            catch (_b) {
                                console.log(red(), `Contract: ${contract} was not found on ${n} at ${this.deployed[n][contract]} v2`);
                            }
                        }
                    }
                }
                console.log(green(), "Got engine contracts");
            }
        }));
        _Web3Engine_updateContracts.set(this, (network, name, address, block) => {
            if (this.deployed[network] === undefined) {
                this.deployed[network] = {};
            }
            this.deployed[network][name] = { address, block };
            //console.log(this.deployed)
            if (!this.browser) {
                fs === null || fs === void 0 ? void 0 : fs.writeFileSync(__dirname + "../web3-data/networks/DeployedContracts.json", JSON.stringify(this.deployed, null, 4));
            }
            //fs.writeFileSync("./webpage/src/modules/data/Deployed_Contracts.json", JSON.stringify(deployedContracts, null, 4));
        }
        /*
        addProvider = async (network: string, provider : Provider) =>{
            
            this.web3Instances[network] = {
                web3: new Web3(provider.url),
                id: 0,
                wallet: {} as Wallet,
                contracts: {}
            }
            let web3 = this.web3Instances[network].web3;
            try{
                let id = await web3.eth.getChainId()
                console.log(`${network} listening: ${id}`, yellow())
                this.web3Instances[network].id = id;
            }catch{
                //remove
                console.log(`Error connection to ${network} was unsuccessful.`, red())
                delete this.web3Instances[network]
                this.networks.splice(this.networks.indexOf(network, 1))
                return false;
            }
            this.providers[network] = provider
            if(!this.browser){
                fs?.writeFileSync(__dirname + "../web3-data/networks/Providers.json", JSON.stringify(this.providers, null, 4));
            }
    
        }*/
        );
        /*
        addProvider = async (network: string, provider : Provider) =>{
            
            this.web3Instances[network] = {
                web3: new Web3(provider.url),
                id: 0,
                wallet: {} as Wallet,
                contracts: {}
            }
            let web3 = this.web3Instances[network].web3;
            try{
                let id = await web3.eth.getChainId()
                console.log(`${network} listening: ${id}`, yellow())
                this.web3Instances[network].id = id;
            }catch{
                //remove
                console.log(`Error connection to ${network} was unsuccessful.`, red())
                delete this.web3Instances[network]
                this.networks.splice(this.networks.indexOf(network, 1))
                return false;
            }
            this.providers[network] = provider
            if(!this.browser){
                fs?.writeFileSync(__dirname + "../web3-data/networks/Providers.json", JSON.stringify(this.providers, null, 4));
            }
    
        }*/
        this.encrypt = (publicKey, msg) => __awaiter(this, void 0, void 0, function* () {
            let encrypted = yield eccrypto.encrypt(Buffer.from("04" + publicKey.toString('hex'), "hex"), Buffer.from(msg));
            console.log(green(), encrypted);
            return encrypted;
        });
        this.decrypt = (account, encrypted_message) => __awaiter(this, void 0, void 0, function* () {
            var _b;
            const wallet = (_b = this.defaultInstance) === null || _b === void 0 ? void 0 : _b.wallet;
            const decrypt = (yield eccrypto.decrypt(Buffer.from(wallet[account].privateKey.slice(2), 'hex'), encrypted_message)).toString();
            console.log(green(), decrypt);
            return decrypt;
        });
        // deploy contract , params
        this.deploy = (network, contract, args, tx_params) => __awaiter(this, void 0, void 0, function* () {
            let result = { success: false, error: "", deployed: {} };
            if (this.web3Instances[network] === undefined) {
                result.error = "network not found in web3 engine instance.";
                return result;
            }
            if (this.contractFactoryVersion === 2 && this.contractFactory(this.web3Instances[network].web3)[contract] === undefined) {
                result.error = "contract was not found in contract factory 2.";
                return result;
            }
            try {
                let web3 = this.web3Instances[network].web3;
                //let wallet = this.web3Instances[network].wallet;
                let deployed;
                let blockNumber = 0;
                /*
                if(this.contractFactoryVersion === 1){
                    let contractInstance = this.contractFactory[contract] as TruffleContract;
                
                    contractInstance.setProvider(web3.eth.currentProvider);
                    contractInstance.setWallet(wallet);
        
                    let gas = await contractInstance.new.estimateGas(...args, tx_params);
                    console.log(`${contract} deployment gas: ${gas}`, yellow())
                    
                    deployed = await contractInstance.new(...args, tx_params) as TruffleContract;
    
                    blockNumber = (await web3.eth.getTransactionReceipt(deployed.transactionHash)).blockNumber;
                }*/
                if (this.contractFactoryVersion === 2) {
                    let contractInstance = this.contractFactory(web3)[contract];
                    const ether = yield web3.eth.getBalance(tx_params.from);
                    //console.log(yellow(), `${tx_params.from} ether: ${ether}`)
                    //let gas = await contractInstance.deploy({arguments: args, data: contractInstance.options.data as string}).estimateGas();
                    let gas = yield contractInstance.deploy({ arguments: args, data: contractInstance.options.data }).estimateGas(tx_params);
                    console.log(yellow(), `${contract} deployment gas: ${gas}`);
                    console.log();
                    tx_params.gas = gas;
                    let gasPrice = yield web3.eth.getGasPrice();
                    tx_params.gasPrice = gasPrice;
                    //console.log(this.web3Instances)
                    console.log(yellow(), `Deploying ${contract}...`);
                    deployed = yield contractInstance.deploy({ arguments: args, data: contractInstance.options.data }).send(tx_params).on("receipt", (receipt) => {
                        //console.log(receipt)
                        blockNumber = receipt.blockNumber;
                    });
                }
                else {
                    result.error = "invalid contract factory";
                    return result;
                }
                this.web3Instances[network].contracts[contract] = deployed;
                result.success = true;
                result.deployed = deployed;
                __classPrivateFieldGet(this, _Web3Engine_updateContracts, "f").call(this, network, contract, deployed.options.address, blockNumber);
                return result;
            }
            catch (e) {
                console.log(red(), e);
                result.error = "failed to deploy contract.";
                return result;
            }
        });
        //this.mnemonic = fs.readFileSync("./data/.secret").toString();
        this.browser = args.browser;
        this.mnemonic = args.mnemonic;
        this.providers = args.providers;
        this.deployed = args.deployed;
        this.networks = args.networks;
        this.defaultNetwork = args.defaultNetwork;
        this.web3Instances = {};
        this.utils = Web3.utils;
        this.publicKeys = [];
        this.accounts = [];
        this.contractFactory = args.contractFactory;
        this.contractFactoryVersion = args.contractFactoryVersion !== 1 && args.contractFactoryVersion !== 2 ? 2 : args.contractFactoryVersion;
    }
    sendTransaction(network, tx_params, contract, method, args, call) {
        return __awaiter(this, void 0, void 0, function* () {
            let result = { success: false, error: "", transaction: "" };
            if (this.web3Instances[network] === undefined) {
                result.error = "invalid network given.";
                return result;
            }
            if (contract !== undefined && this.web3Instances[network].contracts[contract] === undefined) {
                result.error = "invalid contract given";
                return result;
            }
            let web3 = this.web3Instances[network].web3;
            if (contract === undefined && method === undefined) {
                if (tx_params.gas === undefined)
                    tx_params.gas = yield web3.eth.estimateGas(tx_params);
                result.transaction = yield web3.eth.sendTransaction(tx_params);
                result.success = true;
                return result;
            }
            if (contract === undefined || method === undefined || args === undefined) {
                result.error = "invalid sendTransaction call contract, method or args were undefined.";
                return result;
            }
            if (this.contractFactoryVersion !== 2) {
                result.error = "invalid contract factory in use.";
                return result;
            }
            let contractInstance = this.web3Instances[network].contracts[contract];
            if (contractInstance === undefined) {
                result.error = `contract: ${contract} was not found on network: ${network}`;
                return result;
            }
            if (call) {
                result.transaction = yield contractInstance.methods[method](...args).call(tx_params);
                result.success = true;
                return result;
            }
            if (tx_params.gas === undefined) {
                tx_params.gas = yield contractInstance.methods[method](...args).estimateGas({ from: tx_params.from, value: tx_params.value });
                //console.log(tx_params.gas )
            }
            try {
                result.transaction = yield contractInstance.methods[method](...args).send(tx_params);
            }
            catch (e) {
                result.error = "Contract Method Send Error.";
                return result;
            }
            result.success = true;
            return result;
        });
    }
}
_a = Web3Engine, _Web3Engine_initProviders = new WeakMap(), _Web3Engine_initWallet = new WeakMap(), _Web3Engine_initContracts = new WeakMap(), _Web3Engine_updateContracts = new WeakMap();
Web3Engine.initialize = (args) => __awaiter(void 0, void 0, void 0, function* () {
    let web3Engine = new _a(args);
    //console.log(__dirname)
    console.log(yellow(), "Init Engine Providers.");
    yield __classPrivateFieldGet(web3Engine, _Web3Engine_initProviders, "f").call(web3Engine);
    console.log(yellow(), "Init Engine wallet.");
    yield __classPrivateFieldGet(web3Engine, _Web3Engine_initWallet, "f").call(web3Engine, args.defaultAccount);
    console.log(yellow(), "Init Engine Contracts.");
    yield __classPrivateFieldGet(web3Engine, _Web3Engine_initContracts, "f").call(web3Engine);
    return web3Engine;
});
//console.log("engine")
