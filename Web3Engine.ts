import Web3 from "web3";

import bip39 from "bip39";

import {BIP32Factory} from 'bip32';

//import HDKey from "hdkey";

//import ethUtil from 'ethereumjs-util';

import * as ecc from 'tiny-secp256k1';
///import hdkey from 'ethereumjs-wallet/dist/hdkey.js';

import fs from "fs";

import { URL } from 'url';

import { Providers, DeployedContracts, Provider} from "../web3-data"

import { green, yellow, red, gray } from "../web3-data/functions/ConsoleColors.js"

//import { ContractFactoryV1 } from "../contract-factory-v1";

import { ContractFactoryV2 } from "../contract-factory-v2";

import { Utils } from "web3-utils"

import { Wallet } from "web3-eth-accounts"

//import { TruffleContract } from "../web3-data/interfaces/TruffleContract";

//import eccrypto from "eccrypto"
//import { error } from "console";

import { encrypt, decrypt } from "eciesjs"

const __dirname = new URL('.', import.meta.url).pathname;

interface Engine{
    browser: boolean;
    mnemonic: string;
    networks: string[];
    providers: object;
    deployed: DeployedContracts;
    web3Instances?: Web3Instances;
    utils?: Utils;
    publicKeys?: string[];    
    accounts: string[];
    contractFactory: any;
    contractFactoryVersion: number;
}

export interface EngineArgs{
    browser: boolean;
    mnemonic: string;
    defaultAccount?: number;
    networks: string[];
    defaultNetwork?: string
    providers: Providers;
    deployed: DeployedContracts;
    contractFactory: any; 
    contractFactoryVersion: number;
}

interface Web3Instances{
    [network: string] : Web3Instance;
}

interface Web3Instance{
    web3: Web3;
    id: number;
    wallet: Wallet;
    contracts: Contracts;
}

interface Contracts{
    [key: string] : any;
}


export class Web3Engine implements Engine{

    browser: boolean;
    mnemonic: string;
    networks: string[];
    defaultNetwork?: string;
    providers: Providers;
    deployed: DeployedContracts;
    web3Instances: Web3Instances;
    defaultInstance?: Web3Instance;
    utils: Utils;
    publicKeys: string[];
    accounts: string[];
    defaultAccount?: string;
    contractFactory: any;
    contractFactoryVersion: number;

    constructor(args : EngineArgs){
       //this.mnemonic = fs.readFileSync("./data/.secret").toString();
       this.browser = args.browser;
       this.mnemonic = args.mnemonic;
       this.providers = args.providers;
       this.deployed = args.deployed;
       this.networks = args.networks;
       this.defaultNetwork = args.defaultNetwork;
       this.web3Instances = {};
       this.utils = (Web3.utils as unknown) as Utils;
       this.publicKeys = [];
       this.accounts = [];
       this.contractFactory = args.contractFactory;
       this.contractFactoryVersion = args.contractFactoryVersion !== 1 && args.contractFactoryVersion !== 2 ? 2 : args.contractFactoryVersion;
    }

    static initialize = async(args: EngineArgs) =>{
        let web3Engine = new Web3Engine(args);
        //console.log(__dirname)
        console.log(yellow(), "Init Engine Providers.")
        await web3Engine.#initProviders()
        console.log(yellow(), "Init Engine wallet." )
        await web3Engine.#initWallet(args.defaultAccount);
        console.log(yellow(),"Init Engine Contracts.")
        await web3Engine.#initContracts();
        
        return web3Engine;
    }

