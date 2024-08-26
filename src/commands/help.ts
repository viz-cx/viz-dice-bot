import { Telegraf, Context } from "telegraf"

export function setupHelp(bot: Telegraf<Context>) {
  bot.hears(new RegExp('🙋 .*'), ctx => {
    sendHelp(bot, ctx)
  })
  bot.command(['help'], ctx => {
    sendHelp(bot, ctx)
  })
}

function sendHelp(bot: Telegraf<Context>, ctx: Context) {
  const params = {
    botname: bot.options.username,
    minutes: process.env.MINUTES,
    encodedlogin: null
  }
  const login = ctx.dbuser.login
  if (login) {
    params['encodedlogin'] = Buffer.from(login, 'utf-8').toString('base64')
  }
  ctx.replyWithHTML(ctx.i18n.t('help', params), {disable_web_page_preview: true})
    .catch(err => {
      console.error('Failed to send help message:', err)
    })
  
}
