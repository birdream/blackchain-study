import WebSocket from 'ws';

import { Block, NormanCoin, Transaction } from './blockchain';
import readline from 'readline';

import { BOB_KEY, JENIFER_KEY, JOHN_KEY, MINER_KEY } from './keys';

const PORT = 3001;
const MY_ADDRESS = 'ws://localhost:3001';
const server = new WebSocket.Server({ port: PORT });

let opened: any[] = [];
let connected: any[] = [];

console.log('John listening on PORT ' + PORT);

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
                console.log('Received new chain from peer');
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
                } else {
                    console.log('Invalid block received');
                }

                break;
            case 'TYPE_CREATE_TRANSACTION':
                const transaction = _message.data;
                if (!isTransactionDuplicate(transaction)) {
                    NormanCoin.addTransaction(transaction);
                    console.log(`New transaction added: ${transaction.hash}`);
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

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'Enter a command:\n',
});

const ownerKey = JOHN_KEY;
rl.on('line', (command) => {
    switch (command.toLocaleLowerCase()) {
        case 'gk':
            console.log('MINER: ' + MINER_KEY.getPublic('hex'));
            console.log('JOHN: ' + ownerKey.getPublic('hex'));
            console.log('JENIFER: ' + JENIFER_KEY.getPublic('hex'));
            console.log('BOB: ' + BOB_KEY.getPrivate('hex'));
            console.log('--------------');

            break;
        case 'send':
            const transaction = new Transaction(
                ownerKey.getPublic('hex'),
                JENIFER_KEY.getPublic('hex'),
                500,
                15, // gas
            );
            transaction.signTransaction(ownerKey);
            sendMessage(produceMessage('TYPE_CREATE_TRANSACTION', transaction));
            console.log(`Transaction sent: ${transaction?.signature}`);
            break;
        case 'bl':
        case 'balance':
            console.log(
                `John Your balance is: ${NormanCoin.getBalanceOfAddress(ownerKey.getPublic('hex'))}`,
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

process.on('uncaughtException', (err) => console.log(err));
