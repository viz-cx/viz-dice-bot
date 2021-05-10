import { getOrCreateUser } from '../models'
import { VIZ } from '../helpers/viz'
import { Context } from 'telegraf'

const viz = new VIZ()

export async function attachUser(ctx: Context, next) {
  if (ctx.from) {
    const dbuser = await getOrCreateUser(ctx.from.id)
    ctx.dbuser = dbuser
    ctx.viz = viz
    next()
  } else {
    console.log("Context from empty:", ctx)
  }
}
