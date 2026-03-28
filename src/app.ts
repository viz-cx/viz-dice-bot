import bot from './bot'

bot.start({
    onStart: (botInfo) => console.info(`Bot ${botInfo.username} is up and running`),
})
