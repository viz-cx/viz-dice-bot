import { findUser, getAllPayoutsSum, getLatestLottery, Lottery, LotteryModel } from "./models"
import { VIZ } from './helpers/viz'
import { AwardModel, getAwardsSum, getLatestAward, Award, getAllAwardsSum, participantsCount, getAllAwards } from "./models/Award"
import { bot } from "./helpers/bot"
import { i18n } from "./helpers/i18n"
import { DocumentType } from "@typegoose/typegoose"

const viz = new VIZ()
var currentBlock: number = 0

export function startLottery() {
    var promises = Promise.all([viz.getDynamicGlobalProperties()])
    if (currentBlock === 0) {
        promises = Promise.all([
            viz.getDynamicGlobalProperties(),
            getLatestAward(),
            getLatestLottery()
        ])
    }
    promises.then(
        async resolve => {
            const lastIrreversibleBlock = parseInt(resolve[0]['last_irreversible_block_num'])
            if (currentBlock === 0) {
                const latestAward = resolve[1] as DocumentType<Award>
                const latestLottery = resolve[2] as DocumentType<Lottery>
                if (latestAward.block > latestLottery.block) {
                    currentBlock = latestAward.block + 1
                } else {
                    currentBlock = latestLottery.block + 1
                }
                // currentBlock = lastIrreversibleBlock
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
    var currentLottery = new LotteryModel()
    currentLottery.block = currentBlock
    const latestLotteryBlock = (await getLatestLottery()).block
    const participantCount = await participantsCount(latestLotteryBlock)
        .then(participants => participants)
    if (participantCount > 0) {
        const currentAwards = await getAllAwards(latestLotteryBlock)
        const participants = await Promise.all(
            [...new Set(currentAwards.map(award => award.userID))]
                .map(async userID => findUser(userID).then(user => user))
        )
        await viz.getBlockHeader(currentBlock).then(
            async result => {
                const hashSumResult = hashSum(result['previous'] + result['witness'])
                const winnerCode = hashSumResult % participants.length
                const winner = participants[winnerCode]
                currentLottery.winner = winner.login
                const allAwardsSum = await getAllAwardsSum()
                const allPayoutsSum = await getAllPayoutsSum()
                const fund = allAwardsSum - allPayoutsSum
                var prize = fund
                const winnerAwardSum = currentAwards
                    .filter(award => award.userID == winner.id)
                    .reduce((prev, award) => prev + award.shares, 0)
                const maxWinnerPrize = winnerAwardSum * participants.length
                if (prize > maxWinnerPrize) {
                    prize = maxWinnerPrize
                }
                currentLottery.amount = prize
                await viz.pay(winner.login, prize).then(
                    _ => {
                        console.log("Successful payout to", winner.login, "prize", prize)
                        const payload = {
                            block: currentBlock,
                            winner: winner.login,
                            hashSum: hashSumResult,
                            count: participants.length,
                            users: participants.map(u => u.login).join(', '),
                            prize: prize.toFixed(3),
                            fund: fund.toFixed(3)
                        }
                        participants.forEach(u => {
                            try {
                                bot.telegram.sendMessage(u.id, i18n.t(u.language, 'lottery_result', payload), { parse_mode: 'HTML', disable_web_page_preview: true })
                            } catch (e) {
                                console.log(e)
                            }
                        })
                        // TODO: write result to blockchain: lottery number, block number, winner, hashsum, participants
                    },
                    failure => sendToAdmin('Failed to pay winner ' + winner.login + ' with prize ' + prize + ' with error ' + failure)
                ).catch(error => { sendToAdmin(error) })
            },
            rejected => sendToAdmin('Get block header failed: ' + rejected)
        ).catch(error => sendToAdmin(error))
    } else {
        console.log('Lottery was closed in block', currentBlock, 'without winner')
    }
    await currentLottery.save().catch(error => sendToAdmin('Lottery not saved because ' + error))
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
        await findUser(userID).then(
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
                var withMessage: boolean = data.initiator == user.login
                // console.log(participants)
                var award = new AwardModel()
                award.block = currentBlock
                award.initiator = data.initiator
                award.userID = user.id
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
    var winnerBlockDelimiter: number
    if (process.env.PRODUCTION === "false") {
        winnerBlockDelimiter = 100
    } else {
        winnerBlockDelimiter = parseInt(process.env.LOTTERY) * 60 * 60 / 3
    }
    if (currentBlock % winnerBlockDelimiter === 0) {
        await findWinner()
    }
}

function hashSum(s: string): number {
    return s.split('').reduce(function (a, b) {
        a = ((a << 5) - a) + b.charCodeAt(0)
        return Math.abs(a & a)
    }, 0)
}

function sendToAdmin(message: string) {
    console.log(message)
    const myUserID = 38968897
    bot.telegram.sendMessage(myUserID, message)
}
