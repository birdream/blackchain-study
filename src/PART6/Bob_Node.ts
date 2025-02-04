import WebSocket from 'ws';

import { Block, NormanCoin, Transaction } from './blockchain';
import readline from 'readline';

import { connect, produceMessage, sendMessage } from './utils/websocketUtil';
import {
    getLastBlockHash,
    getLastTransaction,
    isMerkleRootFound,
} from './utils/blockchainUtil';
import * as Merkle from './utils/merkleRootUtil';

import { BOB_KEY, JENIFER_KEY, JOHN_KEY, MINER_KEY } from './keys';

const PORT = 3003;
const MY_ADDRESS = `ws://localhost:${PORT}`;
const server = new WebSocket.Server({ port: PORT });
const PEERS = ['ws://localhost:3002']; // only connect to Jenifer Node

let opened: any[] = [];
let connected: any[] = [];

let chain: Block['blockHeader'][] = [];
let transactionHistory: any[] = [];

console.log('Bob listening on PORT ' + PORT);

type Message = {
    type: string;
    data: any;
};
server.on('connection', (ws: WebSocket) => {
    // console.log('Client connected')

    ws.on('message', (message: string) => {
        const _message: Message = JSON.parse(message);
        console.log(`Received message:`);
        console.log(_message);

        switch (_message.type) {
            case 'TYPE_REPLACE_CHAIN':
                if (
                    _message.data[0].blockHeader.previousHash ===
                        getLastBlockHash(chain) &&
                    _message.data[0].transactionCount >= 1 &&
                    _message.data[0].blockHeader.timestamp >
                        chain[chain.length - 1].timestamp
                ) {
                    chain.push(_message.data[0].blockHeader);
                    console.log('Chain replaced');
                } else {
                    console.log('Invalid chain');
                }
                break;
            case 'TYPE_GET_BALANCE_RESPONSE':
                console.log(`Bob Your balance is: ${_message.data}`);
                break;
            case 'TYPE_VERIFY_RESPONSE':
                console.log(`Block verified: ${_message.data}`);
                break;

            case 'VERIFY_TRANSACTION':
                const { merkleRoot, proof, leaves } = _message.data;
                // console.log('Merkle Root:', merkleRoot);
                // console.log('Proof:', proof);
                // console.log('Leaves:', leaves);

                const validProof = [
                    {
                        position: proof[0].position,
                        data: Buffer.from(proof[0].data),
                    },
                ];
                if (isMerkleRootFound(chain, merkleRoot)) {
                    const isTransactionIncluded = Merkle.verifyTransaction(
                        validProof,
                        leaves,
                        getLastTransaction(transactionHistory),
                        merkleRoot,
                    );
                    console.log(
                        'Is Transaction Included:',
                        isTransactionIncluded,
                    );
                } else {
                    console.log('MerkleRoot Not Found');
                }
                break;
            default:
                break;
        }
    });

    // ws.on('close', () => {
    //     console.log('Client disconnected');
    // });
});

// function isTransactionDuplicate(transaction: Transaction): boolean {
//     return NormanCoin.transactions.some(
//         (tx) => JSON.stringify(tx) === JSON.stringify(transaction),
//     );
// }

PEERS.forEach((peer) => {
    connect(peer, MY_ADDRESS, connected, opened);
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'Enter a command:\n',
});

const ownerKey = BOB_KEY;
rl.on('line', (command) => {
    switch (command.toLocaleLowerCase()) {
        case 'send':
            const transaction = new Transaction(
                ownerKey.getPublic('hex'),
                JOHN_KEY.getPublic('hex'),
                51,
                2, // gas
                Date.now(),
            );
            transaction.signTransaction(ownerKey);
            transactionHistory.push(transaction);

            sendMessage(
                produceMessage('TYPE_CREATE_TRANSACTION', transaction),
                opened,
            );

            console.log(`Transaction sent: ${transaction?.signature}`);
            break;
        case 'bl':
        case 'balance':
            sendMessage(
                produceMessage('TYPE_GET_BALANCE', [
                    MY_ADDRESS,
                    ownerKey.getPublic('hex'),
                ]),
                opened,
            );
            break;
        case 'tsv':
        case 'transaction_verify':
            const transactionToVerify = getLastTransaction(transactionHistory);
            sendMessage(
                produceMessage('VERIFY_TRANSACTION', {
                    transaction: transactionToVerify,
                    address: MY_ADDRESS,
                }),
                opened,
            );
            break;
        case 'ch':
        case 'chain':
            console.log(chain);
            break;
        case 'verify':
            sendMessage(produceMessage('TYPE_VERIFY', [MY_ADDRESS]), opened);
            break;
        case 'clear':
            console.clear();
            break;
        default:
            console.log('Invalid command');
            break;
    }
}).on('close', () => {
    console.log('Exiting...');
    process.exit(0);
});

chain.push(NormanCoin.chain[0].blockHeader);

process.on('uncaughtException', (err) => console.log(err));
