import bot from './bot'
import { drainBacklog } from './helpers/drainBacklog'

async function main(): Promise<void> {
    await bot.init()
    try {
        await drainBacklog(bot)
    } catch (err) {
        // A failed drain must not keep the bot offline. The unread tail stays
        // unconfirmed but checkTime filters it on the live path, so no stale
        // command is double-processed.
        console.error('Backlog drain failed; starting anyway:', err)
    }
    await bot.start({
        onStart: (botInfo) => console.info(`Bot ${botInfo.username} is up and running`),
    })
}

void main()