    #initProviders = async () =>{
        for(let n of this.networks){
            if(!this.providers[n] === undefined || this.providers[n].url === undefined){
                console.log(red(), "Error provider was not found for given network")
                continue;
            }
            console.log(gray(), this.providers[n].url)
            this.web3Instances[n] = {
                web3: new Web3(this.providers[n].url),
                id: 0,
                wallet: {} as Wallet,
                contracts: {}
            }
            let web3 = this.web3Instances[n].web3;
            try{    
                let id = await web3.eth.getChainId()
                console.log(yellow(), `${n} listening: ${id}`)
                this.web3Instances[n].id = id;
                if(this.defaultNetwork === n){
                    this.defaultInstance = this.web3Instances[n]
                }
            }catch{
                //remove
                console.log( red(), `Error connection to ${n} was unsuccessful.`)
                delete this.web3Instances[n]
                this.networks.splice(this.networks.indexOf(n, 1))
                return false;
            }
        }
    }

    #initWallet = async (defaultAccount ?: number) =>{
        let seed = bip39.mnemonicToSeedSync(this.mnemonic);

        //console.log(seed)

        //console.log(hdkey.fromMasterSeed)
        //let hdkey = HDKey.fromMasterSeed(seed);
        // Create a BIP32 factory
        const bip32Factory = BIP32Factory(ecc);
        let seedU = new Uint8Array(seed)
        let node = bip32Factory.fromSeed(seedU)
        //let derivedNode: BIP32Interface =  await node.derivePath("m/44'/60'/0'/0/0");
        //console.log((Buffer.from(derivedNode.privateKey as Uint8Array)).toString('hex'))
        let privateKeys = []
        for(let i = 0; i < 10; i ++){
            const derivednode = node.derivePath("m/44'/60'/0'/0/" + i);
            const privateKey = (Buffer.from(derivednode.privateKey as Uint8Array)).toString('hex')
            //const publicKey = ecc.publicKeyCreate(privateKeyBuffer);
            //console.log(privateKey)
            //let key: any = hdwallet.derivePath("m/44'/60'/0'/0/" + i).getWallet() //hdkey.derive("m/44'/60'/0'/0/" + i.toString());
            //key = key.getPrivateKey();
            privateKeys.push("0x" + privateKey); //"0x" + key.privateKey.toString('hex')

            //this.publicKeys.push(d);   
            this.publicKeys.push("0x" + (Buffer.from(derivednode.publicKey as Uint8Array)).toString('hex'))
        }
        //console.log(privateKeys)
        
        for(var n of this.networks){
            
            let web3 = this.web3Instances[n].web3;

            for(let i = 0; i < privateKeys.length; i++){

                let account = await web3.eth.accounts.wallet.add(privateKeys[i]);
                if(i === defaultAccount){
                    this.defaultAccount = account.address;
                }
                if(!this.accounts.includes(account.address)){
                    this.accounts.push(account.address)
                }
            }
            
            this.web3Instances[n].wallet = web3.eth.accounts.wallet;
        }
    }
    #initContracts = async () =>{
        for(var n of this.networks){
            if(this.deployed[n] === undefined){
                continue;
            }/*
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
            if(this.contractFactoryVersion === 2){
                console.log(gray(), "Getting engine contracts")
                let contractFactory = this.contractFactory(this.web3Instances[n].web3) as ContractFactoryV2

                for(let contract in contractFactory){
                    if(this.deployed[n][contract] !== undefined){
                        try{
                            let contractInstance = contractFactory[contract] 
                            contractInstance.options.address = this.deployed[n][contract].address
                            this.web3Instances[n].contracts[contract] = contractInstance
                        }
                        catch{
                            console.log(red(), `Contract: ${contract} was not found on ${n} at ${this.deployed[n][contract]} v2`)
                        }
                    }   
                }
            }

            console.log(green(),"Got engine contracts")
        }
    }

    #updateContracts = (network: string, name: string, address: string, block: number) =>{        
        if(this.deployed[network] === undefined){
            this.deployed[network] = {};
        }
        this.deployed[network][name] = {address, block};
        //console.log(this.deployed)
        if(!this.browser){
            
            fs?.writeFileSync(__dirname + "../web3-data/networks/DeployedContracts.json", JSON.stringify(this.deployed, null, 4));
        }
        
        //fs.writeFileSync("./webpage/src/modules/data/Deployed_Contracts.json", JSON.stringify(deployedContracts, null, 4));
    }
    
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

    }

    generateMnemonic = () =>{
        return bip39.generateMnemonic()
    }

    validateMnemonic = (mnemonic: string) =>{
        return bip39.validateMnemonic(mnemonic)
    }

    encrypt = async (publicKey: Uint8Array, msg: string): Promise<Buffer> => {
        
        return encrypt(publicKey, new Uint8Array(Buffer.from(msg)));
        /*
        let encrypted = await eccrypto.encrypt(Buffer.from("04" + publicKey.toString('hex'), "hex"), Buffer.from(msg))
        console.log(green(), encrypted)
        return encrypted as EncryptedMessage;*/
    }

    decrypt = async (account: number, encrypted_message: Uint8Array) =>{

        const privateKey = new Uint8Array(Buffer.from((this.defaultInstance?.wallet[account].privateKey)?.slice(2) as string, "hex"))

        return decrypt(privateKey, encrypted_message)
        /*
        const wallet = this.defaultInstance?.wallet as Wallet;
    
        const decrypt = (await eccrypto.decrypt(Buffer.from(wallet[account].privateKey.slice(2), 'hex'), encrypted_message)).toString()

        console.log(green(), decrypt)
        return decrypt;*/
    }

    // deploy contract , params
    deploy = async(network: string, contract: string, args: any, tx_params: any) =>{
        let result = {success: false, error: "", deployed: {} as any}
        if(this.web3Instances[network] === undefined){
            result.error = "network not found in web3 engine instance."
            return result;
        }
        if(this.contractFactoryVersion === 2  &&  this.contractFactory(this.web3Instances[network].web3)[contract] === undefined){
            result.error = "contract was not found in contract factory 2."
            return result;
        }

        try{
            let web3 = this.web3Instances[network].web3;
            //let wallet = this.web3Instances[network].wallet;

            let deployed;
            let blockNumber: number = 0;
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
            if( this.contractFactoryVersion === 2){
                let contractInstance = this.contractFactory(web3)[contract];

                const ether = await web3.eth.getBalance(tx_params.from);
                //console.log(yellow(), `${tx_params.from} ether: ${ether}`)
                
                //let gas = await contractInstance.deploy({arguments: args, data: contractInstance.options.data as string}).estimateGas();
                let gas = await contractInstance.deploy({arguments: args, data: contractInstance.options.data as string}).estimateGas(tx_params)
                console.log(yellow(), `${contract} deployment gas: ${gas}`)

                console.log()

                tx_params.gas = gas;

                let gasPrice = await web3.eth.getGasPrice();

                tx_params.gasPrice = gasPrice

                //console.log(this.web3Instances)

                console.log(yellow(), `Deploying ${contract}...`)
                
                deployed = await contractInstance.deploy({arguments: args, data: contractInstance.options.data as string}).send(tx_params).on("receipt", (receipt: any) =>{
                    //console.log(receipt)
                    blockNumber = receipt.blockNumber
                })

                
            }
            else{
                result.error = "invalid contract factory"
                return result;
            }
            this.web3Instances[network].contracts[contract] = deployed;
           
            result.success = true;
            result.deployed = deployed;
            this.#updateContracts(network, contract, deployed.options.address, blockNumber)
            return result;
        }catch(e){
            console.log(red(), e);
            result.error = "failed to deploy contract.";
            return result;
        }

    }

    async sendTransaction(network: string, tx_params: any, contract: string, method: string, args: any) : Promise<any>
    async sendTransaction(network: string, tx_params: any, contract: string, method: string, args: any, call: boolean) : Promise<any>
    async sendTransaction(network: string, tx_params: any) : Promise<any>
    async sendTransaction(network: string, tx_params: any, contract?: string, method?: string, args?: any, call?: boolean): Promise<any>{
        let result = {success: false, error: "", transaction: "" as any}
        if(this.web3Instances[network] === undefined){
            result.error = "invalid network given."
            return result
        }
        if(contract !== undefined  && this.web3Instances[network].contracts[contract] === undefined){
            result.error = "invalid contract given"
            return result
        }
        let web3 = this.web3Instances[network].web3
        
        if(contract === undefined && method === undefined){

            if(tx_params.gas === undefined)
                tx_params.gas = await web3.eth.estimateGas(tx_params);

            result.transaction = await web3.eth.sendTransaction(tx_params)
            result.success = true
            return result
        }
        if(contract === undefined || method === undefined || args === undefined){
            result.error = "invalid sendTransaction call contract, method or args were undefined."
            return result;
        }

        if(this.contractFactoryVersion !== 2){
            result.error = "invalid contract factory in use."
            return result;
        }

        let contractInstance = this.web3Instances[network].contracts[contract]

        if(contractInstance === undefined){
            result.error = `contract: ${contract} was not found on network: ${network}`
            return result;
        }

        if(call){
            result.transaction = await contractInstance.methods[method](...args).call(tx_params)
            result.success = true;
            return result
        }

        if(tx_params.gas === undefined){
            tx_params.gas = await contractInstance.methods[method](...args).estimateGas({from: tx_params.from, value: tx_params.value})
            //console.log(tx_params.gas )
        }
        try{
            result.transaction = await contractInstance.methods[method](...args).send(tx_params)
        }
        catch(e){
            result.error = "Contract Method Send Error."
            return result
        }
        
        result.success = true;
        return result
    }

    async getGas(network: string, tx_params: any, contract: string, method: string, args: any) : Promise<any>{
        let result = {success: false, error: "", gas: "" as any}
        if(this.web3Instances[network] === undefined){
            result.error = "invalid network given."
            return result
        }

        let contractInstance = this.web3Instances[network].contracts[contract]

        if(contractInstance === undefined){
            result.error = `contract: ${contract} was not found on network: ${network}`
            return result;
        }
        if(tx_params.gas === undefined){
            tx_params.gas = await contractInstance.methods[method](...args).estimateGas({from: tx_params.from, value: tx_params.value})
        }
        result.gas = tx_params.gas * Number(await this.defaultInstance?.web3.eth.getGasPrice())
        result.success = true;
        return result;
    }

}

//console.log("engine")