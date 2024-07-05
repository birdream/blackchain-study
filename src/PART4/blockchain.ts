import * as crypto from 'crypto';
const SHA256 = (msg: string): string =>
    crypto.createHash('sha256').update(msg).digest('hex');

import * as elliptic from 'elliptic';
const ec = new elliptic.ec('secp256k1');

const MINT_PRIVATE_ADDRESS =
    '0700a1ad28a20e5b2a517c00242d3e25a88d84bf54dce9e1733e6096e6d6495e';
const MINT_KEY_PAIR = ec.keyFromPrivate(MINT_PRIVATE_ADDRESS, 'hex');
const MINT_PUBLIC_ADDRESS = MINT_KEY_PAIR.getPublic('hex');

import { JOHN_KEY, JENIFER_KEY, MINER_KEY, BOB_KEY } from './keys';
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

// const JOHN_WALLET = ec.genKeyPair();
// const JENIFER_WALLET = ec.genKeyPair();
// const MINER_WALLET = ec.genKeyPair();
// const BOB_WALLET = ec.genKeyPair();

class Block {
    timestamp: string;
    data: any[];
    hash: string;
    previousHash: string;
    nonce: number;

    constructor(timestamp: string, data: any[]) {
        this.timestamp = timestamp;
        this.data = data;
        this.hash = Block.getHash(this);
        this.previousHash = '';
        this.nonce = 0;
    }

    static getHash(block: Block) {
        return SHA256(
            block.timestamp +
                JSON.stringify(block.data) +
                block.previousHash +
                block.nonce,
        ).toString();
    }

    mine(difficulty: number) {
        while (
            this.hash.substring(0, difficulty) !==
            Array(difficulty + 1).join('0')
        ) {
            this.nonce++;
            this.hash = Block.getHash(this);
        }
        console.log('Block mined: ' + this.hash);
    }

    static hasValidTransactions(block: Block, chain: BlockChain) {
        return block.data.every((tx: Transaction) =>
            Transaction.isValid(tx, chain),
        );
    }
}

class BlockChain {
    chain: Block[];
    difficulty: number;
    blockTime: number;
    transactions: any[];
    reward: number;

    constructor() {
        const initialCoinRelease = new Transaction(
            MINT_PUBLIC_ADDRESS,
            JOHN_KEY.getPublic('hex'),
            1000,
        );
        this.chain = [new Block('', [initialCoinRelease])];
        this.difficulty = 2;
        this.blockTime = 5000; //5s
        this.transactions = [];
        this.reward = 10;
    }

    addTransaction(transaction: Transaction) {
        if (
            transaction.from &&
            transaction.to &&
            transaction.amount &&
            Transaction.isValid(transaction, this)
        ) {
            this.transactions.push(transaction);
        }
    }

    minePendingTransactions(minerRewardAddress: string) {
        if (this.transactions.length === 0) {
            console.log('minePendingTransactions No transactions to mine.');
            return;
        }
        let gas = 0;
        this.transactions.forEach((tx: Transaction) => {
            gas += tx.gas;
        });

        const rewardTransaction = new Transaction(
            MINT_PUBLIC_ADDRESS,
            minerRewardAddress,
            this.reward + gas,
        );
        rewardTransaction.signTransaction(MINT_KEY_PAIR);

        this.addBlock(
            new Block(Date.now().toString(), [
                rewardTransaction,
                ...this.transactions,
            ]),
        );

        this.transactions = [];
    }

    getBalanceOfAddress(address: string) {
        let balance = 0;

        for (const block of this.chain) {
            if (block.data) {
                for (const transaction of block.data) {
                    if (transaction.from === address) {
                        balance -= transaction.amount;
                        balance -= transaction.gas;
                    }

                    if (transaction.to === address) {
                        balance += transaction.amount;
                    }
                }
            }
        }

        return balance;
    }

    getLastBlock() {
        return this.chain[this.chain.length - 1];
    }

    addBlock(newBlock: Block) {
        newBlock.previousHash = this.getLastBlock().hash;
        newBlock.mine(this.difficulty);
        this.chain.push(newBlock);

        this.difficulty +=
            Date.now() - Number(newBlock.timestamp) > this.blockTime ? -1 : 1;
    }

    isValid() {
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];

            if (currentBlock.hash !== Block.getHash(currentBlock)) {
                return false;
            }

            if (currentBlock.previousHash !== previousBlock.hash) {
                return false;
            }

            if (!Block.hasValidTransactions(currentBlock, this)) {
                return false;
            }
        }

        return true;
    }
}

class Transaction {
    signature: string; // elliptic.ec.Signature

    constructor(
        public from: string,
        public to: string,
        public amount: number,
        public gas: number = 0,
    ) {
        this.from = from;
        this.to = to;
        this.amount = amount;
        this.signature = '';
        this.gas = gas;
    }

    // Sign the transaction with the given key
    signTransaction(signingKey: elliptic.ec.KeyPair) {
        if (signingKey.getPublic('hex') !== this.from) {
            throw new Error('You cannot sign transactions for other wallets!');
        }

        const hashTx = SHA256(this.from + this.to + this.amount + this.gas);
        const sig = signingKey.sign(hashTx, 'base64');
        this.signature = sig.toDER('hex');
    }

    static isValid(tx: Transaction, chain: BlockChain) {
        return (
            tx.from &&
            tx.to &&
            tx.amount &&
            (chain.getBalanceOfAddress(tx.from) >= tx.amount + tx.gas ||
                tx.from === MINT_PUBLIC_ADDRESS) &&
            ec
                .keyFromPublic(tx.from, 'hex')
                .verify(
                    SHA256(tx.from + tx.to + tx.amount + tx.gas),
                    tx.signature,
                )
        );
    }
}

const NormanCoin = new BlockChain();

export { NormanCoin, BlockChain, Block, Transaction };
// const transaction1 = new Transaction(JOHN_WALLET.getPublic('hex'), JENIFER_WALLET.getPublic('hex'), 200, 5);
// transaction1.signTransaction(JOHN_WALLET);
// NormanCoin.addTransaction(transaction1);
// NormanCoin.minePendingTransactions(MINER_WALLET.getPublic('hex'));

// const transaction2 = new Transaction(JENIFER_WALLET.getPublic('hex'), BOB_WALLET.getPublic('hex'), 100, 5);
// transaction2.signTransaction(JENIFER_WALLET);
// NormanCoin.addTransaction(transaction2);
// NormanCoin.minePendingTransactions(MINER_WALLET.getPublic('hex'));

// console.dir(NormanCoin.chain, { depth: null });
// console.log('Balance of John is', NormanCoin.getBalanceOfAddress(JOHN_WALLET.getPublic('hex')));
// console.log('Balance of Jenifer is', NormanCoin.getBalanceOfAddress(JENIFER_WALLET.getPublic('hex')));
// console.log('Balance of Bob is', NormanCoin.getBalanceOfAddress(BOB_WALLET.getPublic('hex')));
// console.log('Balance of Miner is', NormanCoin.getBalanceOfAddress(MINER_WALLET.getPublic('hex')));
// console.log('Balance of MINT is', NormanCoin.getBalanceOfAddress(MINT_PUBLIC_ADDRESS));
