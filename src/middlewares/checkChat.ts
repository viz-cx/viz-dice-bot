import { Context } from 'telegraf'

export async function checkChatType(ctx: Context, next: () => any) {
    if (ctx.chat !== null && ctx.chat.type === 'private') {
        next()
    } else {
        console.log(ctx)
        return
    }
}
