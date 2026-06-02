import { describe, it, expect } from 'vitest'
import { Update } from 'grammy/types'
import { selectLastPerUser } from './drainBacklog'

// Minimal private-chat message update builder for tests.
function msgUpdate(updateId: number, fromId: number, text = 'hi'): Update {
    return {
        update_id: updateId,
        message: {
            message_id: updateId,
            date: 1000 + updateId,
            text,
            from: { id: fromId, is_bot: false, first_name: 'U' + fromId },
            chat: { id: fromId, type: 'private', first_name: 'U' + fromId },
        },
    } as unknown as Update
}

describe('selectLastPerUser', () => {
    it('keeps only the highest update_id per user', () => {
        const result = selectLastPerUser([
            msgUpdate(1, 100),
            msgUpdate(2, 100),
            msgUpdate(3, 100),
        ])
        expect(result).toHaveLength(1)
        expect(result[0].update_id).toBe(3)
    })

    it('returns one update per user, sorted ascending by update_id', () => {
        const result = selectLastPerUser([
            msgUpdate(1, 100),
            msgUpdate(2, 200),
            msgUpdate(3, 100),
            msgUpdate(4, 300),
        ])
        expect(result.map((u) => u.update_id)).toEqual([2, 3, 4])
        expect(result.map((u) => u.message?.from?.id)).toEqual([200, 100, 300])
    })

    it('excludes non-message updates', () => {
        const callbackUpdate = {
            update_id: 5,
            callback_query: { id: 'cb', from: { id: 100, is_bot: false, first_name: 'U' } },
        } as unknown as Update
        const result = selectLastPerUser([callbackUpdate])
        expect(result).toHaveLength(0)
    })

    it('excludes non-private messages', () => {
        const groupUpdate = {
            update_id: 6,
            message: {
                message_id: 6,
                date: 1006,
                text: 'hi',
                from: { id: 100, is_bot: false, first_name: 'U' },
                chat: { id: -500, type: 'group', title: 'G' },
            },
        } as unknown as Update
        const result = selectLastPerUser([groupUpdate])
        expect(result).toHaveLength(0)
    })

    it('excludes messages without a sender', () => {
        const noFrom = {
            update_id: 7,
            message: {
                message_id: 7,
                date: 1007,
                text: 'hi',
                chat: { id: 100, type: 'private', first_name: 'U' },
            },
        } as unknown as Update
        expect(() => selectLastPerUser([noFrom])).not.toThrow()
        expect(selectLastPerUser([noFrom])).toHaveLength(0)
    })

    it('returns empty for empty input', () => {
        expect(selectLastPerUser([])).toEqual([])
    })
})
