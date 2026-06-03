import { Bot, GrammyError, HttpError } from 'grammy'
import { BotContext } from '../types/context'
import { setUserActive } from '../models/User'

export const bot = new Bot<BotContext>(process.env.TOKEN)

// Without an error handler grammY lets any thrown error escape the polling
// loop and stops the bot — so one failed sendMessage (e.g. a single user who
// blocked the bot, 403) takes the whole bot down for everyone. Swallow the
// expected "can't deliver to this user" cases and log the rest.
bot.catch(err => {
  const update = err.ctx?.update?.update_id
  const e = err.error
  if (e instanceof GrammyError) {
    // 403 means the recipient blocked/deleted the bot — definitively
    // unreachable, so mark them inactive to keep broadcasts and the scheduler
    // from retrying. (400s have many benign causes, so they're only logged.)
    if (e.error_code === 403) {
      const blockedId = err.ctx?.chat?.id ?? err.ctx?.from?.id
      if (blockedId) {
        void setUserActive(blockedId, false)
      }
      console.log(
        `Marked unreachable recipient inactive on update ${update}: ${e.description}`
      )
      return
    }
    if (e.error_code === 400) {
      console.log(
        `Skipping recipient on update ${update}: ${e.description}`
      )
      return
    }
    console.error(`Telegram API error on update ${update}: ${e.description}`)
  } else if (e instanceof HttpError) {
    console.error(`Could not reach Telegram on update ${update}:`, e)
  } else {
    console.error(`Unhandled error on update ${update}:`, e)
  }
})
