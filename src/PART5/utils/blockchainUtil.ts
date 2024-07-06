import { Block, NormanCoin, Transaction } from '../blockchain';

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
