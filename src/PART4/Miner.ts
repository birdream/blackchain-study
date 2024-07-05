import WebSocket from 'ws';

import { Block, NormanCoin, Transaction } from './blockchain';
import readline from 'readline';

import { MINER_KEY } from './keys';

const PORT = 3000;
const MY_ADDRESS = 'ws://localhost:3000';
const server = new WebSocket.Server({ port: PORT });

const PEERS = ['ws://localhost:3001', 'ws://localhost:3002'];

let opened: any[] = [];
let connected: any[] = [];

console.log('Miner listening on PORT ' + PORT);

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
                const [newBlock, newDiff] = _message.data;

                if (
                    newBlock.previousHash !==
                        NormanCoin.getLastBlock().previousHash &&
                    NormanCoin.getLastBlock().hash === newBlock.previousHash &&
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
                if (!isTransactionDuplicate(transaction)) {
                    NormanCoin.addTransaction(transaction);
                    console.log(`New transaction added: ${transaction}`);
                }

                break;
            case 'TYPE_HANDSHAKE':
                const nodes = _message.data;
                nodes.forEach((node: any) => connect(node));
            default:
                break;
        }
    });

    // ws.on('close', () => {
    //     console.log('Client disconnected');
    // });
});

function isTransactionDuplicate(transaction: Transaction): boolean {
    return NormanCoin.transactions.some(
        (tx) => JSON.stringify(tx) === JSON.stringify(transaction),
    );
}

function isTransactionIncluded(transaction: Transaction): boolean {
    return NormanCoin.chain.some((block) =>
        block.data.some(
            (tx) => JSON.stringify(tx) === JSON.stringify(transaction),
        ),
    );
}

// Broadcast transactions every 10 seconds
function broadcastTransaction(): void {
    NormanCoin.transactions.forEach((transaction, idx) => {
        if (isTransactionIncluded(transaction)) {
            NormanCoin.transactions.splice(idx, 1);
        } else {
            sendMessage(produceMessage('TYPE_CREATE_TRANSACTION', transaction));
        }
    });

    setTimeout(broadcastTransaction, 10000); // Broadcast to all connected nodes after a delay
}

broadcastTransaction();

function connect(address: string): void {
    if (
        !connected.find((peerAddress) => peerAddress === address) &&
        address !== MY_ADDRESS
    ) {
        const ws = new WebSocket(address);

        ws.on('open', () => {
            ws.send(
                JSON.stringify(
                    produceMessage('TYPE_HANDSHAKE', [
                        MY_ADDRESS,
                        ...connected,
                    ]),
                ),
            );

            opened.forEach((node) => {
                node.socket.send(
                    JSON.stringify(produceMessage('TYPE_HANDSHAKE', [address])),
                );
            });

            if (
                !opened.find((peerAddress) => peerAddress === address) &&
                address !== MY_ADDRESS
            ) {
                opened.push({ socket: ws, address });
                connected.push(address);
            }
        });

        ws.on('close', () => {
            // opened.slice(opened.indexOf(address), 1);
            let idx = opened.findIndex((node) => node.address === address);
            opened.splice(idx, 1);
            connected.slice(connected.indexOf(address), 1);
        });
    }
}

function produceMessage(type: string, data: any): Message {
    return {
        type,
        data,
    };
}

function sendMessage(message: Message) {
    opened.forEach((node) => {
        node.socket.send(JSON.stringify(message));
    });
}

PEERS.forEach((peer) => {
    connect(peer);
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'Enter a command:\n',
});

rl.on('line', (command) => {
    switch (command.toLocaleLowerCase()) {
        case 'mine':
            if (!NormanCoin.transactions.length) {
                console.log('No transactions to mine');
                break;
            }
            NormanCoin.minePendingTransactions(MINER_KEY.getPublic('hex'));
            sendMessage(
                produceMessage('TYPE_REPLACE_CHAIN', [
                    NormanCoin.getLastBlock(),
                    NormanCoin.difficulty,
                ]),
            );
            break;
        case 'bl':
        case 'balance':
            console.log(
                `Miner Your balance is: ${NormanCoin.getBalanceOfAddress(MINER_KEY.getPublic('hex'))}`,
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
