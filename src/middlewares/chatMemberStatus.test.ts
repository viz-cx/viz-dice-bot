import { describe, it, expect, vi, afterEach } from 'vitest'
import { BotContext } from '../types/context'
import { trackBlockStatus } from './chatMemberStatus'
import * as UserModel from '../models/User'

function memberCtx(status: string): BotContext {
    return {
        chat: { id: 100, type: 'private' },
        myChatMember: {
            from: { id: 100 },
            new_chat_member: { status },
        },
    } as unknown as BotContext
}

describe('trackBlockStatus', () => {
    afterEach(() => vi.restoreAllMocks())

    it('marks the user inactive when they block the bot (kicked)', async () => {
        const setActive = vi.spyOn(UserModel, 'setUserActive').mockResolvedValue()
        const next = vi.fn().mockResolvedValue(undefined)
        await trackBlockStatus(memberCtx('kicked'), next)
        expect(setActive).toHaveBeenCalledWith(100, false)
        expect(next).not.toHaveBeenCalled()
    })

    it('marks the user active when they unblock the bot (member)', async () => {
        const setActive = vi.spyOn(UserModel, 'setUserActive').mockResolvedValue()
        const next = vi.fn().mockResolvedValue(undefined)
        await trackBlockStatus(memberCtx('member'), next)
        expect(setActive).toHaveBeenCalledWith(100, true)
        expect(next).not.toHaveBeenCalled()
    })

    it('passes non-my_chat_member updates through untouched', async () => {
        const setActive = vi.spyOn(UserModel, 'setUserActive').mockResolvedValue()
        const next = vi.fn().mockResolvedValue(undefined)
        const ctx = { chat: { id: 100, type: 'private' } } as unknown as BotContext
        await trackBlockStatus(ctx, next)
        expect(setActive).not.toHaveBeenCalled()
        expect(next).toHaveBeenCalledOnce()
    })
})
