 
import { Telegraf, Context, Markup as m } from 'telegraf'
import { DiceEmoji } from 'telegraf/typings/telegram-types'
import { mainKeyboard } from './start'
import { CallbackButton } from 'telegraf/typings/markup'

const games: DiceEmoji[] = ['🎲', '🎯', '🏀', '⚽️', '🎰', '🎳']

export function setupGame(bot: Telegraf<Context>) {
  bot.hears(new RegExp('(🎮|🧩) .*'), async ctx => {
    await ctx.reply(ctx.i18n.t('game_button'), {
      reply_markup: gameKeyboard(ctx),
    })
  })

  const regExp = new RegExp('(' + games.join('|') + ') .*')
  bot.hears(regExp, async ctx => {
    const game = ctx.match[1] as DiceEmoji
    let user = ctx.dbuser
    user.game = game
    user.value = 0
    user.series = 1
    user = await user.save()
    await ctx.reply(ctx.i18n.t('game_selected'), {
      reply_markup: mainKeyboard(ctx)
    })
  })
}

function gameButtonText(ctx: Context, emoji: string): string {
  return emoji + ' ' + ctx.i18n.t(emoji)
}

function gameKeyboard(ctx: Context) {
  const result: CallbackButton[][] = []
  games.forEach((emoji, _index) => {
    const cb = m.callbackButton(gameButtonText(ctx, emoji), emoji)
    if (_index % 2 === 0) {
      if (_index === 0) {
        result.push([cb])
      } else {
        result[result.length - 1].push(cb)
      }
    } else {
      result[result.length - 1].push(cb)
      if (_index < games.length - 1) {
        result.push([])
      }
    }
  })
  const backButton = m.callbackButton('🔙 ' + ctx.i18n.t('back_button'), '🔙')
  if (result.length === 0 || result[result.length-1].length % 2 === 0) {
    result.push([backButton])
  } else {
    result[result.length - 1].push(backButton)
  }
  return m.keyboard(result).resize()
}
