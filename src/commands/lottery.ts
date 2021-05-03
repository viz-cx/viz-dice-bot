import { getLatestLottery } from "../models/Lottery"
import { isParticipated } from "../models/Award"
import { Telegraf, Context } from "telegraf"

export function setupLottery(bot: Telegraf<Context>) {
    bot.command(['lottery'], async ctx => {
        getLatestLottery()
        .then(lottery => isParticipated(ctx.dbuser.login, lottery.block))
        .then(participated => {
            var params = {
                account: process.env.ACCOUNT,
                participated: participated,
                memo: ctx.dbuser.id,
                winnerBlockDelimiter: process.env.LOTTERY
            }
            ctx.replyWithHTML(ctx.i18n.t('lottery', params), { disable_web_page_preview: true })
        }, 
        _ => ctx.replyWithHTML(ctx.i18n.t('something_wrong')))
    })
}
