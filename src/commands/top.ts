import { getTopLuckers } from "../models"
import { Bot } from "grammy"
import { BotContext } from "../types/context"
import { getMarkdownTable } from 'markdown-table-ts'


export function setupTop(bot: Bot<BotContext>) {
    bot.command('topByCount', ctx => {
        sendTopByCount(ctx)
    })
    bot.command(['top', 'topBySum'], ctx => {
        sendTopBySum(ctx)
    })
}

function sendTopBySum(ctx: BotContext) {
    getTopLuckers('sum').then(results => {
        const md = '```\n' + getMarkdownTable({
            table: {
                head: ['User', 'Sum'],
                body: results.map(v => [String(v.winner), String(v.sum.toFixed(2))]),
            },
        }) + '\n```'
        ctx.reply(md, { parse_mode: 'Markdown' }).catch(err => {
            console.error('Failed to send message with Markdown:', err);
        });
    }).catch(err => {
        console.error('Failed to get top luckers by count:', err);
    });
}

function sendTopByCount(ctx: BotContext) {
    getTopLuckers('count').then(results => {
        const md = '```\n' + getMarkdownTable({
            table: {
                head: ['User', 'Count'],
                body: results.map((v: { winner: string, count: number }) => [String(v.winner), String(v.count)]),
            },
        }) + '\n```';
        ctx.reply(md, { parse_mode: 'Markdown' }).catch(err => {
            console.error('Failed to send message with Markdown:', err);
        });
    }).catch(err => {
        console.error('Failed to get top luckers by count:', err);
    });
}
