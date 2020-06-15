import bot from './bot'

const domain = process.env.DOMAIN || ''
if (!domain) {
    console.error('You should set DOMAIN environment with / at the end')
}
const path = process.env.SECRET_PATH || '/secret-path'
const port = parseInt(process.env.PORT) || 8080

bot.telegram.setWebhook(domain + path)
bot.startWebhook(path, null, port)
console.info('Bot is up and running on port', port)
