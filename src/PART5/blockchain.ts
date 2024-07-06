import * as crypto from 'crypto';
const SHA256 = (msg: string): string =>
    crypto.createHash('sha256').update(msg).digest('hex');

import * as Merkle from './utils/merkleRootUtil';

import * as elliptic from 'elliptic';
const ec = new elliptic.ec('secp256k1');

const MINT_PRIVATE_ADDRESS =
    '0700a1ad28a20e5b2a517c00242d3e25a88d84bf54dce9e1733e6096e6d6495e';
const MINT_KEY_PAIR = ec.keyFromPrivate(MINT_PRIVATE_ADDRESS, 'hex');
const MINT_PUBLIC_ADDRESS = MINT_KEY_PAIR.getPublic('hex');

console.log('MINT_PUBLIC_ADDRESS:', MINT_PUBLIC_ADDRESS);
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
    data: any[];
    hash: string;
    transactionCount: number;
    blockSize: number;
    blockHeader: {
        nonce: number;
        previousHash: string;
        timestamp: number;
        difficulty: number;
        merkleRoot: any;
    };

    constructor(
        timestamp: number,
        data: any[],
        transactionCount: number,
        difficulty: number,
        merkleRoot: any,
    ) {
        this.data = data;
        this.blockHeader = {
            timestamp: timestamp,
            difficulty: difficulty,
            merkleRoot: merkleRoot,
            previousHash: '',
            nonce: 0,
        };
        this.transactionCount = transactionCount;
        this.blockSize = JSON.stringify(this).length;
        this.hash = Block.getHash(this.blockHeader);
    }

    static getHash(blockHeader: Block['blockHeader']): string {
        return SHA256(
            blockHeader.nonce +
                blockHeader.previousHash +
                blockHeader.timestamp +
                blockHeader.difficulty +
                blockHeader.merkleRoot,
        ).toString();
    }

    mine(difficulty: number) {
        while (
            this.hash.substring(0, difficulty) !==
            Array(difficulty + 1).join('0')
        ) {
            this.blockHeader.nonce++;
            this.hash = Block.getHash(this.blockHeader);
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
        this.difficulty = 2;
        this.blockTime = 5000; //5s
        this.transactions = [];
        this.reward = 10;

        const initialCoinRelease = new Transaction(
            MINT_PUBLIC_ADDRESS,
            JOHN_KEY.getPublic('hex'),
            10000,
        );
        this.chain = [
            new Block(0, [initialCoinRelease], 1, this.difficulty, '0'),
        ];
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
            new Block(
                Date.now(),
                [rewardTransaction, ...this.transactions],
                this.transactions.length + 1,
                this.difficulty,
                '0',
            ),
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
        newBlock.blockHeader.previousHash = this.getLastBlock().hash;
        newBlock.blockHeader.merkleRoot = Merkle.getMerkleRoot(newBlock);
        newBlock.mine(this.difficulty);
        this.chain.push(newBlock);

        this.difficulty +=
            Date.now() - newBlock.blockHeader.timestamp > this.blockTime
                ? -1
                : 1;
    }

    isValid() {
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];

            if (currentBlock.hash !== Block.getHash(currentBlock.blockHeader)) {
                console.log('Invalid hash: ' + currentBlock.hash);
                return false;
            }

            if (currentBlock.blockHeader.previousHash !== previousBlock.hash) {
                console.log(
                    'Invalid previous hash: ' +
                        currentBlock.blockHeader.previousHash,
                );
                return false;
            }

            if (!Block.hasValidTransactions(currentBlock, this)) {
                console.log('Invalid transactions in block: ' + i);
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
        // console.log('--------------Transaction Validation--------------');
        // console.log(
        //     chain.getBalanceOfAddress(tx.from) >= tx.amount + tx.gas ||
        //         tx.from === MINT_PUBLIC_ADDRESS,
        // );
        // console.log(chain.getBalanceOfAddress(tx.from) >= tx.amount + tx.gas);
        // console.log(tx.from === MINT_PUBLIC_ADDRESS);
        // console.log(tx.from);
        // console.log(MINT_PUBLIC_ADDRESS);
        // console.log(
        //     ec
        //         .keyFromPublic(tx.from, 'hex')
        //         .verify(
        //             SHA256(tx.from + tx.to + tx.amount + tx.gas),
        //             tx.signature,
        //         ),
        // );
        return (
            tx.from &&
            tx.to &&
            tx.amount &&
            // TODO this is not a correct way to check balance, need to fix it
            // because use the from current to check the block already there is not make sense
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
