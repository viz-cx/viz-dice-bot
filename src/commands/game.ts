import { Bot, Keyboard } from 'grammy'
import { BotContext } from '../types/context'
import { DiceEmoji } from '../models/User'
import { mainKeyboard } from './start'

const games = ['🎲', '🎯', '🏀', '⚽️', '🎰', '🎳'] as const

export function setupGame(bot: Bot<BotContext>) {
  bot.hears(/(?:🎮|🧩) .*/, async ctx => {
    await ctx.reply(ctx.i18n.t('game_button'), {
      reply_markup: gameKeyboard(ctx),
    })
  })

  const regExp = new RegExp('(' + games.join('|') + ') .*')
  bot.hears(regExp, async ctx => {
    const game = ctx.match[1] as DiceEmoji
    const user = ctx.dbuser
    user.game = game
    user.value = 0
    user.series = 1
    await user.save()
    await ctx.reply(ctx.i18n.t('game_selected'), {
      reply_markup: mainKeyboard(ctx)
    })
  })
}

function gameButtonText(ctx: BotContext, emoji: string): string {
  return emoji + ' ' + ctx.i18n.t(emoji)
}

function gameKeyboard(ctx: BotContext) {
  const buttons: string[][] = []
  games.forEach((emoji, index) => {
    const text = gameButtonText(ctx, emoji)
    if (index % 2 === 0) {
      if (index === 0) {
        buttons.push([text])
      } else {
        buttons[buttons.length - 1].push(text)
      }
    } else {
      buttons[buttons.length - 1].push(text)
      if (index < games.length - 1) {
        buttons.push([])
      }
    }
  })
  const backButton = '🔙 ' + ctx.i18n.t('back_button')
  if (buttons.length === 0 || buttons[buttons.length-1].length % 2 === 0) {
    buttons.push([backButton])
  } else {
    buttons[buttons.length - 1].push(backButton)
  }
  return Keyboard.from(buttons.map(row => row.map(text => Keyboard.text(text)))).resized()
}
