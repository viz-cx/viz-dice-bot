import bot from './bot'

void bot.start({
    onStart: (botInfo) => console.info(`Bot ${botInfo.username} is up and running`),
})
