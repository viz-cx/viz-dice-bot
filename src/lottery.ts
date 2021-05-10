import { findUser, getLatestLottery, LotteryModel } from "./models"
import { VIZ } from './helpers/viz'
import { AwardModel, removeAllAwards, getAwardsSum, getLatestAward } from "./models/Award"
import { bot } from "./helpers/bot"
import { i18n } from "./helpers/i18n"

const viz = new VIZ()
var currentBlock: number = 0
var lastNotificationBlock: number = 0
var participants = new Map<number, number>() // telegramID => shares

export function startLottery() {
    Promise.all([
        viz.getDynamicGlobalProperties(),
        getLatestLottery()
    ]).then(
        async resolve => {
            const lastIrreversibleBlock = parseInt(resolve[0]['last_irreversible_block_num'])
            if (currentBlock === 0) {
                lastNotificationBlock = (await getLatestAward()).block
                if (!removeAllAwards()) {
                    console.log("Awards not deleted")
                }
                currentBlock = resolve[1].block + 1 // lastIrreversibleBlock
                console.log("Lottery continued from block", currentBlock)
            }
            while (lastIrreversibleBlock > currentBlock) {
                await processNextBlock().then(() => currentBlock++)
            }
        },
        rejectReason => {
            console.log("Unable to start lottery: " + rejectReason)
            viz.changeNode()
        }
    ).finally(() => setTimeout(startLottery, 15000))
}

async function processNextBlock() {
    const winnerBlockDelimiter = parseInt(process.env.LOTTERY) * 60 * 60 / 3
    if (currentBlock % winnerBlockDelimiter === 0) {
        var lottery = new LotteryModel()
        lottery.block = currentBlock
        if (participants.size > 0) {
            const users = (await Promise.all(Array.from(participants.keys())
                .map(telegramID => findUser(telegramID))))
                .filter(u => u.login !== '')
            await Promise.all([
                users,
                viz.getBlockHeader(currentBlock)
            ]).then(
                async result => {
                    const users = result[0]
                    const blockHeader = result[1]
                    const hashSumResult = hashSum(blockHeader['previous'] + blockHeader['witness'])
                    const winnerCode = hashSumResult % users.length
                    const winner = users[winnerCode]
                    lottery.winner = winner.login
                    var prize = Array.from(participants.values()).reduce((prev, current) => prev + current, 0)
                    const maxWinnerPrize = participants.get(winner.id) * participants.size
                    if (prize > maxWinnerPrize) {
                        prize = maxWinnerPrize
                    }
                    await viz.pay(winner.login, prize, "🔮🎩✨").then(
                        _ => {
                            console.log("Successful payout to", winner.login, "prize", prize)
                            const payload = {
                                block: currentBlock,
                                winner: winner.login,
                                hashSum: hashSumResult,
                                count: users.length,
                                users: users.map(u => u.login).join(', ')
                            }
                            users.forEach(u => bot.telegram.sendMessage(u.id, i18n.t(u.language, 'lottery_result', payload), { parse_mode: 'HTML', disable_web_page_preview: true }))
                            // TODO: write result to blockchain: lottery number, block number, winner, hashsum, participants
                        },
                        failure => sendToAdmin('Failed to pay winner ' + winner.login + ' with prize ' + prize + ' with error ' + failure)
                    )
                },
                rejected => sendToAdmin('Get block header failed: ' + rejected)
            )
        } else {
            console.log('Lottery was closed in block', currentBlock, 'without winner')
        }
        await lottery.save().then(
            _ => { },
            rejected => sendToAdmin('Lottery not saved because ' + rejected)
        ).finally(() => clearParticipants())
    }
    await viz.getOpsInBlock(currentBlock)
        .then(
            result => {
                for (const i in result) {
                    const operation = result[i].op[0]
                    if (operation === 'receive_award') {
                        const data = result[i].op[1]
                        if (data.receiver === process.env.ACCOUNT && data.memo !== '') {
                            const userID = parseInt(data.memo)
                            if (isNaN(userID)) {
                                console.log('Bet failed: empty memo from', data.initiator, 'with', data.shares)
                                continue
                            }
                            findUser(userID).then(
                                user => {
                                    if (!user.login) {
                                        console.log('Bet failed: empty login for id', user.id, 'with', data.shares)
                                        return
                                    }
                                    // anti-spam
                                    var withMessage = lastNotificationBlock < currentBlock
                                    if (data.initiator !== user.login) { withMessage = false }
                                    const shares = parseFloat(data.shares)
                                    addShares(user.id, shares)
                                    // console.log(participants)
                                    var award = new AwardModel()
                                    award.block = currentBlock
                                    award.initiator = data.initiator
                                    award.shares = parseFloat(data.shares)
                                    Promise.all([
                                        award.save(),
                                        getLatestLottery()
                                    ]).then(
                                        result => {
                                            console.log("New award", data.shares, "from", data.initiator, "with memo", data.memo)
                                            if (withMessage) {
                                                getAwardsSum(user.login, result[1].block)
                                                    .then(
                                                        sum => {
                                                            const firstTime = sum[0]["sum"] == award.shares
                                                            const payload = {
                                                                sum: sum[0]["sum"].toFixed(3),
                                                                firstTime: firstTime
                                                            }
                                                            bot.telegram.sendMessage(userID, i18n.t(user.language, 'new_award', payload))
                                                        },
                                                        rejected => console.log(rejected)
                                                    )
                                            }
                                        },
                                        rejected => console.log(rejected)
                                    )
                                })
                        }
                    }
                }
            },
            rejected => {
                console.log("Rejected: ", rejected)
                viz.changeNode()
            }
        )
}

function hashSum(s: string): number {
    return s.split('').reduce(function (a, b) {
        a = ((a << 5) - a) + b.charCodeAt(0)
        return Math.abs(a & a)
    }, 0)
}

function addShares(telegramID: number, shares: number) {
    if (participants.has(telegramID)) {
        participants.set(telegramID, participants.get(telegramID) + shares)
    } else {
        participants.set(telegramID, shares)
    }
}

function clearParticipants() {
    participants = new Map()
}

function sendToAdmin(message: string) {
    console.log(message)
    const myUserID = 38968897
    bot.telegram.sendMessage(myUserID, message)
}
