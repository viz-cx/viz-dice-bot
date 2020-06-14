import * as dotenv from 'dotenv'
dotenv.config({ path: `${__dirname}/../.env` })

import { bot } from './helpers/bot'
import { setupI18N } from './helpers/i18n'

import { checkTime } from './middlewares/checkTime'
import { attachUser } from './middlewares/attachUser'
import { processState } from './middlewares/processState'

import { setupAuth } from './commands/auth'
import { setupLanguage } from './commands/language'
import { setupHelp } from './commands/help'
import { setupDice } from './commands/dice'
import { setupGame } from './commands/game'

bot.use(checkTime)
bot.use(attachUser)
setupI18N(bot)
setupAuth(bot)
bot.use(processState)
setupHelp(bot)
setupLanguage(bot)
setupDice(bot)
setupGame(bot)

if (process.env.LAMBDA) {
    exports.handler = (event, _context, callback) => {
        const body = JSON.parse(event.body)
        bot.handleUpdate(body)
        return callback(null, { statusCode: 200, body: '' })
    }
} else {
    bot.launch()
}

console.info('Bot is up and running')
