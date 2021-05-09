import { getLatestLottery } from "../models/Lottery"
import { getAwardsSum, getAllAwardsSum, isParticipated, participantsCount } from "../models/Award"
import { Telegraf, Context } from "telegraf"

export function setupLottery(bot: Telegraf<Context>) {
    bot.command(['lottery'], async ctx => {
        const latestLottery = getLatestLottery()
        const participated = latestLottery
            .then(lottery => isParticipated(ctx.dbuser.login, lottery.block))
        const userAwardsSum = latestLottery.then(l => getAwardsSum(ctx.dbuser.login, l.block))
        const allAwardsSum = latestLottery.then(l => getAllAwardsSum(l.block))
        const participants = latestLottery.then(l => participantsCount(l.block))
        Promise.all([
            participated,
            userAwardsSum,
            allAwardsSum,
            participants
        ]).then(
            result => {
                const participated = result[0]
                const userAwardsSum = result[1]
                const allAwardsSum = result[2]
                const participants = result[3]
                var params = {
                    account: process.env.ACCOUNT,
                    participated: participated,
                    memo: ctx.dbuser.id,
                    winnerBlockDelimiter: process.env.LOTTERY
                }
                if (participated) {
                    params["userAwardsSum"] = userAwardsSum[0]["sum"].toFixed(3),
                    params["allAwardsSum"] = allAwardsSum[0]["sum"].toFixed(3),
                    params["participants"] = participants
                    const maxParticipantPrize = params["userAwardsSum"] * params["participants"]
                    params["prize"] = (params["allAwardsSum"] > maxParticipantPrize) ? allAwardsSum : maxParticipantPrize
                }
                ctx.replyWithHTML(ctx.i18n.t('lottery', params), { disable_web_page_preview: true })
            },
            _ => ctx.replyWithHTML(ctx.i18n.t('something_wrong')))
    })
}
