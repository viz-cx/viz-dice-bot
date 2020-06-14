import { Context } from 'telegraf'
import { VIZ } from '../helpers/viz'

export async function processState(ctx: Context, next: any) {
  ctx.viz = new VIZ().viz
  switch (ctx.dbuser.state) {
    case 'empty':
      next()
      break
    case 'waitLogin':
      if (ctx.message.text) {
        const user = ctx.dbuser
        user.login = ctx.message.text
        user.state = 'waitPostingKey'
        const viz = require("viz-js-lib")
        const msg = await viz.utils.validateAccountName(user.login)
        if (!msg) {
          await user.save()
          await ctx.replyWithHTML(ctx.i18n.t('wait_posting_key'))
          next()
        } else {
          await ctx.replyWithHTML(ctx.i18n.t('wrong_login', { error: msg }))
        }
      } else {
        await ctx.replyWithHTML(ctx.i18n.t('wait_login'))
      }
      break
    case 'waitPostingKey':
      if (ctx.message.text) {
        const user = ctx.dbuser
        user.postingKey = ctx.message.text
        user.state = 'empty'
        const isWif = await ctx.viz.auth.isWif(user.postingKey)
        if (!isWif) {
          await ctx.replyWithHTML(ctx.i18n.t('wrong_posting_key'))
          return
        }
        ctx.viz.api.getAccounts([user.login], function (err, result) {
          if (err) {
            console.log(err)
            ctx.reply(ctx.i18n.t('something_wrong'))
            return
          }
          const publicKeys = result[0].regular_authority.key_auths
          var accountHasKey = false
          if (publicKeys) {
            for (let key of publicKeys) {
              const pubWif = key[0]
              if (ctx.viz.auth.wifIsValid(user.postingKey, pubWif)) {
                accountHasKey = true
                break
              }
            }
          }
          if (accountHasKey) {
            user.save()
            ctx.replyWithHTML(ctx.i18n.t('lets_play'))
            next()
          } else {
            ctx.replyWithHTML(ctx.i18n.t('wrong_posting_key'))
          }
        })
      } else {
        await ctx.replyWithHTML(ctx.i18n.t('wait_posting_key'))
      } break
  }
}
