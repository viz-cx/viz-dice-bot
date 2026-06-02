import { Bot } from 'grammy'
import { Update } from 'grammy/types'
import { BotContext } from '../types/context'

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

// Set only while drainBacklog replays the captured backlog. checkTime reads
// this to bypass its 5-minute age filter for replayed (intentionally stale)
// messages.
let replaying = false

export function isReplayingBacklog(): boolean {
    return replaying
}

// Drains every pending update at startup, then replays just the last
// private-chat message per user through the full middleware chain. Fetching
// updates advances the offset server-side, so Telegram will not redeliver the
// backlog once this returns. Must run after bot.init() and before bot.start().
export async function drainBacklog(bot: Bot<BotContext>): Promise<void> {
    const updates: Update[] = []
    let offset: number | undefined = undefined
    for (;;) {
        const batch = await bot.api.getUpdates({ offset, limit: 100, timeout: 0 })
        if (batch.length === 0) {
            break
        }
        updates.push(...batch)
        offset = batch[batch.length - 1].update_id + 1
    }

    const selected = selectLastPerUser(updates)
    if (selected.length === 0) {
        return
    }

    replaying = true
    try {
        for (const update of selected) {
            try {
                await bot.handleUpdate(update)
            } catch (err) {
                console.error(
                    `Failed to replay backlog message from ${update.message?.from?.id}:`,
                    err
                )
            }
        }
    } finally {
        replaying = false
    }

    console.info(`Replayed ${selected.length} backlog message(s), one per user`)
}
