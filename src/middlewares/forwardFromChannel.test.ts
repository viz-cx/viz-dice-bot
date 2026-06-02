import { describe, it, expect, vi, afterEach } from 'vitest'
import { BotContext } from '../types/context'
import * as drainBacklog from '../helpers/drainBacklog'
import { checkForward } from './forwardFromChannel'
import { getUsersByLang } from '../models/User'

vi.mock('../models/User', () => ({
    getUsersByLang: vi.fn().mockResolvedValue([]),
}))

vi.mock('../helpers/bot', () => ({
    bot: {
        api: {
            forwardMessage: vi.fn().mockResolvedValue(undefined),
            sendMessage: vi.fn().mockResolvedValue(undefined),
        },
    },
}))

function ownerChannelForwardCtx(): BotContext {
    return {
        chat: { id: 38968897 },
        message: {
            forward_origin: {
                type: 'channel',
                chat: { id: -1001277359853 },
                message_id: 5,
            },
        },
    } as unknown as BotContext
}

describe('checkForward', () => {
    afterEach(() => vi.restoreAllMocks())

    it('does NOT broadcast and calls next() when replaying backlog', async () => {
        vi.spyOn(drainBacklog, 'isReplayingBacklog').mockReturnValue(true)
        const next = vi.fn().mockResolvedValue(undefined)
        const getUsersByLangMock = vi.mocked(getUsersByLang)

        await checkForward(ownerChannelForwardCtx(), next)

        expect(next).toHaveBeenCalledOnce()
        expect(getUsersByLangMock).not.toHaveBeenCalled()
    })

    it('DOES broadcast and does NOT call next() when not replaying', async () => {
        vi.spyOn(drainBacklog, 'isReplayingBacklog').mockReturnValue(false)
        vi.mocked(getUsersByLang).mockResolvedValue([])
        const next = vi.fn().mockResolvedValue(undefined)

        await checkForward(ownerChannelForwardCtx(), next)

        expect(getUsersByLang).toHaveBeenCalled()
        expect(next).not.toHaveBeenCalled()
    })
})
