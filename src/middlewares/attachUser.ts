import { getOrCreateUser } from '../models'
import { VIZ } from '../helpers/viz'
import { NextFunction } from 'grammy'
import { BotContext } from '../types/context'

const viz = VIZ.origin

export async function attachUser(ctx: BotContext, next: NextFunction) {
  if (ctx.from) {
    const dbuser = await getOrCreateUser(ctx.from.id)
    ctx.dbuser = dbuser
    ctx.viz = viz
    next()
  }
}
