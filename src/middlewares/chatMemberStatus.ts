import { NextFunction } from 'grammy'
import { BotContext } from '../types/context'
import { setUserActive } from '../models/User'

// Telegram delivers a my_chat_member update whenever a user blocks or unblocks
// the bot in a private chat. Mirror that into the user's `active` flag so the
// scheduler and broadcasts skip people who can no longer receive messages, and
// so they come back automatically when they unblock. Terminal for private
// my_chat_member updates: a membership change is not a command, so nothing
// downstream (e.g. processState) should run and attempt a doomed reply.
export async function trackBlockStatus(ctx: BotContext, next: NextFunction) {
  const update = ctx.myChatMember
  if (!update || ctx.chat?.type !== 'private') {
    return next()
  }
  const status = update.new_chat_member.status
  const blocked = status === 'kicked' || status === 'left'
  await setUserActive(update.from.id, !blocked)
}
