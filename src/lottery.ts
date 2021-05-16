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
                if (process.env.PRODUCTION === "false") {
                    currentBlock = lastIrreversibleBlock + 1
                } else {
                    lastNotificationBlock = (await getLatestAward()).block
                    await removeAllAwards()
                    currentBlock = resolve[1].block + 1 // lastIrreversibleBlock
                }
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

async function findWinner() {
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
                const fund = Array.from(participants.values()).reduce((prev, current) => prev + current, 0)
                var prize = fund
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
                            users: users.map(u => u.login).join(', '),
                            prize: prize.toFixed(3),
                            fund: fund.toFixed(3)
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

async function processAward(data: BlockchainAward) {
    if (data.receiver === process.env.ACCOUNT && data.memo !== '') {
        const userID = parseInt(data.memo)
        if (isNaN(userID)) {
            sendToAdmin('Bet failed: empty memo from ' + data.initiator + ' with ' + data.shares)
            return
        }
        if (userID === 0) {
            sendToAdmin('Bet failed: memo from ' + data.initiator + ' with memo ' + data.memo + ' and ' + data.shares)
            return
        }
        findUser(userID).then(
            user => {
                if (!user || !user.id) {
                    sendToAdmin('User with user id ' + userID + ' not found')
                    return
                }
                if (!user.login) {
                    sendToAdmin('Bet failed: empty login for id ' + user.id + ' with ' + data.shares)
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
                                        const firstTime = sum == award.shares
                                        const payload = {
                                            sum: sum.toFixed(3),
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

class BlockchainAward {
    block: number
    initiator: string
    shares: string
    receiver: string
    memo: string
}

async function processNextBlock() {
    var winnerBlockDelimiter: number
    if (process.env.PRODUCTION === "false") {
        winnerBlockDelimiter = 100
    } else {
        winnerBlockDelimiter = parseInt(process.env.LOTTERY) * 60 * 60 / 3
    }
    if (currentBlock % winnerBlockDelimiter === 0) {
        await findWinner()
    }
    await viz.getOpsInBlock(currentBlock)
        .then(
            result => {
                for (const i in result) {
                    const operation = result[i].op[0]
                    if (operation === 'receive_award') {
                        const awardOperation: BlockchainAward = result[i].op[1]
                        processAward(awardOperation)
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
