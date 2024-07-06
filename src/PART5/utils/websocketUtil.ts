import WebSocket from 'ws';

type Message = {
    type: string;
    data: any;
};

export function connect(
    address: string,
    MY_ADDRESS: string,
    connected: string[],
    opened: { socket: WebSocket; address: string }[],
): void {
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
                !opened.find((node) => node.address === address) &&
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

export function produceMessage(type: string, data: any): Message {
    return {
        type,
        data,
    };
}

export function sendMessage(
    message: Message,
    opened: { socket: WebSocket; address: string }[],
): void {
    opened.forEach((node) => {
        node.socket.send(JSON.stringify(message));
    });
}
