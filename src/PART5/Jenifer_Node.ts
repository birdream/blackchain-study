import WebSocket from 'ws';

import { Block, NormanCoin, Transaction } from './blockchain';
import readline from 'readline';

import { connect, produceMessage, sendMessage } from './utils/websocketUtil';
import {
    isTransactionDuplicate,
    isTransactionIncluded,
} from './utils/blockchainUtil';

import { BOB_KEY, JENIFER_KEY, JOHN_KEY, MINER_KEY } from './keys';

const PORT = 3002;
const MY_ADDRESS = 'ws://localhost:3002';
const server = new WebSocket.Server({ port: PORT });

let opened: any[] = [];
let connected: any[] = [];

console.log('Jenifer listening on PORT ' + PORT);

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
                const [newBlock, newDiff]: [Block, number] = _message.data;

                if (
                    newBlock.blockHeader.previousHash !==
                        NormanCoin.getLastBlock().blockHeader.previousHash &&
                    NormanCoin.getLastBlock().hash ===
                        newBlock.blockHeader.previousHash &&
                    Block.hasValidTransactions(newBlock, NormanCoin)
                ) {
                    NormanCoin.chain.push(newBlock);
                    NormanCoin.difficulty = newDiff;
                    console.log(`New block added: ${newBlock.hash}`);
                    console.log(`New difficulty: ${newDiff}`);
                    console.log(
                        `Current chain length: ${NormanCoin.chain.length}`,
                    );
                }
                break;
            case 'TYPE_CREATE_TRANSACTION':
                const transaction = _message.data;
                console.log(transaction);
                if (!isTransactionDuplicate(transaction)) {
                    NormanCoin.addTransaction(transaction);
                    console.log(`New transaction added: ${transaction.hash}`);
                } else {
                    console.log(
                        `Transaction already exists: ${transaction.hash}`,
                    );
                }

                break;
            case 'TYPE_HANDSHAKE':
                const nodes = _message.data;
                nodes.forEach((node: any) =>
                    connect(node, MY_ADDRESS, connected, opened),
                );

            case 'TYPE_GET_BALANCE':
                const [address, publicKey] = _message.data;
                opened.forEach((node) => {
                    if (node.address === address) {
                        const balance =
                            NormanCoin.getBalanceOfAddress(publicKey);
                        node.socket.send(
                            JSON.stringify(
                                produceMessage('TYPE_GET_BALANCE_RESPONSE', [
                                    address,
                                    balance,
                                ]),
                            ),
                        );
                    }
                });
                break;
            case 'TYPE_VERIFY':
                const peer_address = _message.data[0];
                const isValid = NormanCoin.isValid();
                opened.forEach((node) => {
                    if (node.address === peer_address) {
                        node.socket.send(
                            JSON.stringify(
                                produceMessage('TYPE_VERIFY_RESPONSE', [
                                    isValid,
                                ]),
                            ),
                        );
                    }
                });
                break;
            default:
                break;
        }
    });

    // ws.on('close', () => {
    //     console.log('Client disconnected');
    // });
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'Enter a command:\n',
});

const ownerKey = JENIFER_KEY;
rl.on('line', (command) => {
    switch (command.toLocaleLowerCase()) {
        case 'send':
            const transaction = new Transaction(
                ownerKey.getPublic('hex'),
                BOB_KEY.getPublic('hex'),
                200,
                20, // gas
            );
            transaction.signTransaction(ownerKey);
            sendMessage(
                produceMessage('TYPE_CREATE_TRANSACTION', transaction),
                opened,
            );
            break;
        case 'bl':
        case 'balance':
            console.log(
                `Jenifer Your balance is: ${NormanCoin.getBalanceOfAddress(ownerKey.getPublic('hex'))}`,
            );

            break;

        case 'bc':
        case 'blockchain':
            console.log(JSON.stringify(NormanCoin.chain, null, 2));
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

process.on('uncaughtException', (err) => console.log(err));

// Broadcast transactions every 10 seconds
function broadcastTransaction(): void {
    NormanCoin.transactions.forEach((transaction, idx) => {
        if (isTransactionIncluded(transaction)) {
            NormanCoin.transactions.splice(idx, 1);
        } else {
            sendMessage(
                produceMessage('TYPE_CREATE_TRANSACTION', transaction),
                opened,
            );
        }
    });

    setTimeout(broadcastTransaction, 10000); // Broadcast to all connected nodes after a delay
}

broadcastTransaction();
