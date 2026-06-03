import { getOrCreateUser } from '../models'
import { VIZ } from '../helpers/viz'
import { NextFunction } from 'grammy'
import { BotContext } from '../types/context'

const viz = VIZ.origin

export async function attachUser(ctx: BotContext, next: NextFunction) {
  if (ctx.from) {
    const dbuser = await getOrCreateUser(ctx.from.id)
    // Reaching us at all means they've unblocked — clear a stale inactive flag.
    if (dbuser && dbuser.active === false) {
      dbuser.active = true
      await dbuser.save()
    }
    ctx.dbuser = dbuser
    ctx.viz = viz
    await next()
  }
}
