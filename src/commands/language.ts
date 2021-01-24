import { Telegraf, Context, Markup as m, Extra } from 'telegraf'
import { readdirSync, readFileSync } from 'fs'
import { safeLoad } from 'js-yaml'
import { sendMainKeyboard } from './start'
import { createTextChangeRange } from 'typescript'
import I18n from 'telegraf-i18n'

function emojiByLocaleName(localeName: string) {
  if (localeName === 'Русский') {
    return '🇷🇺'
  }
  return '🇺🇸'
}

function localeCodeByLocaleName(localeName: string): string {
  // remove emoji
  if (localeName.includes(' ')) {
    localeName = localeName.split(' ')[1]
  }
  const filtered = Array.from(locales())
    .filter(v => v[1] === localeName)
  if (filtered.length > 0) {
    return filtered[0][0]
  }
  return 'en'
}

export function setupLanguage(bot: Telegraf<Context>) {
  bot.hears(new RegExp('🌐 .*'), async ctx => [
    sendLanguageKeyboard(ctx, true)
  ])

  const locWithEmojis = Array.from(locales().values())
    .map(value => emojiByLocaleName(value) + ' ' + value)
  bot.hears(locWithEmojis, async ctx => {
    let user = ctx.dbuser
    const message = ctx.update.message
    const languageCode = localeCodeByLocaleName(message.text)
    user.language = languageCode
    user = await (user as any).save()

    const anyI18N = ctx.i18n as any
    anyI18N.locale(languageCode)

    await sendMainKeyboard(bot, ctx)
  })
}

export function sendLanguageKeyboard(ctx: Context, addBackButton = false) {
  ctx.reply(ctx.i18n.t('language'), {
    reply_markup: languageKeyboard(ctx, addBackButton),
  })
}

function languageKeyboard(ctx: Context, addBackButton = false) {
  const locWithEmojis = Array.from(locales().values())
    .map(value => emojiByLocaleName(value) + ' ' + value)
  var result = []
  locWithEmojis.forEach((locale, index) => {
    if (index % 2 === 0) {
      if (index === 0) {
        result.push([locale])
      } else {
        result[result.length - 1].push(locale)
      }
    } else {
      result[result.length - 1].push(locale)
      if (index < locWithEmojis.length) {
        result.push([])
      }
    }
  })
  if (addBackButton) {
    const backTitle = '🔙 ' + ctx.i18n.t('back_button')
    if (result.length === 0 || result[result.length-1].length % 2 === 0) {
      result.push([backTitle])
    } else {
      result[result.length - 1].push(backTitle)
    }
  }
  return m.keyboard(result).resize()
}

// { 'en' => 'English', 'ru' => 'Русский' }
function locales() {
  var result = new Map()
  localesFiles().forEach(locale => {
    const localeCode = locale.split('.')[0]
    const localeName = safeLoad(
      readFileSync(`${__dirname}/../../locales/${locale}`, 'utf8')
    ).name
    result.set(localeCode, localeName)
  })
  return result
}

function localesFiles() {
  return readdirSync(`${__dirname}/../../locales`)
}
