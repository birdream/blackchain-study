import { MerkleTree } from 'merkletreejs';
import * as crypto from 'crypto';
const SHA256 = (msg: string): string =>
    crypto.createHash('sha256').update(msg).digest('hex');

import { Block } from '../blockchain';

export function getMerkleRoot(block: Block): string {
    const leaves = block.data.map((tx) => SHA256(JSON.stringify(tx)));
    const tree = new MerkleTree(leaves, SHA256);
    const root = tree.getRoot().toString('hex');

    return root;
}
