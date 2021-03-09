import { Context } from 'telegraf'

export async function checkChatType(ctx: Context, next: () => any) {
    if (ctx.chat !== undefined || ctx.chat.type === 'private') {
        next()
    }
}
