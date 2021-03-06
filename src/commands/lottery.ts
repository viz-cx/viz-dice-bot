import { getAllPayoutsSum, getLatestLottery } from "../models/Lottery"
import { getAwardsSum, getAllAwardsSum, isParticipated, participantsCount } from "../models/Award"
import { Telegraf, Context } from "telegraf"
import { findUser, User } from "../models/User"
import { timeUnitsBetween } from "../commands/play"
import { mainKeyboard } from "./start"
import { VIZ } from "../helpers/viz"

export function setupLottery(bot: Telegraf<Context>) {
    bot.hears(new RegExp('🍀 .*'), async ctx => {
        await sendLottery(bot, ctx)
    })
    bot.command(['lottery'], async ctx => {
        await sendLottery(bot, ctx)
    })
}

async function sendLottery(bot: Telegraf<Context>, ctx: Context) {
    if (!ctx.dbuser.login) {
        ctx.dbuser.state = "waitLogin"
        ctx.dbuser.save()
        ctx.replyWithHTML(ctx.i18n.t('wait_login'), {
            disable_web_page_preview: true
        })
        return
    }
    const params = await lotteryParams(ctx.viz, ctx.dbuser)
    ctx.replyWithHTML(ctx.i18n.t('lottery', params), { reply_markup: mainKeyboard(ctx), disable_web_page_preview: true })
}

export async function lotteryParams(viz: VIZ, user: User) {
    const lastIrreversibleBlock = (await viz.getDynamicGlobalProperties().catch(_ => viz.changeNode()))['last_irreversible_block_num']
    const latestLottery = await getLatestLottery()
    const lotteryHours = parseInt(process.env.LOTTERY)
    const roundTime = lotteryHours * 60 * 60
    const timePassed = (lastIrreversibleBlock - latestLottery.block) * 3
    const timeLeft = (roundTime - timePassed) * 1000
    const finalTime = new Date(new Date().getTime() + timeLeft)
    const between = timeUnitsBetween(new Date(), finalTime)
    const hours = between['hours']
    const minutes = between['minutes']
    const seconds = between['seconds']
    const participated = await isParticipated(user.id, latestLottery.block)
    const userAwardsSum = await getAwardsSum(user.id, latestLottery.block)
    const allAwardsSum = (await getAllAwardsSum()) - (await getAllPayoutsSum())
    const participantCount = await participantsCount(latestLottery.block)
    const vizAccount = await findUser(user.id).then(user => viz.getAccount(user.login).catch(_ => viz.changeNode()))
    var energy = 10
    if (vizAccount) {
        energy = vizAccount['energy'] / 5
    }
    var params = {
        account: process.env.ACCOUNT,
        participated: participated,
        memo: user.id,
        winnerBlockDelimiter: lotteryHours,
        botBase64: Buffer.from(process.env.ACCOUNT + '|' + Math.ceil(energy) + '|0|' + user.id, 'utf8').toString('base64'),
        percent: Math.ceil(energy / 100),
        hours: hours,
        minutes: minutes,
        seconds: seconds,
        allAwardsSum: allAwardsSum.toFixed(3),
        participants: participantCount
    }
    if (participated) {
        const maxParticipantPrize = userAwardsSum * participantCount
        const prize: number = (maxParticipantPrize > allAwardsSum) ? allAwardsSum : maxParticipantPrize
        params["prize"] = prize.toFixed(3)
        params["userAwardsSum"] = userAwardsSum.toFixed(3)
    }
    return params
}
