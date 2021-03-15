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
        getUsersByLang(lang).then(users =>
            users
                .map(u => u.id)
                .forEach(userID => {
                    bot.telegram.forwardMessage(
                        userID,
                        russianChannelID,
                        channelMessageID)
                        .then(_ => console.log("Success sended post to", userID))
                        .catch(err => console.log("Error send post to", userID))
                })
        )
    } else {
        next()
    }
}
