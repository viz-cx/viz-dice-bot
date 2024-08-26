/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Telegraf, Context, Markup as m } from 'telegraf'
import { readdirSync, readFileSync } from 'fs'
import { safeLoad } from 'js-yaml'
import { sendMainKeyboard } from './start'

function emojiByLocaleName(localeName: string) {
  switch (localeName) {
    case 'Русский':
      return '🇷🇺'
    case 'English':
      return '🇺🇸'
    case 'Татарча':
      return ''
    default:
      return ''
  }
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
    .map(value => {
      const emoji = emojiByLocaleName(value) 
      if (emoji) {
        return emoji + ' ' + value
      }
      return value
    })
  bot.hears(locWithEmojis, async ctx => {
    let user = ctx.dbuser
    const message = ctx.update.message
    const languageCode = localeCodeByLocaleName(message.text)
    user.language = languageCode
    user = await user.save()

    const anyI18N = ctx.i18n as unknown as { locale: (code: string) => void }
    anyI18N.locale(languageCode)

    sendMainKeyboard(bot, ctx)
  })
}

export function sendLanguageKeyboard(ctx: Context, addBackButton = false) {
  ctx.reply(ctx.i18n.t('language'), {
    reply_markup: languageKeyboard(ctx, addBackButton),
  }).catch(error => {
    console.error('Failed to send language keyboard:', error);
  })
}

function languageKeyboard(ctx: Context, addBackButton = false) {
  const locWithEmojis = Array.from(locales().values())
    .map(value => emojiByLocaleName(value) + ' ' + value)
  const result: string[][]= []
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
  const result = new Map<string, string>();
  
  localesFiles().forEach(locale => {
    const localeCode = locale.split('.')[0];
    const fileContent = readFileSync(`${__dirname}/../../locales/${locale}`, 'utf8');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const localeData = safeLoad(fileContent) as { name: string } | null;
    
    if (localeData && typeof localeData.name === 'string') {
      result.set(localeCode, localeData.name);
    } else {
      throw new Error(`Invalid locale data for ${locale}`);
    }
  });
  
  return result;
}

function localesFiles() {
  return readdirSync(`${__dirname}/../../locales`)
}
