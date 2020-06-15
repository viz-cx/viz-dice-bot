import { findUser } from '../models'
import { VIZ } from '../helpers/viz'
import { Context } from 'telegraf'

export async function attachUser(ctx: Context, next) {
  const dbuser = await findUser(ctx.from.id)
  ctx.dbuser = dbuser
  ctx.viz = new VIZ().viz
  next()
}
