import { Context as GrammyContext } from 'grammy'
import { UserDocument } from '../models'
import { VIZ } from '../helpers/viz'

export interface I18nContext {
  t(key: string, params?: Record<string, unknown>): string
  locale(): string
  locale(code: string): void
}

export interface BotContext extends GrammyContext {
  dbuser: UserDocument
  i18n: I18nContext
  viz: VIZ
}
