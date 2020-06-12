// Config dotenv
import * as dotenv from 'dotenv'
dotenv.config({ path: `${__dirname}/../.env` })
// Dependencies
import { bot } from './helpers/bot'
import { checkTime } from './middlewares/checkTime'
import { setupHelp } from './commands/help'
import { setupI18N } from './helpers/i18n'
import { setupLanguage } from './commands/language'
import { attachUser } from './middlewares/attachUser'
import { setupDice } from './commands/dice'
import { setupGame } from './commands/game'

// Check time
bot.use(checkTime)
// Attach user
bot.use(attachUser)
// Setup localization
setupI18N(bot)
// Setup commands
setupHelp(bot)
setupLanguage(bot)
setupDice(bot)
setupGame(bot)

// Start bot
bot.startPolling()

// Log
console.info('Bot is up and running')
