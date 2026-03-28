import { getUsersCount } from "../models"
import { Bot } from "grammy"
import { BotContext } from "../types/context"

export function setupStats(bot: Bot<BotContext>) {
    bot.command(['stats', 'stat'], async ctx => {
       await sendStats(ctx)
    })
}

async function sendStats(ctx: BotContext) {
    const start = new Date(0)
    const prevMonth = new Date()
    prevMonth.setDate(1)
    prevMonth.setMonth(prevMonth.getMonth()-1)

    try {
        const results = await Promise.all([
            getUsersCount(start),
            getUsersCount(prevMonth)
        ])
        const params = {
            'all': results[0],
            'month': results[1]
        }
        await ctx.reply(ctx.i18n.t('stats', params), { parse_mode: 'HTML' })
    } catch (error) {
        console.error('Failed to send stats:', error)
    }
}
