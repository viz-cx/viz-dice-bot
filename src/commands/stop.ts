import { Telegraf, Context } from "telegraf"

export function setupStop(bot: Telegraf<Context>) {
    bot.command(['stop'], async ctx => {
        var user = ctx.dbuser
        user.login = ""
        ctx.dbuser.state = "waitLogin"
        ctx.dbuser.save()
        ctx.replyWithHTML(ctx.i18n.t('wait_login'), {
            disable_web_page_preview: true
        })
        return
    })
}
