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
        var user = ctx.dbuser
        if (!user.referrer && referrer) {
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
    var params = {
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
    const play = m.callbackButton('♟ ' + ctx.i18n.t('play_button'), 'play')
    const game = m.callbackButton('🎮 ' + ctx.i18n.t('game_button'), 'game')
    const lang = m.callbackButton('🌐 ' + ctx.i18n.t('language_button'), 'language')
    const lottery = m.callbackButton('🍀 ' + ctx.i18n.t('lottery_button'), 'lottery')
    return m.keyboard([[play, game], [lang, lottery]]).resize()
}
