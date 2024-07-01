import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:8081');

ws.on('open', () => {
    console.log('Connected to server');
});

ws.on('message', (message: string) => {
    console.log(`Received message: ${message}`);
});

ws.on('close', () => {
    console.log('Disconnected from server');
});