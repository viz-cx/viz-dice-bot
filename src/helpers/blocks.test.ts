import { describe, it, expect, afterEach } from 'vitest'
import { BLOCK_INTERVAL, winnerBlockDelimiter, secondsUntilDraw } from './blocks'

const savedEnv = { ...process.env }
afterEach(() => {
    process.env = { ...savedEnv }
})

describe('blocks', () => {
    it('BLOCK_INTERVAL is 1 second (VIZ HF 4.4.0)', () => {
        expect(BLOCK_INTERVAL).toBe(1)
    })

    it('winnerBlockDelimiter is LOTTERY_HOURS of 1-second blocks in production', () => {
        process.env.PRODUCTION = 'true'
        process.env.LOTTERY_HOURS = '10'
        expect(winnerBlockDelimiter()).toBe(36000)
    })

    it('winnerBlockDelimiter is 50 when PRODUCTION=false', () => {
        process.env.PRODUCTION = 'false'
        process.env.LOTTERY_HOURS = '10'
        expect(winnerBlockDelimiter()).toBe(50)
    })

    it('secondsUntilDraw counts blocks to the next delimiter multiple', () => {
        process.env.PRODUCTION = 'true'
        process.env.LOTTERY_HOURS = '10'
        // 84965865 % 36000 = 5865 → 30135 blocks → 30135 s
        expect(secondsUntilDraw(84965865)).toBe(30135)
        // exactly on a draw block: a full round remains
        expect(secondsUntilDraw(84996000)).toBe(36000)
    })
})
