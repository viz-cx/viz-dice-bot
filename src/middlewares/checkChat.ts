import { Context } from 'telegraf'

export async function checkChatType(ctx: Context, next: () => any) {
    console.log(ctx.chat)
    next()
}
