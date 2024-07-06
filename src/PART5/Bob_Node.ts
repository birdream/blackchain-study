import WebSocket from 'ws';

import { Transaction } from './blockchain';
import readline from 'readline';

import { connect, produceMessage, sendMessage } from './utils/websocketUtil';

import { BOB_KEY, JENIFER_KEY, JOHN_KEY, MINER_KEY } from './keys';

const PORT = 3003;
const MY_ADDRESS = `ws://localhost:${PORT}`;
const server = new WebSocket.Server({ port: PORT });
const PEERS = ['ws://localhost:3002']; // only connect to Jenifer Node

let opened: any[] = [];
let connected: any[] = [];

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
            case 'TYPE_GET_BALANCE_RESPONSE':
                console.log(`Bob Your balance is: ${_message.data}`);
                break;
            case 'TYPE_VERIFY_RESPONSE':
                console.log(`Block verified: ${_message.data}`);
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

process.on('uncaughtException', (err) => console.log(err));
