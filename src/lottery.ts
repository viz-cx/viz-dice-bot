/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { findUser, getAllPayoutsSum, getLatestLottery, Lottery, LotteryModel } from "./models"
import { VIZ } from './helpers/viz'
import { AwardModel, getAwardsSum, getLatestAward, Award, getAllAwardsSum, getAllAwards } from "./models/Award"
import { bot } from "./helpers/bot"
import { i18n } from "./helpers/i18n"
import { DocumentType } from "@typegoose/typegoose"
import { mainKeyboardByLanguage } from "./commands/start"
import { lotteryParams } from "./commands/lottery"

const viz = VIZ.origin
let currentBlock = 0

export function startLottery() {
    let promises: Promise<object[]> = Promise.all([viz.getDynamicGlobalProperties()])
    if (currentBlock === 0) {
        promises = Promise.all([
            viz.getDynamicGlobalProperties(),
            getLatestAward(),
            getLatestLottery()
        ])
    }
    promises.then(
        async resolve => {
            const lastIrreversibleBlock = parseInt((resolve[0] as { last_irreversible_block_num: string }).last_irreversible_block_num)
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
    const currentAwards: DocumentType<Award>[] = await getAllAwards(fromBlock)
    const sumByUser: Record<string, number> = {}
    currentAwards.forEach(function (a) {
        if (Object.prototype.hasOwnProperty.call(sumByUser, a.userID)) {
            sumByUser[a.userID] += a.shares
        } else {
            sumByUser[a.userID] = a.shares
        }
    })
    const fishIDs: number[] = [], dolphinIDs: number[] = [], whaleIDs: number[] = []
    for (const userIDStr in sumByUser) {
        const shares = sumByUser[userIDStr]
        const userID = parseInt(userIDStr)
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
        const previous = String(blockHeader['previous'])
        const witness = String(blockHeader['witness'])
        const hashSumResult = hashSum(previous + witness)
        const allAwardsSum = await getAllAwardsSum()
        const allPayoutsSum = await getAllPayoutsSum()
        const fund = allAwardsSum - allPayoutsSum

        const fishParticipants = await Promise.all(fishIDs.map(userID => findUser(userID)))
        const dolphinParticipants = await Promise.all(dolphinIDs.map(userID => findUser(userID)))
        const whaleParticipants = await Promise.all(whaleIDs.map(userID => findUser(userID)))
        const allParticipants = [...fishParticipants, ...dolphinParticipants, ...whaleParticipants]
        let messagePayload = {}
        messagePayload = { ...messagePayload, fishWinner: '', dolphinWinner: '', whaleWinner: '' }
        const pays: Promise<object>[] = []

        if (fishParticipants.length > 0) {
            const fishWinnerCode = hashSumResult % fishParticipants.length
            const fishWinner: { id: number; login: string } = fishParticipants[fishWinnerCode]
            let fishPrize = fund
            const winnerAwardSum = await getAwardsSum(fishWinner.id, latestLotteryBlock)
            const maxFishWinnerPrize = winnerAwardSum * fishParticipants.length
            if (fishPrize > maxFishWinnerPrize) {
                fishPrize = maxFishWinnerPrize
            }
            console.log('Fish winner', fishWinner.login, 'with price', fishPrize)
            pays.push(viz.pay(fishWinner.login, fishPrize))
            const fishLottery = new LotteryModel()
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
            let dolphinPrize = fund
            const winnerAwardSum = await getAwardsSum(Number(dolphinWinner.id), latestLotteryBlock)
            const maxdolphinWinnerPrize = winnerAwardSum * dolphinParticipants.length
            if (dolphinPrize > maxdolphinWinnerPrize) {
                dolphinPrize = maxdolphinWinnerPrize
            }
            console.log('Dolphin winner', dolphinWinner.login, 'with price', dolphinPrize)
            pays.push(viz.pay(dolphinWinner.login, dolphinPrize))
            const dolphinLottery = new LotteryModel()
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
            let whalePrize = fund
            const winnerAwardSum = await getAwardsSum(Number(whaleWinner.id), latestLotteryBlock)
            const maxwhaleWinnerPrize = winnerAwardSum * whaleParticipants.length
            if (whalePrize > maxwhaleWinnerPrize) {
                whalePrize = maxwhaleWinnerPrize
            }
            console.log('Whale winner', whaleWinner.login, 'with price', whalePrize)
            pays.push(viz.pay(whaleWinner.login, whalePrize))
            const whaleLottery = new LotteryModel()
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
            async () => {
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
                await Promise.all(allParticipants.map(async u => {
                    try {
                        if (typeof u.id === 'string' || typeof u.id === 'number') {
                            await bot.telegram.sendMessage(u.id, i18n.t(u.language, 'lottery_result', messagePayload), { parse_mode: 'HTML', disable_web_page_preview: true });
                        } else {
                            throw new Error('Invalid user id');
                        }
                    } catch (e) {
                        console.log(e);
                    }
                }));
                // TODO: write result to blockchain: lottery number, block number, winner, hashsum, participants
            },
            async failure => await sendToAdmin('Failed to pay winners: ' + String(failure))
        ).catch(async (error: string) => { await sendToAdmin('Error: ' + error) })
    } catch (err) {
        console.log('Finding winners error: ', err)
        await sendToAdmin(String(err))
    }
}

export function accountLink(account: string, prefix: string): string {
    return prefix + '<a href="https://info.viz.world/accounts/' + account + '/">' + account + '</a>'
}

async function processAward(data: BlockchainAward) {
    if (data.receiver === process.env.ACCOUNT && data.memo !== '') {
        const userID = parseInt(data.memo)
        if (isNaN(userID) || userID === 0) {
            await sendToAdmin('Bet failed: empty userID from ' + data.initiator + ' with ' + data.shares)
            return
        }
        await findUser(userID).then(
            async user => {
                if (!user || !user.id) {
                    await sendToAdmin('User with user id ' + userID + ' not found')
                    return
                }
                if (!user.login) {
                    await sendToAdmin('Bet failed: empty login for id ' + user.id + ' with ' + data.shares)
                    return
                }
                // anti-spam
                const withMessage: boolean = data.initiator == user.login
                // console.log(participants)
                const award = new AwardModel()
                award.block = currentBlock
                award.initiator = data.initiator
                award.userID = user.id as number
                award.shares = parseFloat(data.shares)
                Promise.all([
                    award.save(),
                    getLatestLottery()
                ]).then(
                   async result => {
                        console.log("New award", data.shares, "from", data.initiator, "with memo", data.memo)
                        if (withMessage) {
                            await getAwardsSum(user.id as number, result[1].block)
                                .then(
                                    async sum => {
                                        const firstTime = sum == award.shares
                                        await lotteryParams(viz, user).then(
                                            async params => {
                                                const payload = {
                                                    ...params,
                                                    shares: award.shares.toFixed(3),
                                                    sum: sum.toFixed(3),
                                                    firstTime: firstTime
                                                }
                                                await bot.telegram.sendMessage(userID, i18n.t(user.language, 'new_award', payload), {
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
            async result => {
                for (const i in result) {
                    const operation = result[i].op[0] as string;
                    if (operation === 'receive_award') {
                        const awardOperation = result[i].op[1] as BlockchainAward
                        await processAward(awardOperation)
                    }
                }
            },
            rejected => {
                console.log("Rejected: ", rejected)
                viz.changeNode()
            }
        )
    let winnerBlockDelimiter: number
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

async function sendToAdmin(message: string) {
    console.log(message)
    const myUserID = 38968897
    await bot.telegram.sendMessage(myUserID, message)
}
