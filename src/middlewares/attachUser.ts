import { getOrCreateUser } from '../models'
import { VIZ } from '../helpers/viz'
import { Context } from 'telegraf'

const viz = VIZ.origin

export async function attachUser(ctx: Context, next: () => any) {
  if (ctx.from) {
    const dbuser = await getOrCreateUser(ctx.from.id)
    ctx.dbuser = dbuser
    ctx.viz = viz
    next()
  }
}
