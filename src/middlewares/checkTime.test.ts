import { describe, it, expect, vi, afterEach } from 'vitest'
import { BotContext } from '../types/context'
import { checkTime } from './checkTime'
import * as drainBacklog from '../helpers/drainBacklog'

// A stale message: date is ~1 hour ago, well past the 5-minute cutoff.
function staleCtx(): BotContext {
    const nowSeconds = new Date().getTime() / 1000
    return {
        message: { date: nowSeconds - 3600 },
        from: { id: 100 },
        chat: { id: 100 },
    } as unknown as BotContext
}

describe('checkTime', () => {
    afterEach(() => vi.restoreAllMocks())

    it('drops a stale message when not replaying backlog', async () => {
        vi.spyOn(drainBacklog, 'isReplayingBacklog').mockReturnValue(false)
        const next = vi.fn().mockResolvedValue(undefined)
        await checkTime(staleCtx(), next)
        expect(next).not.toHaveBeenCalled()
    })

    it('passes a stale message through while replaying backlog', async () => {
        vi.spyOn(drainBacklog, 'isReplayingBacklog').mockReturnValue(true)
        const next = vi.fn().mockResolvedValue(undefined)
        await checkTime(staleCtx(), next)
        expect(next).toHaveBeenCalledOnce()
    })
})
