/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { getTopLuckers } from "../models"
import { Telegraf, Context } from "telegraf"
import { getMarkdownTable } from 'markdown-table-ts'


export function setupTop(bot: Telegraf<Context>) {
    bot.command(['topByCount'],  ctx => {
        sendTopByCount(ctx)
    })
    bot.command(['top', 'topBySum'],  ctx => {
        sendTopBySum(ctx)
    })
}

function sendTopBySum(ctx: Context) {
    getTopLuckers('sum').then(results => {
        const md = '```\n' + getMarkdownTable({
            table: {
                head: ['User', 'Sum'],
                body: results.map(v => [String(v.winner), String(v.sum.toFixed(2))]),
            },
        }) + '\n```'
        ctx.replyWithMarkdown(md).catch(err => {
            console.error('Failed to send message with Markdown:', err);
        });
    }).catch(err => {
        console.error('Failed to get top luckers by count:', err);
    });
}

function sendTopByCount(ctx: Context) {
    getTopLuckers('count').then(results => {
        const md = '```\n' + getMarkdownTable({
            table: {
                head: ['User', 'Count'],
                body: results.map((v: { winner: string, count: number }) => [String(v.winner), String(v.count)]),
            },
        }) + '\n```';
        ctx.replyWithMarkdown(md).catch(err => {
            console.error('Failed to send message with Markdown:', err);
        });
    }).catch(err => {
        console.error('Failed to get top luckers by count:', err);
    });
}
