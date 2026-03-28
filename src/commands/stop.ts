import { Bot } from "grammy"
import { BotContext } from "../types/context"

export function setupStop(bot: Bot<BotContext>) {
    bot.command('stop', async ctx => {
        const user = ctx.dbuser
        user.login = ""
        user.state = "waitLogin"
        await user.save()
        return ctx.reply(ctx.i18n.t('wait_login'), {
            parse_mode: 'HTML',
            link_preview_options: { is_disabled: true }
        })
    })
}
