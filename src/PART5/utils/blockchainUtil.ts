import { Block, BlockChain, NormanCoin, Transaction } from '../blockchain';
// import * as crypto from 'crypto';
// const SHA256 = (msg: string): string =>
//     crypto.createHash('sha256').update(msg).digest('hex');

export function isTransactionDuplicate(transaction: Transaction): boolean {
    return NormanCoin.transactions.some(
        (tx) => JSON.stringify(tx) === JSON.stringify(transaction),
    );
}

export function isTransactionIncluded(transaction: Transaction): boolean {
    return NormanCoin.chain.some((block) =>
        block.data.some(
            (tx) => JSON.stringify(tx) === JSON.stringify(transaction),
        ),
    );
}

// TODO chain type is any[] need to be fixed
export function getLastBlockHash(chain: any[]) {
    const lastHeader = chain[chain.length - 1];

    return Block.getHash(lastHeader);
}
