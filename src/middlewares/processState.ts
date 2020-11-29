import { Context } from 'telegraf'

export async function processState(ctx: Context, next: any) {
  switch (ctx.dbuser.state) {
    case 'waitLogin':
      if (ctx.message.text) {
        const login = ctx.message.text
        const accountExists = await ctx.viz.isAccountExists(login)
        if (accountExists) {
          var user = ctx.dbuser
          user.login = login
          user.state = null
          await user.save()
          await ctx.replyWithHTML(ctx.i18n.t('lets_play'))
          next()
        } else {
          await ctx.replyWithHTML(ctx.i18n.t('wrong_login'))
        }
      } else {
        await ctx.replyWithHTML(ctx.i18n.t('wait_login'))
      }
      break
    default:
      next()
      break
  }
}
