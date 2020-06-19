import { Telegraf, Context } from "telegraf"

export function setupHelp(bot: Telegraf<Context>) {
  bot.command(['help'], ctx => {
    var params = {
      botname: bot.options.username,
      percent: process.env.PERCENT,
      encodedlogin: null
    }
    const login = ctx.dbuser.login
    if (login) {
      params['encodedlogin'] = Buffer.from(login, 'utf-8').toString('base64')
    }
    ctx.replyWithHTML(ctx.i18n.t('help', params))
  })
}
