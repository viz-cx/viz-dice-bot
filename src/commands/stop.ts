import { Telegraf, Context } from "telegraf"

export function setupStop(bot: Telegraf<Context>) {
    bot.command(['stop'], async ctx => {
        const user = ctx.dbuser
        user.login = ""
        user.state = "waitLogin"
        await user.save()
        return ctx.replyWithHTML(ctx.i18n.t('wait_login'), {
            disable_web_page_preview: true
        })
    })
}
