import bot from './bot'

bot.launch()
    .then(_ => console.info(`Bot ${bot.options.username} is up and running`))
    .catch(error => console.log(`Error: ${error}`))
