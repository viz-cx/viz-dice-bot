import * as dotenv from 'dotenv'
dotenv.config({ path: `${__dirname}/../.env` })

// Keep the bot alive through transient network failures (flaky VIZ nodes,
// Telegram API timeouts) instead of letting an unhandled rejection in a
// background loop crash the process.
process.on('unhandledRejection', reason => {
  console.error('Unhandled promise rejection:', reason)
})
process.on('uncaughtException', err => {
  console.error('Uncaught exception:', err)
})

import { bot } from './helpers/bot'
import { i18nMiddleware, setLocaleMiddleware } from './helpers/i18n'

import { checkChatType } from './middlewares/checkChat'
import { trackBlockStatus } from './middlewares/chatMemberStatus'
import { checkTime } from './middlewares/checkTime'
import { attachUser } from './middlewares/attachUser'
import { processState } from './middlewares/processState'

import { setupLanguage } from './commands/language'
import { setupHelp } from './commands/help'
import { setupStart } from './commands/start'
import { setupStop } from './commands/stop'
import { setupPlay } from './commands/play'
import { setupGame } from './commands/game'
import { checkForward } from './middlewares/forwardFromChannel'
import { setupStats } from './commands/stats'
import { startLottery } from './lottery'
import { setupLottery } from './commands/lottery'
import { setupTop } from './commands/top'
import { startUnstaking } from './unstake'

bot.use(trackBlockStatus)
bot.use(checkChatType)
bot.use(checkTime)
bot.use(checkForward)
bot.use(attachUser)
bot.use(i18nMiddleware)
bot.use(setLocaleMiddleware)
bot.use(processState)
setupStart(bot)
setupStop(bot)
setupHelp(bot)
setupLanguage(bot)
setupPlay(bot)
setupGame(bot)
setupStats(bot)
setupLottery(bot)
setupTop(bot)

startLottery()
startUnstaking()

export default bot
