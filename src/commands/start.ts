import { i18n } from "../helpers/i18n"
import { Telegraf, Context, Markup as m } from "telegraf"
import { sendLanguageKeyboard } from "./language"

export function setupStart(bot: Telegraf<Context>) {
    bot.hears(new RegExp('🔙 .*'), async ctx => {
        sendMainKeyboard(bot, ctx)
    })

    bot.start((ctx) => {
        sendLanguageKeyboard(ctx)
        const payload = (ctx as any)['startPayload']
        const referrer = Buffer.from(payload, 'base64').toString()
        let user = ctx.dbuser
        if (!user.referrer && referrer && user.login !== referrer) {
            ctx.viz.isAccountExists(referrer)
                .then(
                    result => {
                        if (result) {
                            user.referrer = referrer
                            user.save()
                        } else {
                            console.log('Referrer', referrer, 'doesn\'t exists')
                        }
                    },
                    err => console.log('Referrer error', referrer, err)
                )
        }
    })
}

export function sendMainKeyboard(bot: Telegraf<Context>, ctx: Context) {
    const params = {
        botname: bot.options.username,
        minutes: process.env.MINUTES,
        encodedlogin: null,
    }
    const login = ctx.dbuser.login
    if (login) {
        params['encodedlogin'] = Buffer.from(login, 'utf-8').toString('base64')
    }
    ctx.replyWithHTML(ctx.i18n.t('help', params), {
        reply_markup: mainKeyboard(ctx),
        disable_web_page_preview: true
    })
}

export function mainKeyboard(ctx: Context) {
    return mainKeyboardByLanguage(ctx.i18n.locale())
}

export function mainKeyboardByLanguage(language: string) {
    const play = m.callbackButton('♟ ' + i18n.t(language, 'play_button'), 'play')
    const game = m.callbackButton('🎮 ' + i18n.t(language, 'game_button'), 'game')
    const lang = m.callbackButton('🌐 ' + i18n.t(language, 'language_button'), 'language')
    const lottery = m.callbackButton('🍀 ' + i18n.t(language, 'lottery_button'), 'lottery')
    return m.keyboard([[play, game], [lang, lottery]]).resize()
}
