import { Context } from 'telegraf'

export async function processState(ctx: Context, next: () => any) {
  switch (ctx.dbuser.state) {
    case 'waitLogin':
      if (ctx.message.text) {
        const login = ctx.message.text
        const accountExists = await ctx.viz.isAccountExists(login)
        if (accountExists) {
          var user = ctx.dbuser
          user.login = login
          user.state = null
          await user.save().then(
            _ => ctx.replyWithHTML(ctx.i18n.t('lets_play')),
            rejected => console.log(rejected)
          )
          return next()
        } else {
          await ctx.replyWithHTML(ctx.i18n.t('wrong_login'), {
            disable_web_page_preview: true
          })
        }
      } else {
        await ctx.replyWithHTML(ctx.i18n.t('wait_login'), {
          disable_web_page_preview: true
        })
      }
      break
    default:
      return next()
  }
}
