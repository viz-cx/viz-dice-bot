import { Telegraf, Context, Markup as m, Extra } from 'telegraf'
import { ExtraEditMessage } from 'telegraf/typings/telegram-types'
import { DiceEmoji } from 'telegraf/typings/telegram-types'

const games: Array<DiceEmoji> = ['🎲', '🎯', '🏀']

export function setupGame(bot: Telegraf<Context>) {
  bot.command('game', ctx => {
    ctx.reply(ctx.i18n.t('game'), {
      reply_markup: gameKeyboard(ctx),
    })
  })

  bot.action(games, async ctx => {
    let user = ctx.dbuser
    user.game = ctx.callbackQuery.data as DiceEmoji
    user.value = 0
    user.series = 1
    user = await user.save()
    const message = ctx.callbackQuery.message
    await ctx.telegram.editMessageText(
      message.chat.id,
      message.message_id,
      undefined,
      ctx.i18n.t('game_selected'),
      Extra.HTML(true) as ExtraEditMessage
    )
  })
}

function gameKeyboard(ctx) {
  const result = []
  games.forEach((game, _index) => {
    result.push([m.callbackButton(game + ' ' + ctx.i18n.t(game), game)])
  })
  return m.inlineKeyboard(result)
}
