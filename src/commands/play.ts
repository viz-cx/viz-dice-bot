import { Telegraf, Context } from "telegraf"

export function setupPlay(bot: Telegraf<Context>) {
  bot.command(['play'], async ctx => {
    if (!ctx.dbuser.login || !ctx.dbuser.postingKey) {
      ctx.reply(ctx.i18n.t('auth_required'))
      return
    }
    var value: number, multiplier: number
    await ctx.viz.award(ctx.dbuser.login, ctx.dbuser.postingKey, ctx.dbuser.game, ctx.dbuser.referrer)
      .then(_ => ctx.replyWithDice({ emoji: ctx.dbuser.game }))
      .then(msg => {
        const user = ctx.dbuser
        value = msg.dice.value
        multiplier = parseFloat(`0.${value}`)
        // TODO: think about balance to compensate for the lack of six
        // switch (msg.dice.emoji) {
        //   case "🎲": case "🎯": // [1 - 6]
        //     multiplier = multiplier * 1
        //     break
        //   case "🏀": // [1 - 5]
        //     multiplier = multiplier * 0.77
        //     break
        // }
        if (user.value == msg.dice.value) {
          user.series += 1
        } else {
          user.series = 1
        }
        user.value = value
        user.save()
        return ctx.viz.getAccountShares(ctx.dbuser.login)
      })
      .then(shares => ctx.viz.calculatePayout(shares))
      .then(shares => {
        console.log(`Payout to ${ctx.dbuser.login} ${shares} ${multiplier} ${ctx.dbuser.series}`)
        const amount = shares * multiplier * ctx.dbuser.series
        const memo = ctx.dbuser.game
        return ctx.viz.payout(ctx.dbuser.login, amount, memo)
      })
      .then(result => {
        const amount = result['operations'][0][1]['amount']
        const numbers = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣']
        const number = numbers[value - 1]
        ctx.viz.getAccountEnergy
        return ctx.viz.getAccountEnergy(ctx.dbuser.login)
          .then(
            energy => {
              const accountEnergyLeftPercent = (energy / 100).toFixed(2)
              const energySpent = process.env.PERCENT
              ctx.replyWithHTML(ctx.i18n.t('successful_payout', { energy_spent: energySpent, energy_left: accountEnergyLeftPercent, number: number, amount: amount, series: ctx.dbuser.series }))
            }
          )
      })
      .catch(err => {
        if (err.toString().search(/does not have enough energy to vote/) !== -1) {
          ctx.replyWithHTML(ctx.i18n.t('out_of_energy'))
          return
        }
        console.log(err)
        ctx.replyWithHTML(ctx.i18n.t('something_wrong'))
      })
  })
}
