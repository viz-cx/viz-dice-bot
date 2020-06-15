import bot from './bot'

bot.launch({
    webhook: {
        domain: process.env.DOMAIN,
        hookPath: process.env.SECRET,
        port: parseInt(process.env.PORT) || 8080
    }
})
console.info('Bot is up and running')
