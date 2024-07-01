import WebSocket from 'ws';

const PORT = 3000;
const MY_ADDRESS = 'ws://localhost:3000';
const server = new WebSocket.Server({ port: PORT });

const PEERS = ['ws://localhost:3001', 'ws://localhost:3002']

let opened: any[] = [];
let connected: any[] = [] ;

console.log('Miner listening on PORT ' + PORT);

type Message = {
    type: string,
    data: any
}
server.on('connection', (ws: WebSocket) => {
    // console.log('Client connected')

    ws.on('message', (message: string) => {
        const _message: Message = JSON.parse(message);
        console.log(`Received message: ${message}`);

        switch(_message.type) {
            case "TYPE_HANDSHAKE":
                const nodes = _message.data;
                nodes.forEach((node: any) => connect(node));
            default:
                break
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

function connect(address: string): void {
    if (!connected.find((peerAddress) => peerAddress === address) && address !== MY_ADDRESS) {
        const ws = new WebSocket(address);

        ws.on('open', () => {
            ws.send(JSON.stringify(produceMessage('TYPE_HANDSHAKE', [MY_ADDRESS, ...connected])));

            opened.forEach((node) => {
                node.socket.send(JSON.stringify(produceMessage('TYPE_HANDSHAKE', [address])));
            });

            if (!opened.find((peerAddress) => peerAddress === address) && address !== MY_ADDRESS) {
                opened.push({ socket: ws, address});
                connected.push(address);
            }
        });

        ws.on('close', () => {
            // opened.slice(opened.indexOf(address), 1);
            connected.slice(connected.indexOf(address), 1);
        });
    }   
}

function produceMessage(type: string, data: any): Message {
    return {
        type,
        data
    }
}

function sendMessage(message: Message) {
    opened.forEach((node) => {
        node.socket.send(JSON.stringify(message));
    });
}


PEERS.forEach((peer) => {
    connect(peer);
});

setTimeout(() => {
    sendMessage(produceMessage('MESSAGE', ['HELLO FROM MINER!']))
}, 5000)

process.on("uncaughtException", err => console.log(err));