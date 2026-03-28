import { NextFunction } from 'grammy'
import { BotContext } from '../types/context'

export function checkChatType(ctx: BotContext, next: NextFunction): void {
    if (ctx.chat && ctx.chat.type === 'private') {
        next()
    }
}
