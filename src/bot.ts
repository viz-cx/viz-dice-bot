import * as dotenv from 'dotenv'
dotenv.config({ path: `${__dirname}/../.env` })

import { bot } from './helpers/bot'
import { setupI18N } from './helpers/i18n'

import { checkChatType } from './middlewares/checkChat'
import { checkTime } from './middlewares/checkTime'
import { attachUser } from './middlewares/attachUser'
import { processState } from './middlewares/processState'

import { setupLanguage } from './commands/language'
import { setupHelp } from './commands/help'
import { setupStart } from './commands/start'
import { setupPlay } from './commands/play'
import { setupGame } from './commands/game'

bot.use(checkChatType)
bot.use(checkTime)
bot.use(attachUser)
setupI18N(bot)
bot.use(processState)
setupStart(bot)
setupHelp(bot)
setupLanguage(bot)
setupPlay(bot)
setupGame(bot)

export default bot
