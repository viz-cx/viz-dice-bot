import { Bot } from "grammy"
import { BotContext } from "../types/context"

export function setupHelp(bot: Bot<BotContext>) {
  bot.hears(/🙋 .*/, ctx => {
    sendHelp(bot, ctx)
  })
  bot.command('help', ctx => {
    sendHelp(bot, ctx)
  })
}

function sendHelp(bot: Bot<BotContext>, ctx: BotContext) {
  const params = {
    botname: bot.botInfo.username,
    minutes: process.env.MINUTES,
    encodedlogin: null as string | null
  }
  const login = ctx.dbuser.login
  if (login) {
    params.encodedlogin = Buffer.from(login, 'utf-8').toString('base64')
  }
  ctx.reply(ctx.i18n.t('help', params), {
    parse_mode: 'HTML',
    link_preview_options: { is_disabled: true }
  }).catch(err => {
      console.error('Failed to send help message:', err)
    })
}
