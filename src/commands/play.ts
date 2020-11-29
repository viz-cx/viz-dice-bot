import { Telegraf, Context } from "telegraf"

export function setupPlay(bot: Telegraf<Context>) {
  bot.command('play', async ctx => {
    ctx.replyWithHTML(ctx.i18n.t('something_wrong'))
  })
  bot.hears(new RegExp('♟ .*'), async ctx => {
    if (!ctx.dbuser.login) {
      ctx.dbuser.state = "waitLogin"
      ctx.dbuser.save()
      ctx.replyWithHTML(ctx.i18n.t('wait_login'))
      return
    }

    const waitMinutes = parseInt(process.env.MINUTES)
    const waitDate = ctx.dbuser.payoutDate
    waitDate.setMinutes(waitMinutes + ctx.dbuser.payoutDate.getMinutes())
    const now = new Date()
    if (waitDate > now) {
      const between = timeUnitsBetween(now, waitDate)
      const minutes = between['minutes']
      const seconds = between['seconds']
      ctx.replyWithHTML(ctx.i18n.t('wait_play', {
        minutes: minutes,
        seconds: seconds
      }))
      return
    }

    var value: number, multiplier: number
    await ctx.replyWithDice({ emoji: ctx.dbuser.game })
      .then(msg => {
        var user = ctx.dbuser
        value = msg.dice.value
        multiplier = parseFloat(`0.${value}`)
        // TODO: think about balance to compensate for the lack of six
        switch (msg.dice.emoji) {
          case "🎲": case "🎯": // [1 - 6]
            multiplier = multiplier * 2
            break
          case "🏀": case "⚽️": // [1 - 5]
            multiplier = multiplier * 2.25
            break
          case "🎰": // [1 - 64]
            switch (value) {
              case 1: // bars
                multiplier = 1
                break
              case 22: // plums
                multiplier = 3
                break
              case 43: // lemons
                multiplier = 4
                break
              case 64: // sevens
                multiplier = 5
                break
              default: // other cases
                multiplier = 1.75
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
        user.payoutDate = new Date()
        user.save()
        return ctx.viz.getAccountEnergy(process.env.ACCOUNT)
      })
      .then(remainingEnergy => {
        const baseEnergy = remainingEnergy / 10000
        const finalEnergyPercent = baseEnergy * multiplier * ctx.dbuser.series
        const memo = ctx.dbuser.game
        console.log(`Payout to ${ctx.dbuser.login} with energy ${finalEnergyPercent}, multiplier ${multiplier}, series ${ctx.dbuser.series}`)
        return ctx.viz.payout(ctx.dbuser.login, memo, finalEnergyPercent, ctx.dbuser.referrer)
      })
      .then(result => {
        const energySpent = parseFloat(result['operations'][0][1]['energy']) / 100
        ctx.replyWithHTML(ctx.i18n.t('successful_payout', {
          energy_spent: energySpent,
          number: ctx.dbuser.value,
          series: ctx.dbuser.series
        }))
      })
      .catch(err => {
        if (err.toString().search(/does not have enough energy to vote/) !== -1) {
          ctx.replyWithHTML(ctx.i18n.t('out_of_energy'))
          return
        }
        if (err.toString().search(/Duplicate transaction check failed/) !== -1) {
          ctx.replyWithHTML(ctx.i18n.t('too_fast'))
          return
        }
        console.log("Error: ", err.toString())
        ctx.replyWithHTML(ctx.i18n.t('something_wrong'))
      })
  })
}

function timeUnitsBetween(startDate, endDate) {
  let delta = Math.abs(endDate - startDate) / 1000;
  const isNegative = startDate > endDate ? -1 : 1;
  const units: [[string, number], [string, number], [string, number], [string, number]] = [
    ['days', 24 * 60 * 60],
    ['hours', 60 * 60],
    ['minutes', 60],
    ['seconds', 1]
  ]
  return units.reduce((acc, [key, value]) => (acc[key] = Math.floor(delta / value) * isNegative, delta -= acc[key] * isNegative * value, acc), {});
}
