import { Telegraf, Context } from "telegraf"

export function setupAuth(bot: Telegraf<Context>) {
    bot.command(['auth'], ctx => {
        const user = ctx.dbuser
        user.login = ''
        user.postingKey = ''
        user.state = 'waitLogin'
        user.save()
        ctx.replyWithHTML(ctx.i18n.t('wait_login'))
    })
}
