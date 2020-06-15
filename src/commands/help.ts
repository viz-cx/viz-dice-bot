import { Telegraf, Context } from "telegraf"

export function setupHelp(bot: Telegraf<Context>) {
  bot.command(['help', 'start'], ctx => {
    ctx.replyWithHTML(ctx.i18n.t('help', { botname: bot.options.username, percent: process.env.PERCENT }))
  })
}
