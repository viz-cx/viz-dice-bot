import { getLatestLottery } from "../models/Lottery"
import { getAwardsSum, getAllAwardsSum, isParticipated, participantsCount } from "../models/Award"
import { Telegraf, Context } from "telegraf"
import { findUser } from "../models/User"

export function setupLottery(bot: Telegraf<Context>) {
    bot.hears(new RegExp('🍀 .*'), async ctx => {
        sendLottery(bot, ctx)
    })
    bot.command(['lottery'], async ctx => {
        sendLottery(bot, ctx)
    })
}

function sendLottery(bot: Telegraf<Context>, ctx: Context) {
    const latestLottery = getLatestLottery()
    const participated = latestLottery
        .then(lottery => isParticipated(ctx.dbuser.login, lottery.block))
    const userAwardsSum = latestLottery.then(l => getAwardsSum(ctx.dbuser.login, l.block))
    const allAwardsSum = latestLottery.then(l => getAllAwardsSum(l.block))
    const participants = latestLottery.then(l => participantsCount(l.block))
    const account = findUser(ctx.dbuser.id).then(user => ctx.viz.getAccount(user.login))
    Promise.all([
        participated,
        userAwardsSum,
        allAwardsSum,
        participants,
        account
    ]).then(
        result => {
            const participated = result[0]
            const userAwardsSum = result[1]
            const allAwardsSum = result[2]
            const participantCount = result[3]
            const vizAccount = result[4]
            var energy = 10
            if (vizAccount) {
                energy = vizAccount['energy'] / 5
            }
            var params = {
                account: process.env.ACCOUNT,
                participated: participated,
                memo: ctx.dbuser.id,
                winnerBlockDelimiter: process.env.LOTTERY,
                botBase64: Buffer.from(process.env.ACCOUNT + '|' + Math.ceil(energy) + '|0|' + ctx.dbuser.id, 'utf8').toString('base64'),
                percent: Math.ceil(energy / 100)
            }
            if (participated) {
                const maxParticipantPrize = userAwardsSum * participantCount
                const prize: number = (maxParticipantPrize > allAwardsSum) ? allAwardsSum : maxParticipantPrize
                params["prize"] = prize.toFixed(3)
                params["userAwardsSum"] = userAwardsSum.toFixed(3)
                params["allAwardsSum"] = allAwardsSum.toFixed(3)
                params["participants"] = participantCount
            }
            ctx.replyWithHTML(ctx.i18n.t('lottery', params), { disable_web_page_preview: true })
        },
        _ => ctx.replyWithHTML(ctx.i18n.t('something_wrong')))
}
