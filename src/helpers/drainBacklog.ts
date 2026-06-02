import { Update } from 'grammy/types'

// Returns the last private-chat message update per sender (highest update_id
// wins), sorted ascending by update_id so replay preserves chronological order.
export function selectLastPerUser(updates: Update[]): Update[] {
    const lastByUser = new Map<number, Update>()
    for (const update of updates) {
        const message = update.message
        if (message?.from && message.chat.type === 'private') {
            const existing = lastByUser.get(message.from.id)
            if (!existing || update.update_id > existing.update_id) {
                lastByUser.set(message.from.id, update)
            }
        }
    }
    return [...lastByUser.values()].sort((a, b) => a.update_id - b.update_id)
}
