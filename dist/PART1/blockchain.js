"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto = __importStar(require("crypto"));
const SHA256 = (msg) => crypto.createHash('sha256').update(msg).digest('hex');
// Example usage:
// const hash = SHA256('Hello, world!');
// console.log(hash);
// type BlockType = {
//     timestamp: number,
//     data: any[],
//     hash: string,
//     previousHash: string,
//     nonce: number
// }
class Block {
    constructor(data) {
        this.timestamp = Date.now();
        this.data = data;
        this.hash = this.getHash();
        this.previousHash = '';
        this.nonce = 0;
    }
    getHash() {
        return SHA256(this.timestamp + this.previousHash + JSON.stringify(this.data) + this.nonce).toString();
    }
    mine(difficulty) {
        while (this.hash.substring(0, difficulty) !== Array(difficulty + 1).join("0")) {
            this.nonce++;
            this.hash = this.getHash();
        }
        console.log("Block mined: " + this.hash);
    }
}
class BlockChain {
    constructor() {
        this.chain = [new Block(['Genesis block'])];
        this.difficulty = 2;
        this.blockTime = 5000; //5s
    }
    getLastBlock() {
        return this.chain[this.chain.length - 1];
    }
    addBlock(newBlock) {
        newBlock.previousHash = this.getLastBlock().hash;
        newBlock.mine(this.difficulty);
        this.chain.push(newBlock);
        this.difficulty += Date.now() - newBlock.timestamp > this.blockTime ? -1 : 1;
    }
    isValid() {
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];
            if (currentBlock.hash !== currentBlock.getHash()) {
                return false;
            }
            if (currentBlock.previousHash !== previousBlock.hash) {
                return false;
            }
        }
        return true;
    }
}
// const block1 = new Block(['transaction1', 'transaction2']);
// block1.mine(5);
// console.log(block1);
const NormanChain = new BlockChain();
NormanChain.addBlock(new Block(['transaction1']));
NormanChain.addBlock(new Block(['transaction2']));
NormanChain.addBlock(new Block(['transaction3']));
NormanChain.addBlock(new Block(['transaction1']));
NormanChain.addBlock(new Block(['transaction2']));
NormanChain.addBlock(new Block(['transaction3']));
NormanChain.addBlock(new Block(['transaction1']));
NormanChain.addBlock(new Block(['transaction2']));
NormanChain.addBlock(new Block(['transaction3']));
NormanChain.addBlock(new Block(['transaction1']));
NormanChain.addBlock(new Block(['transaction2']));
NormanChain.addBlock(new Block(['transaction3']));
console.log(NormanChain.isValid());
console.log(NormanChain.chain);
console.log(NormanChain.difficulty);
