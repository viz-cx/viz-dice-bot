// VIZ hardfork 4.4.0 changed CHAIN_BLOCK_INTERVAL from 3 to 1 second.
// Kept as a constant on purpose: it changed once in the chain's lifetime.
export const BLOCK_INTERVAL = 1 // seconds per block

// Winners are drawn whenever the block number is a multiple of this.
export function winnerBlockDelimiter(): number {
    if (process.env.PRODUCTION === 'false') {
        return 50
    }
    return parseInt(process.env.LOTTERY_HOURS) * 60 * 60 / BLOCK_INTERVAL
}

// Seconds from `block` until the next draw block (a multiple of the delimiter).
export function secondsUntilDraw(block: number): number {
    const delimiter = winnerBlockDelimiter()
    return (delimiter - block % delimiter) * BLOCK_INTERVAL
}
