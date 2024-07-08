import { MerkleTree } from 'merkletreejs';

import { Block } from '../blockchain';

export function getMerkleRoot(block: Block): string {
    const leaves = block.data.map((tx) => Block.sha256(JSON.stringify(tx)));
    const tree = new MerkleTree(leaves, Block.sha256);
    const root = tree.getRoot().toString('hex');

    return root;
}

export function getMerkleProof(leaves: string[], transaction: any): any {
    const tree = new MerkleTree(leaves, Block.sha256);
    const proof = tree.getProof(Block.sha256(JSON.stringify(transaction)));
    return proof;
}

export function verifyTransaction(
    proof: any,
    leaves: string[],
    targetNode: any,
    merkleRoot: string,
): boolean {
    const tree = new MerkleTree(leaves, Block.sha256);
    const leaf = Block.sha256(JSON.stringify(targetNode));
    return tree.verify(proof, leaf, merkleRoot);
}
