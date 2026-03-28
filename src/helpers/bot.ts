import { Bot } from 'grammy'
import { BotContext } from '../types/context'

export const bot = new Bot<BotContext>(process.env.TOKEN)
