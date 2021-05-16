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
        getUsersByLang(lang)
            .then(async users => {
                const messages = users
                    .map(u => u.id)
                    .map(userID => {
                        return bot.telegram.forwardMessage(
                            userID,
                            russianChannelID,
                            channelMessageID)
                    })
                Promise.allSettled(messages)
                    .then(result => {
                        const sendedMessages = result.map(msg => msg.status).filter(status => status == 'fulfilled').length
                        bot.telegram.sendMessage(myUserID, 'Post successfully sended to ' + sendedMessages + ' users')
                    })
            })
    } else {
        next()
    }
}
