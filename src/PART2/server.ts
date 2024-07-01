import * as WebSocket from 'ws';

const server = new WebSocket.Server({ port: 8081 });

server.on('connection', (ws: WebSocket) => {
    console.log('Client connected');

    setInterval(() => {
        ws.send('Hello, client!');
    }, 1000);

    ws.on('message', (message: string) => {
        console.log(`Received message: ${message}`);
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});
