import { NextFunction } from 'grammy'
import { BotContext } from '../types/context'

export async function processState(ctx: BotContext, next: NextFunction) {
  switch (ctx.dbuser.state) {
    case 'waitLogin':
      // Only an actual message can carry a login. Non-message updates that
      // still reach here (e.g. my_chat_member when a user blocks the bot)
      // must not trigger a reply — that send would fail and is pointless.
      if (!ctx.message) {
        return next()
      }
      if (ctx.message?.text) {
        const login = ctx.message.text
        const accountExists = await ctx.viz.isAccountExists(login)
        if (accountExists) {
          const user = ctx.dbuser
          user.login = login
          user.state = null
          await user.save().then(
            () => ctx.reply(ctx.i18n.t('lets_play'), { parse_mode: 'HTML' }),
            rejected => console.log(rejected)
          )
          return next()
        } else {
          await ctx.reply(ctx.i18n.t('wrong_login'), {
            parse_mode: 'HTML',
            link_preview_options: { is_disabled: true }
          })
        }
      } else {
        await ctx.reply(ctx.i18n.t('wait_login'), {
          parse_mode: 'HTML',
          link_preview_options: { is_disabled: true }
        })
      }
      break
    default:
      return next()
  }
}
