import { NextFunction } from 'grammy'
import { BotContext } from '../types/context'

export async function checkChatType(ctx: BotContext, next: NextFunction): Promise<void> {
    if (ctx.chat && ctx.chat.type === 'private') {
        await next()
    }
}
