import { getTopLuckers } from "../models"
import { Telegraf, Context } from "telegraf"
import { Align, getMarkdownTable } from 'markdown-table-ts'


export function setupTop(bot: Telegraf<Context>) {
    bot.command('top', async ctx => {
        sendTop(ctx)
    })
}

function sendTop(ctx: Context) {
    getTopLuckers().then(results => {
        const md = '```\n' + getMarkdownTable({
            table: {
                head: ['Winner', 'Count', 'Sum'],
                body: results.map(v => [String(v.winner), String(v.count), String(v.sum.toFixed(2))]),
            },
        }) + '\n```'
        console.log(md)
        ctx.replyWithMarkdown(md)
    })
}
