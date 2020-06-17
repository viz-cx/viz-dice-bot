import { Telegraf, Context } from "telegraf"

export function setupPlay(bot: Telegraf<Context>) {
  bot.command(['play'], async ctx => {
    if (!ctx.dbuser.login || !ctx.dbuser.postingKey) {
      ctx.reply(ctx.i18n.t('auth_required'))
      return
    }
    var value: number, multiplier: number
    await award(ctx.viz, ctx.dbuser.login, ctx.dbuser.postingKey, ctx.dbuser.game, ctx.dbuser.referrer)
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
        return getAccountShares(ctx.viz, ctx.dbuser.login)
      })
      .then(shares => calculatePayout(ctx.viz, shares))
      .then(shares => {
        console.log(`Payout to ${ctx.dbuser.login} ${shares} ${multiplier} ${ctx.dbuser.series}`)
        const amount = shares * multiplier * ctx.dbuser.series
        const memo = ctx.dbuser.game
        return payout(ctx.viz, ctx.dbuser.login, amount, memo)
      })
      .then(result => {
        const amount = result['operations'][0][1]['amount']
        const numbers = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣']
        const number = numbers[value - 1]
        return getAccountEnergy(ctx.viz, ctx.dbuser.login)
          .then(
            energy => {
              const accountEnergyLeftPercent = (energy / 100).toFixed(2)
              const energySpent = process.env.PERCENT
              ctx.replyWithHTML(ctx.i18n.t('successful_payout', { energy_spent: energySpent, energy_left: accountEnergyLeftPercent, number: number, amount: amount, series: ctx.dbuser.series }))
              removeAccountCache(ctx.dbuser.login)
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

function payout(viz: any, to: string, amount: number, memo: string): Promise<object> {
  return new Promise((resolve, reject) => {
    const wif = process.env.WIF
    const from = process.env.ACCOUNT
    if (amount < 0.001) {
      amount = 0.001
    }
    const amountWithSymbol = `${amount.toFixed(3)} VIZ`
    viz.broadcast.transfer(wif, from, to, amountWithSymbol, memo, function (err, result) {
      if (err) {
        reject(err)
        return
      }
      resolve(result)
    })
  })
}

function getAccountShares(viz: any, login: string): Promise<number> {
  return new Promise((resolve, reject) => {
    getAccount(viz, login)
      .then(
        account => {
          const shares = parseFloat(account['vesting_shares'])
            + parseFloat(account['received_vesting_shares'])
            - parseFloat(account['delegated_vesting_shares'])
          resolve(shares)
        },
        err => reject(err)
      )
  })
}

function getAccountEnergy(viz: any, login: string): Promise<number> {
  return new Promise((resolve, reject) => {
    getAccount(viz, login)
      .then(
        account => {
          const energy = parseFloat(account['energy'])
          resolve(energy)
        },
        err => reject(err)
      )
  })
}

function calculatePayout(viz: any, accountShares: number): Promise<number> {
  return new Promise((resolve, reject) => {
    viz.api.getDynamicGlobalProperties(function (err, result) {
      if (err) {
        reject(err)
        return
      }
      const total_vesting_fund = parseFloat(result["total_vesting_fund"])
      const total_vesting_shares = parseFloat(result["total_vesting_shares"])
      const total_reward_fund = parseFloat(result["total_reward_fund"])
      const total_reward_shares = parseFloat(result["total_reward_shares"])
      const percent = parseInt(process.env.PERCENT)
      const payoutShares = accountShares * percent / (total_reward_shares / 1000000) * total_reward_fund / 100
      const payoutVIZ = viz.formatter.sharesToVIZ(payoutShares, total_vesting_shares, total_vesting_fund).toFixed(3)
      resolve(payoutVIZ)
    })
  })
}

function award(viz: any, login: string, wif: string, memo: string, referrer: string) {
  return new Promise((resolve, reject) => {
    var receiver = process.env.ACCOUNT
    var energy = 100 * parseInt(process.env.PERCENT)
    var custom_sequence = 0
    var beneficiaries = []
    if (referrer) {
      beneficiaries.push({ account: referrer, weight: 1000 })
    }
    viz.broadcast.award(
      wif,
      login,
      receiver,
      energy,
      custom_sequence,
      memo,
      beneficiaries,
      function (err, result) {
        if (err) {
          reject(err)
        } else {
          resolve(result)
        }
      })
  })
}

var accountsCache = {}

function getAccount(viz: any, login: string): Promise<Object> {
  return new Promise((resolve, reject) => {
    const accountFromCache = accountsCache[login]
    if (accountFromCache) {
      resolve(accountFromCache)
      return
    }
    viz.api.getAccounts([login], function (err, result) {
      if (err) {
        reject(err)
        return
      }
      const account = result[0]
      if (account) {
        accountsCache[login] = account
        resolve(account)
      } else {
        reject(new Error('Account not found in response'))
      }
    })
  })
}

function removeAccountCache(login: string) {
  delete accountsCache[login]
}
