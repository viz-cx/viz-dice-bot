import { getUsersByLang } from '../models/User'
import { Context } from 'telegraf'
import { bot } from '../helpers/bot'

export async function checkForward(ctx: Context, next: () => any) {
    const myUserID = 38968897
    const russianChannelID = -1001277359853
    const lang = 'ru'
    if (ctx.updateType === 'message'
        && ctx.chat.id === myUserID
        && ctx.message.forward_from_chat
        && ctx.message.forward_from_chat.id === russianChannelID) {
        const channelMessageID = ctx.message.forward_from_message_id
        await getUsersByLang(lang)
            .then(async users => {
                var users = users
                console.log('Start sending to', users.length, 'users')
                var successCounter = 0
                while (users.length > 0) {
                    const messages = users.splice(0, 29)
                        .map(u => u.id)
                        .map(userID => {
                            return bot.telegram.forwardMessage(
                                userID,
                                russianChannelID,
                                channelMessageID)
                        })
                    await Promise.allSettled(messages)
                        .then(result => {
                            const sendedMessages = result.map(msg => msg.status).filter(status => status == 'fulfilled').length
                            console.log('Successfully sended to', sendedMessages, 'users. Now waiting...')
                            successCounter += sendedMessages
                        })
                    await sleep(3000)
                }
                await bot.telegram.sendMessage(myUserID, 'Post successfully sended to ' + successCounter + ' users')
            })
    } else {
        next()
    }
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}
