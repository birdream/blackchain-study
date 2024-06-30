import * as crypto from 'crypto';
const SHA256 = (msg: string): string => crypto.createHash('sha256').update(msg).digest('hex');

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
    timestamp: number;
    data: any[];
    hash: string;
    previousHash: string;
    nonce: number;

    constructor(data: any[]) {
        this.timestamp = Date.now();
        this.data = data;
        this.hash = this.getHash();
        this.previousHash = '';
        this.nonce = 0;
    }


    getHash() {
        return SHA256(this.timestamp + this.previousHash + JSON.stringify(this.data) + this.nonce).toString();
    }

    mine(difficulty: number) {
        while (this.hash.substring(0, difficulty) !== Array(difficulty + 1).join("0")) {
            this.nonce++;
            this.hash = this.getHash();
        }
        console.log("Block mined: " + this.hash);
    }
}

class BlockChain {
    chain: Block[]
    difficulty: number;
    blockTime: number;
    transactions: any[];
    reward: number;

    constructor() {
        this.chain = [new Block(['Genesis block'])];
        this.difficulty = 2;
        this.blockTime = 5000; //5s
        this.transactions = [];
        this.reward = 10;
    }
 
    addTransaction(transaction: Transaction) {
        this.transactions.push(transaction);
    }

    minePendingTransactions(minerRewardAddress: string) {
        const rewardTransaction = new Transaction(MINT_PUBLIC_ADDRESS, minerRewardAddress, this.reward);
        this.transactions.push(rewardTransaction);

        let block = new Block(this.transactions);
        block.mine(this.difficulty);

        this.chain.push(block);

        this.transactions = [];
    }

    getLastBlock() {
        return this.chain[this.chain.length - 1];
    }

    addBlock(newBlock: Block) {
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


class Transaction {
    constructor(
        public from: string,
        public to: string,
        public amount: number
    ) {
        this.from = from;
        this.to = to;
        this.amount = amount;
    }
}