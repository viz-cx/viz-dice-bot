import { Telegraf, Context } from "telegraf"

export function setupHelp(bot: Telegraf<Context>) {
  bot.start((ctx) => {
    ctx.replyWithHTML(ctx.i18n.t('help', { botname: bot.options.username, percent: process.env.PERCENT }))
    const referrer = (ctx as any)['startPayload']
    var user = ctx.dbuser
    if (!user.referrer && referrer) {
      isAccountExists(ctx.viz, referrer)
        .then(
          result => {
            if (result) {
              user.referrer = referrer
              user.save()
            } else {
              console.log('Refereer', referrer, 'doesn\'t exists')
            }
          },
          err => console.log('Referrer error', referrer, err)
        )
    }
  })
  bot.command(['help'], ctx => {
    ctx.replyWithHTML(ctx.i18n.t('help', { botname: bot.options.username, percent: process.env.PERCENT }))
  })
}

function isAccountExists(viz: any, login: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    viz.api.getAccounts([login], function (err, result) {
      if (err) {
        reject(err)
        return
      }
      resolve(result.length > 0)
    })
  })
}
