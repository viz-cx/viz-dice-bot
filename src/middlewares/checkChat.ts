import { Context } from 'telegraf'

export async function checkChatType(ctx: Context, next: () => any) {
    if (ctx.chat && ctx.chat.type === 'private') {
        return next()
    }
}
