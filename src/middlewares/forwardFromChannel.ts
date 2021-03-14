import { getUsersByLang } from '../models/User'
import { Context } from 'telegraf'

export async function checkForward(ctx: Context, next: () => any) {
    const myUserID = 38968897
    const russianChannelID = -1001277359853
    const lang = 'ru'
    if (ctx.updateType === 'message'
        && ctx.chat.id === myUserID
        && ctx.message.forward_from_chat
        && ctx.message.forward_from_chat.id === russianChannelID) {
        getUsersByLang(lang).then(users =>
            users
                .map(u => u.id)
                .forEach(id => {
                    ctx.telegram.forwardMessage(
                        myUserID,
                        ctx.message.forward_from_chat.id,
                        ctx.message.forward_from_message_id)
                        .then(_ => console.log("Success sended post to", id))
                        .catch(_ => console.log("Error sended post to", id))
                })
        )
    } else {
        next()
    }
}
