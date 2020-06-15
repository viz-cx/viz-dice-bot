import bot from './bot'

const path = process.env.SECRET_PATH || '/secret-path'
const port = parseInt(process.env.PORT) || 8080
bot.startWebhook(path, null, port)
console.info('Bot is up and running on port', port)
