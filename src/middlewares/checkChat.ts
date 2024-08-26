import { Context } from 'telegraf'

export function checkChatType(ctx: Context, next: () => unknown): void {
    if (ctx.chat && ctx.chat.type === 'private') {
        next()
    }
}
