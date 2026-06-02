import { readdirSync, readFileSync } from 'fs'
import { load } from 'js-yaml'
import { NextFunction } from 'grammy'
import { BotContext, I18nContext } from '../types/context'

type LocaleData = Record<string, string>
const localesMap = new Map<string, LocaleData>()

const localesDir = `${__dirname}/../../locales`
for (const file of readdirSync(localesDir)) {
  if (file.endsWith('.yaml')) {
    const code = file.replace('.yaml', '')
    const content = readFileSync(`${localesDir}/${file}`, 'utf8')
    localesMap.set(code, load(content) as LocaleData)
  }
}

function pluralize(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}

function compileTemplate(template: string, params: Record<string, unknown>): string {
  const keys = Object.keys(params)
  const values = Object.values(params)
  // Locale templates are trusted, developer-authored YAML (never user input) and
  // use full JS expression syntax (ternaries, string concat, pluralize() calls),
  // so we compile them with the Function constructor rather than a custom parser.
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const fn = new Function('pluralize', ...keys, `return \`${template}\``) as (
    pluralizeFn: typeof pluralize,
    ...args: unknown[]
  ) => string
  return fn(pluralize, ...values)
}

export function t(locale: string, key: string, params: Record<string, unknown> = {}): string {
  const data = localesMap.get(locale) ?? localesMap.get('en')
  const template = data?.[key]
  if (!template) return key
  return compileTemplate(template, params)
}

export function i18nMiddleware(ctx: BotContext, next: NextFunction) {
  let currentLocale = 'en'

  ctx.i18n = {
    t(key: string, params?: Record<string, unknown>): string {
      return t(currentLocale, key, params)
    },
    locale(code?: string): string | void {
      if (code !== undefined) {
        currentLocale = code
      } else {
        return currentLocale
      }
    },
  } as I18nContext

  return next()
}

export function setLocaleMiddleware(ctx: BotContext, next: NextFunction) {
  if (ctx.dbuser) {
    ctx.i18n.locale(ctx.dbuser.language)
  }
  return next()
}
