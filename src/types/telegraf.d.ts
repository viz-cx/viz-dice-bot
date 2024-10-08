import I18N from 'telegraf-i18n'
import { User } from '../models'
import { DocumentType } from '@typegoose/typegoose'
import { Middleware } from 'telegraf'
import { TelegrafContext } from 'telegraf/typings/context'
import { VIZ } from '../helpers/viz'

declare module 'telegraf' {
  export interface Context {
    dbuser: DocumentType<User>
    i18n: I18N
    viz: VIZ
  }

  export interface Composer<TContext extends Context> {
    action(
      action: string | string[] | RegExp,
      middleware: Middleware<TelegrafContext>,
      ...middlewares: Middleware<TelegrafContext>[]
    ): Composer<TContext>
  }
}
