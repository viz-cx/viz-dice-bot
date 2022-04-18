import { findUser, getAllPayoutsSum, getLatestLottery, Lottery, LotteryModel } from "./models"
import { VIZ } from './helpers/viz'
import { AwardModel, getAwardsSum, getLatestAward, Award, getAllAwardsSum, getAllAwards } from "./models/Award"
import { bot } from "./helpers/bot"
import { i18n } from "./helpers/i18n"
import { DocumentType } from "@typegoose/typegoose"
import { mainKeyboardByLanguage } from "./commands/start"
import { lotteryParams } from "./commands/lottery"

const viz = new VIZ()
var currentBlock: number = 0

export function startLottery() {
    var promises: Promise<Object[]> = Promise.all([viz.getDynamicGlobalProperties()])
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
                if (process.env.PRODUCTION === "false") {
                    currentBlock = lastIrreversibleBlock - 10
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

export async function participantIdsByCategory(fromBlock: number): Promise<{
    fishIDs: number[]
    dolphinIDs: number[]
    whaleIDs: number[]
}> {
    let currentAwards: DocumentType<Award>[] = await getAllAwards(fromBlock)
    let sumByUser = {}
    currentAwards.forEach(function (a) {
        if (sumByUser.hasOwnProperty(a.userID)) {
            sumByUser[a.userID] = sumByUser[a.userID] + a.shares
        } else {
            sumByUser[a.userID] = a.shares
        }
    })
    var fishIDs: number[] = [], dolphinIDs: number[] = [], whaleIDs: number[] = []
    for (var userIDStr in sumByUser) {
        let shares = sumByUser[userIDStr]
        let userID = parseInt(userIDStr)
        if (shares >= 10) {
            whaleIDs.push(userID)
        } else if (shares >= 1) {
            dolphinIDs.push(userID)
        } else {
            fishIDs.push(userID)
        }
    }
    return { fishIDs, dolphinIDs, whaleIDs }
}

async function findWinners() {
    try {
        const latestLotteryBlock = (await getLatestLottery()).block
        const { fishIDs, dolphinIDs, whaleIDs } = await participantIdsByCategory(latestLotteryBlock)
        const participantCount = [...fishIDs, ...dolphinIDs, ...whaleIDs].length
        if (participantCount === 0) {
            console.log('Lottery was closed in block', currentBlock, 'without winner')
            return
        }
        const blockHeader = await viz.getBlockHeader(currentBlock)
        const hashSumResult = hashSum(blockHeader['previous'] + blockHeader['witness'])
        const allAwardsSum = await getAllAwardsSum()
        const allPayoutsSum = await getAllPayoutsSum()
        const fund = allAwardsSum - allPayoutsSum

        const fishParticipants = await Promise.all(fishIDs.map(userID => findUser(userID)))
        const dolphinParticipants = await Promise.all(dolphinIDs.map(userID => findUser(userID)))
        const whaleParticipants = await Promise.all(whaleIDs.map(userID => findUser(userID)))
        const allParticipants = [...fishParticipants, ...dolphinParticipants, ...whaleParticipants]
        var messagePayload = {}
        messagePayload = { ...messagePayload, fishWinner: '', dolphinWinner: '', whaleWinner: '' }
        var pays: Promise<Object>[] = []

        if (fishParticipants.length > 0) {
            const fishWinnerCode = hashSumResult % fishParticipants.length
            const fishWinner = fishParticipants[fishWinnerCode]
            var fishPrize = fund
            const winnerAwardSum = await getAwardsSum(fishWinner.id, latestLotteryBlock)
            const maxFishWinnerPrize = winnerAwardSum * fishParticipants.length
            if (fishPrize > maxFishWinnerPrize) {
                fishPrize = maxFishWinnerPrize
            }
            console.log('Fish winner', fishWinner.login, 'with price', fishPrize)
            pays.push(viz.pay(fishWinner.login, fishPrize))
            var fishLottery = new LotteryModel()
            fishLottery.block = currentBlock
            fishLottery.winner = fishWinner.login
            fishLottery.type = 'fish'
            fishLottery.amount = fishPrize
            await fishLottery.save()
            messagePayload = {
                ...messagePayload,
                fishWinner: accountLink(fishWinner.login, '🐟'),
                fishPrize: fishPrize.toFixed(3)
            }
        }

        if (dolphinParticipants.length > 0) {
            const dolphinWinnerCode = hashSumResult % dolphinParticipants.length
            const dolphinWinner = dolphinParticipants[dolphinWinnerCode]
            var dolphinPrize = fund
            const winnerAwardSum = await getAwardsSum(dolphinWinner.id, latestLotteryBlock)
            const maxdolphinWinnerPrize = winnerAwardSum * dolphinParticipants.length
            if (dolphinPrize > maxdolphinWinnerPrize) {
                dolphinPrize = maxdolphinWinnerPrize
            }
            console.log('Dolphin winner', dolphinWinner.login, 'with price', dolphinPrize)
            pays.push(viz.pay(dolphinWinner.login, dolphinPrize))
            var dolphinLottery = new LotteryModel()
            dolphinLottery.block = currentBlock
            dolphinLottery.winner = dolphinWinner.login
            dolphinLottery.type = 'dolphin'
            dolphinLottery.amount = dolphinPrize
            await dolphinLottery.save()
            messagePayload = {
                ...messagePayload,
                dolphinWinner: accountLink(dolphinWinner.login, '🐬'),
                dolphinPrize: dolphinPrize.toFixed(3)
            }
        }

        if (whaleParticipants.length > 0) {
            const whaleWinnerCode = hashSumResult % whaleParticipants.length
            const whaleWinner = whaleParticipants[whaleWinnerCode]
            var whalePrize = fund
            const winnerAwardSum = await getAwardsSum(whaleWinner.id, latestLotteryBlock)
            const maxwhaleWinnerPrize = winnerAwardSum * whaleParticipants.length
            if (whalePrize > maxwhaleWinnerPrize) {
                whalePrize = maxwhaleWinnerPrize
            }
            console.log('Whale winner', whaleWinner.login, 'with price', whalePrize)
            pays.push(viz.pay(whaleWinner.login, whalePrize))
            var whaleLottery = new LotteryModel()
            whaleLottery.block = currentBlock
            whaleLottery.winner = whaleWinner.login
            whaleLottery.type = 'whale'
            whaleLottery.amount = whalePrize
            await whaleLottery.save()
            messagePayload = {
                ...messagePayload,
                whaleWinner: accountLink(whaleWinner.login, '🐳'),
                whalePrize: whalePrize.toFixed(3)
            }
        }

        await Promise.all(pays).then(
            _ => {
                messagePayload = {
                    ...messagePayload,
                    block: currentBlock,
                    hashSum: hashSumResult,
                    count: allParticipants.length,
                    fishUsers: fishParticipants.map(u => accountLink(u.login, '🐟')).join(', '),
                    dolphinUsers: dolphinParticipants.map(u => accountLink(u.login, '🐬')).join(', '),
                    whaleUsers: whaleParticipants.map(u => accountLink(u.login, '🐳')).join(', '),
                    fund: fund.toFixed(3)
                }
                allParticipants.forEach(u => {
                    try {
                        bot.telegram.sendMessage(u.id, i18n.t(u.language, 'lottery_result', messagePayload), { parse_mode: 'HTML', disable_web_page_preview: true })
                    } catch (e) {
                        console.log(e)
                    }
                })
                // TODO: write result to blockchain: lottery number, block number, winner, hashsum, participants
            },
            failure => sendToAdmin('Failed to pay winners ' + failure)
        ).catch(error => { sendToAdmin(error) })
    } catch (err) {
        console.log('Finding winners error: ', err)
        sendToAdmin(err)
        viz.changeNode()
    }
}

export function accountLink(account: string, prefix: string): string {
    return prefix+'<a href="https://info.viz.plus/accounts/' + account + '/">' + account + '</a>'
}

async function processAward(data: BlockchainAward) {
    if (data.receiver === process.env.ACCOUNT && data.memo !== '') {
        const userID = parseInt(data.memo)
        if (isNaN(userID) || userID === 0) {
            sendToAdmin('Bet failed: empty userID from ' + data.initiator + ' with ' + data.shares)
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
                            getAwardsSum(user.id, result[1].block)
                                .then(
                                    sum => {
                                        const firstTime = sum == award.shares
                                        lotteryParams(viz, user).then(
                                            params => {
                                                const payload = {
                                                    ...params,
                                                    shares: award.shares.toFixed(3),
                                                    sum: sum.toFixed(3),
                                                    firstTime: firstTime
                                                }
                                                bot.telegram.sendMessage(userID, i18n.t(user.language, 'new_award', payload), {
                                                    reply_markup: mainKeyboardByLanguage(user.language),
                                                    parse_mode: 'HTML',
                                                    disable_web_page_preview: true
                                                })
                                            }
                                        )
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
        winnerBlockDelimiter = 50
    } else {
        winnerBlockDelimiter = parseInt(process.env.LOTTERY_HOURS) * 60 * 60 / 3
    }
    if (currentBlock % winnerBlockDelimiter === 0) {
        await findWinners()
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
