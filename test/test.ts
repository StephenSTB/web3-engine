import { Web3Engine, EngineArgs} from "../Web3Engine.js";

import { providers } from "../../web3-data/networks/Providers.js"

import { Providers } from "../../web3-data/networks/Providers.js"

import { deployed } from "../../web3-data/networks/DeployedContracts.js"

import { yellow, green, red, gray } from "../../web3-data/functions/ConsoleColors.js"

import { contractFactoryV2 } from "../../contract-factory-v2/ContractFactoryV2.js"

import fs from "fs"

import {ecrecover, toBuffer} from "ethereumjs-util";

import { PrivateKey, decrypt, encrypt } from "eciesjs";

const network = "Ganache"

const deployContracts = true;

let mnemonic : string;

let uuid: string;

let engine: Web3Engine;

let wallet: any;

let account: string;

try{
    mnemonic = (fs.readFileSync("")).toString()
}catch{
    mnemonic = (fs.readFileSync("../../secret/.secret-mn-ganache")).toString()
}

try{
    uuid = (fs.readFileSync("../secret/.uuid")).toString()
}catch{
    uuid = (fs.readFileSync("../../secret/.uuid")).toString()
}

const main = async () =>{
    let prvdrs = {} as Providers;

    prvdrs[network] = providers[network]

    const engineArgs = 
    {
        browser: false,
        mnemonic, 
        defaultAccount: 0,
        networks: [network], 
        defaultNetwork: network, 
        providers: prvdrs, 
        deployed, 
        contractFactory: contractFactoryV2, 
        contractFactoryVersion: 2
    } as EngineArgs

    engine = await Web3Engine.initialize(engineArgs);

    console.log(green(), "Engine Init.")

    wallet = engine.defaultInstance?.wallet;

    account = wallet[0].address as string;

    console.log(wallet[0].privateKey)
    /*
    const sk = new PrivateKey()
    console.log(sk.publicKey.toBytes())
    
    const data = new Uint8Array(Buffer.from("hello world"))
    const encrypted = new Uint8Array(encrypt(sk.publicKey.toBytes(), data))
    console.log(encrypted)
    const decrypted = decrypt(sk.secret.toString("hex"), encrypted)
    console.log(Buffer.from(decrypted).toString())*/

    await deploy()

    await register();

    //publicKey = wallet[1].address as string;
    
    process.exit(0)
}

const deploy = async () =>{
    console.log(yellow(), "Deploy", deployed[network]["PublicKeys"])
    if(deployContracts){
        
        const contract = await engine.deploy(network, "PublicKeys", [], {from: account})
        console.log(gray(), contract)
        
    }
    console.log(green(), `Contract PublicKeys can be used.`)
    
}

const register = async () =>{
    // get enable hash
    const enableHash = (await engine.sendTransaction(network, {from: account}, "PublicKeys", "EnableHash", [], true)).transaction
    //console.log(yellow(), enableHash)
    // sign enable message
    let sig = await engine.defaultInstance?.wallet[0].sign("Enable Public Key.")
    //register

    const gas = await engine.getGas(network, {from: account}, "PublicKeys", "register" , [sig?.signature]);

    console.log(gray(), "Gas: ", gas)

    await engine.sendTransaction(network, {from: account}, "PublicKeys", "register" , [sig?.signature])

    let key = (await engine.sendTransaction(network, {from: account}, "PublicKeys", "SignKeys", [account], true)).transaction

    console.log(green(), `Public Key: ${JSON.stringify(key)}`)

    let keybuf = new Uint8Array(Buffer.from("04" + ecrecover(toBuffer(enableHash), Number(key.v), toBuffer(key.r), toBuffer(key.s)).toString("hex"), "hex"))

    //let encrypted = await engine.encrypt(keybuf, "This is my message.") as EncryptedMessage
    //console.log(encrypted)


    let encrypted = await engine.encrypt(keybuf, "This is my message.")
    console.log(encrypted)

    let decrypted = await engine.decrypt(0, new Uint8Array(encrypted))
    
    console.log(green(), decrypted)
}

main();
