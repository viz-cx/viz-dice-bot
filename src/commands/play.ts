/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { getLatestLottery } from "../models/Lottery"
import { getAwardsSum } from "../models/Award"
import { Bot } from "grammy"
import { BotContext } from "../types/context"
import { mainKeyboard } from "./start"

export function setupPlay(bot: Bot<BotContext>) {
  bot.command('play', async ctx => {
    await ctx.reply(ctx.i18n.t('something_wrong'), { parse_mode: 'HTML' })
  })
  bot.hears(/♟ .*/, async ctx => {
    if (!ctx.dbuser.login) {
      ctx.dbuser.state = "waitLogin"
      await ctx.dbuser.save()
      await ctx.reply(ctx.i18n.t('wait_login'), {
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true }
      })
      return
    }

    const waitMinutes = parseInt(process.env.MINUTES)
    const waitDate = new Date(
      ctx.dbuser.payoutDate.getTime()
      + (waitMinutes * 60 * 1000)
    )
    const now = new Date()
    const waitDateToCompare = new Date(waitDate.getTime() - 3000)
    if (waitDateToCompare > now) {
      const between = timeUnitsBetween(now, waitDate)
      const minutes = between['minutes']
      const seconds = between['seconds']
      await ctx.reply(ctx.i18n.t('wait_play', {
        minutes: minutes,
        seconds: seconds
      }), { parse_mode: 'HTML' })
      return
    }
    const user = ctx.dbuser
    const hours = Math.random() * 10
    const zeroingDate = new Date(
      user.payoutDate.getTime()
      + (hours * 60 * 60 * 1000)
    )
    user.payoutDate = now
    await user.save()

    let value: number, multiplier: number, participated: boolean
    await Promise.all([
      ctx.replyWithDice(ctx.dbuser.game),
      getLatestLottery().then(lottery => getAwardsSum(Number(ctx.dbuser.id), lottery.block))
    ]).then(
      async result => {
        const msg = result[0]
        participated = result[1] > 0
        value = msg.dice.value
        multiplier = parseFloat(`0.${value}`)
        switch (msg.dice.emoji) {
          case "🎲": case "🎯": case "🎳": // [1 - 6]
            multiplier = multiplier * 1
            break
          case "🏀": case "⚽️": // [1 - 5]
            multiplier = multiplier * 1.15
            break
          case "🎰": // [1 - 64]
            switch (value) {
              case 1: // bars
                multiplier = 0.1
                break
              case 22: // plums
                multiplier = 2
                break
              case 43: // lemons
                multiplier = 3
                break
              case 64: // sevens
                multiplier = 5
                break
              default: // other cases
                multiplier = multiplier * 0.35
                break
            }
            break
        }
        if (user.value == msg.dice.value) {
          user.series += 1
        } else {
          user.series = 1
        }
        user.value = value

        if (now > zeroingDate) {
          user.payouts = 1
        } else {
          user.payouts = user.payouts + 1
        }

        if (participated) {
          multiplier = multiplier * 3
        }

        multiplier = multiplier / user.payouts

        user.payoutDate = now
        await user.save()
        return ctx.viz.getAccount(process.env.ACCOUNT)
      })
      .then(account => {
        const lastVoteTime = Date.parse(account['last_vote_time'] as string)
        const deltaTime = (new Date().getTime() - lastVoteTime + (new Date().getTimezoneOffset() * 60000)) / 1000
        const energy = parseInt(account['energy'] as string, 10)
        let new_energy = Math.floor(energy + (deltaTime * 10000 / 432000)) //CHAIN_ENERGY_REGENERATION_SECONDS 5 days
        if (new_energy > 10000) {
          new_energy = 10000
        }
        const baseEnergy = new_energy / 100
        const finalEnergy = multiplier > 0.01 ? Math.ceil(baseEnergy * multiplier * ctx.dbuser.series) : 0
        const memo = ctx.dbuser.game
        if (finalEnergy <= 0) {
          console.log(`Decline award to ${ctx.dbuser.login} because multiplier = ${multiplier} (${ctx.dbuser.payouts} payouts)`)
          throw new Error('Zero final energy')
        }
        console.log(`Award ${ctx.dbuser.login} with energy ${finalEnergy}, multiplier ${multiplier}, payouts: ${ctx.dbuser.payouts}, series ${ctx.dbuser.series}`)
        return ctx.viz.makeAward(ctx.dbuser.login, memo, finalEnergy, ctx.dbuser.referrer, account)
      })
      .then(reward => {
        return ctx.reply(ctx.i18n.t('successful_payout', {
          reward: reward,
          user: ctx.dbuser.login,
          number: ctx.dbuser.value,
          series: ctx.dbuser.series,
          participated: participated,
          account: process.env.ACCOUNT
        }), {
          parse_mode: 'HTML',
          link_preview_options: { is_disabled: true },
          disable_notification: true,
          reply_markup: mainKeyboard(ctx)
        })
      })
      .catch(err => {
        let message = ctx.i18n.t('something_wrong')
        if (err.toString().search(/Bad Gateway/) !== -1) {
          ctx.viz.changeNode()
        }
        if (err.toString().search(/Zero final energy/) !== -1) {
          message = ctx.i18n.t('try_later')
        }
        if (err.toString().search(/does not have enough energy to vote/) !== -1) {
          message = ctx.i18n.t('out_of_energy')
        }
        if (err.toString().search(/Duplicate transaction check failed/) !== -1) {
          message = ctx.i18n.t('too_fast')
        }
        console.log(message)
        ctx.reply(message, { parse_mode: 'HTML', reply_markup: mainKeyboard(ctx) }).catch(error => {
          console.error('Failed to send error play message:', error);
        })
      })
  })
}

export function timeUnitsBetween(startDate: Date, endDate: Date) {
  let delta = Math.abs(endDate.getTime() - startDate.getTime()) / 1000
  const isNegative = startDate > endDate ? -1 : 1
  const units: [[string, number], [string, number], [string, number], [string, number]] = [
    ['days', 24 * 60 * 60],
    ['hours', 60 * 60],
    ['minutes', 60],
    ['seconds', 1]
  ]
  return units.reduce((acc, [key, value]) => (acc[key] = Math.floor(delta / value) * isNegative, delta -= acc[key] * isNegative * value, acc), {})
}
