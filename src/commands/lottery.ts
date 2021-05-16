import { getAllPayoutsSum, getLatestLottery } from "../models/Lottery"
import { getAwardsSum, getAllAwardsSum, isParticipated, participantsCount } from "../models/Award"
import { Telegraf, Context } from "telegraf"
import { findUser } from "../models/User"

export function setupLottery(bot: Telegraf<Context>) {
    bot.hears(new RegExp('🍀 .*'), async ctx => {
        await sendLottery(bot, ctx)
    })
    bot.command(['lottery'], async ctx => {
        await sendLottery(bot, ctx)
    })
}

async function sendLottery(bot: Telegraf<Context>, ctx: Context) {
    const latestLottery = await getLatestLottery()
    const participated = await isParticipated(ctx.dbuser.login, latestLottery.block)
    const userAwardsSum = await getAwardsSum(ctx.dbuser.login, latestLottery.block)
    const allAwardsSum = (await getAllAwardsSum()) - (await getAllPayoutsSum())
    const participantCount = await participantsCount(latestLottery.block)
    const vizAccount = await findUser(ctx.dbuser.id).then(user => ctx.viz.getAccount(user.login))
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
}
