import { Block, BlockChain, NormanCoin, Transaction } from '../blockchain';

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

export function getLastBlockHash(chain: Block['blockHeader'][]) {
    const lastHeader = chain[chain.length - 1];

    return Block.getHash(lastHeader);
}

export function getLastTransaction(transactionHistory: any[]) {
    return transactionHistory[transactionHistory.length - 1];
}

export function getTransactionBlock(
    blockchain: BlockChain,
    from: string,
    to: string,
    amount: number,
    gas: number,
    timestamp: number,
    signature: string,
) {
    for (const block of blockchain.chain) {
        for (const transaction of block.data) {
            if (
                transaction.from === from &&
                transaction.to === to &&
                transaction.amount === amount &&
                transaction.gas === gas &&
                transaction.timestamp === timestamp &&
                transaction.signature === signature
            ) {
                return block;
            }
        }
    }
    return null;
}

export function isMerkleRootFound(
    chain: Block['blockHeader'][],
    merkleRoot: string,
): boolean {
    let found = false;
    chain.forEach((blockHeader) => {
        if (blockHeader.merkleRoot === merkleRoot) {
            found = true;
        }
    });
    return found;
}

export function is32bytesHexString(hex: string = '') {
    return hex.length === 64;
}

export function getSmartContract(blockchain: BlockChain, address: string) {
    for (const block of blockchain.chain) {
        for (const transaction of block.data) {
            if (transaction.data?.smartContractAddress === address) {
                return {
                    smartContract: transaction.data.smartContract,
                    deployBy: transaction.from,
                };
            }
        }
    }
    return { smartContract: null, deployBy: null };
}
