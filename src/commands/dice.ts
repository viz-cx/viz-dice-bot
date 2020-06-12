// Dependencies
import { Telegraf, Context } from "telegraf";

export function setupDice(bot: Telegraf<Context>) {
  bot.command(['dice'], async ctx => {
    const result = await ctx.replyWithDice({ emoji: ctx.dbuser.game })
    const emoji = result.dice.emoji
    const value = result.dice.value
    switch (emoji) {
      case "🎲": case "🎯": // [1 - 6]
        ctx.reply(value.toString())
        break;
      case "🏀": // [1 - 5]
        ctx.reply(value.toString())
    }
  })
}
