import { Telegraf } from 'telegraf'
import { Agent } from "node:https";

export const bot = new Telegraf(process.env.TOKEN, {
    telegram: {
        agent: new Agent({ keepAlive: false }),
    },
}) 
