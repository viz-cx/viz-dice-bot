import { NextFunction } from 'grammy'
import { BotContext } from '../types/context'

export function checkTime(ctx: BotContext, next: NextFunction) {
  if (ctx.message) {
    if (new Date().getTime() / 1000 - ctx.message.date < 5 * 60) {
      next()
    } else {
      console.log(
        `Ignoring message from ${ctx.from.id} at ${
          ctx.chat.id
        } (${new Date().getTime() / 1000}:${ctx.message.date})`
      )
    }
  } else {
    next()
  }
}
