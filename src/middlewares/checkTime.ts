import { NextFunction } from 'grammy'
import { BotContext } from '../types/context'

export async function checkTime(ctx: BotContext, next: NextFunction): Promise<void> {
  if (ctx.message) {
    if (new Date().getTime() / 1000 - ctx.message.date < 5 * 60) {
      await next()
    } else {
      console.log(
        `Ignoring message from ${ctx.from.id} at ${
          ctx.chat.id
        } (${new Date().getTime() / 1000}:${ctx.message.date})`
      )
    }
  } else {
    await next()
  }
}
