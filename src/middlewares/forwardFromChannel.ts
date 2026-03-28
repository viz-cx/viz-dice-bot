import { getUsersByLang } from '../models/User'
import { NextFunction } from 'grammy'
import { BotContext } from '../types/context'
import { bot } from '../helpers/bot'

export async function checkForward(ctx: BotContext, next: NextFunction) {
    const myUserID = 38968897
    const russianChannelID = -1001277359853
    const englishChannelID = -1001454664691
    if (ctx.message
        && ctx.chat.id === myUserID
        && ctx.message.forward_origin
        && ctx.message.forward_origin.type === 'channel') {
        const channelID = ctx.message.forward_origin.chat.id
        let lang: string
        if (channelID === russianChannelID) {
            lang = 'ru'
        } else if (channelID === englishChannelID) {
            lang = 'en'
        } else {
            console.log('Unknown channel')
            return
        }
        const channelMessageID = ctx.message.forward_origin.message_id
        await getUsersByLang(lang)
            .then(async users => {
                console.log('Start sending to', users.length, 'users')
                let successCounter = 0
                while (users.length > 0) {
                    const batch = users.splice(0, 29)
                    const messages = batch
                        .map(u => (u as { id: number }).id)
                        .map(userID => {
                            return bot.api.forwardMessage(
                                userID,
                                channelID,
                                channelMessageID)
                        })
                    await Promise.allSettled(messages)
                        .then(result => {
                            const sendedMessagesCount = result.map(msg => msg.status).filter(status => status == 'fulfilled').length
                            console.log('Successfully sended to', sendedMessagesCount, 'users. Now waiting...')
                            successCounter += sendedMessagesCount
                        })
                    await sleep(3000)
                }
                await bot.api.sendMessage(myUserID, 'Post successfully sended to ' + successCounter + ' users')
            })
    } else {
        return next()
    }
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}
