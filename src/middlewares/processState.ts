import { Context } from 'telegraf'

export async function processState(ctx: Context, next: any) {
  switch (ctx.dbuser.state) {
    case 'empty':
      next()
      break
    case 'waitLogin':
      if (ctx.message.text) {
        const user = ctx.dbuser
        user.login = ctx.message.text
        user.state = 'waitPostingKey'
        const msg = await ctx.viz.utils.validateAccountName(user.login)
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
        await ctx.viz.api.getAccounts([user.login], async function (err, result) {
          if (err) {
            console.log(err)
            await ctx.reply(ctx.i18n.t('something_wrong'))
            return
          }
          const publicKeys = result[0].regular_authority.key_auths
          var accountHasKey = false
          if (publicKeys) {
            for (let key of publicKeys) {
              const pubWif = key[0]
              if (await ctx.viz.auth.wifIsValid(user.postingKey, pubWif)) {
                accountHasKey = true
                break
              }
            }
          }
          if (accountHasKey) {
            await user.save()
            await ctx.replyWithHTML(ctx.i18n.t('lets_play'))
            await next()
          } else {
            await ctx.replyWithHTML(ctx.i18n.t('wrong_posting_key'))
          }
        })
      } else {
        await ctx.replyWithHTML(ctx.i18n.t('wait_posting_key'))
      } break
  }
}
