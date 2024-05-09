import { Context, Telegraf } from 'telegraf'
import { Agent } from "node:https";
const TelegrafBot = require('telegraf');

export const bot = new TelegrafBot(process.env.TOKEN, {
    telegram: {
        agent: new Agent({ keepAlive: false }),
    },
}) as Telegraf<Context>
