import { t } from "../helpers/i18n"
import { Bot, Keyboard } from "grammy"
import { BotContext } from "../types/context"
import { sendLanguageKeyboard } from "./language"

export function setupStart(bot: Bot<BotContext>) {
    bot.hears(/🔙 .*/, ctx => {
        sendMainKeyboard(bot, ctx)
    })

    bot.command('start', (ctx) => {
        sendLanguageKeyboard(ctx)
        const payload = ctx.match
        const referrer = Buffer.from(payload, 'base64').toString()
        const user = ctx.dbuser
        if (!user.referrer && referrer && user.login !== referrer) {
            ctx.viz.isAccountExists(referrer)
                .then(
                    result => {
                        if (result) {
                            user.referrer = referrer
                            user.save().catch(error => {
                              console.error('Failed to save user:', error);
                            })
                        } else {
                            console.log('Referrer', referrer, 'doesn\'t exists')
                        }
                    },
                    err => console.log('Referrer error', referrer, err)
                )
        }
    })
}

export function sendMainKeyboard(bot: Bot<BotContext>, ctx: BotContext) {
    const params = {
        botname: bot.botInfo.username,
        minutes: process.env.MINUTES,
        encodedlogin: null as string | null,
    }
    const login = ctx.dbuser.login
    if (login) {
        params.encodedlogin = Buffer.from(login, 'utf-8').toString('base64')
    }
    ctx.reply(ctx.i18n.t('help', params), {
        parse_mode: 'HTML',
        reply_markup: mainKeyboard(ctx),
        link_preview_options: { is_disabled: true }
    }).catch(error => {
      console.error('Failed to send main keyboard:', error);
    })
}

export function mainKeyboard(ctx: BotContext) {
    return mainKeyboardByLanguage(ctx.i18n.locale())
}

export function mainKeyboardByLanguage(language: string) {
    const play = '♟ ' + t(language, 'play_button')
    const game = '🎮 ' + t(language, 'game_button')
    const lang = '🌐 ' + t(language, 'language_button')
    const lottery = '🍀 ' + t(language, 'lottery_button')
    return new Keyboard([[play, game], [lang, lottery]]).resized()
}
