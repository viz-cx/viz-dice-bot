import { Telegraf, Context } from "telegraf"
import { sendLanguageKeyboard } from "./language"

export function setupStart(bot: Telegraf<Context>) {
    bot.start((ctx) => {
        sendLanguageKeyboard(ctx)
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
