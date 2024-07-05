import WebSocket from 'ws';

import { Block, NormanCoin, Transaction } from './blockchain';
import readline from 'readline';

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
            sendMessage(produceMessage('TYPE_CREATE_TRANSACTION', transaction));
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
