import { findUser, getLatestLottery, LotteryModel } from "./models"
import { VIZ } from './helpers/viz'
import { AwardModel } from "./models/Award"
import { bot } from "./helpers/bot"

const viz = new VIZ()
var blockID: number = 0
var participants = new Map<string, string>() // login => shares

export function startLottery() {
    Promise.all([
        viz.getDynamicGlobalProperties(),
        getLatestLottery()
    ]).then(
        async resolve => {
            const lastIrreversibleBlock = parseInt(resolve[0]['last_irreversible_block_num'])
            if (blockID === 0) {
                blockID = resolve[1].block + 1 // lastIrreversibleBlock
            }
            // console.log("Lottery continued from block", blockID)
            while (lastIrreversibleBlock > blockID) {
                await processBlock(blockID).then(() => blockID++)
            }
        },
        rejectReason => {
            console.log("Unable to start lottery: " + rejectReason)
            viz.changeNode()
        }
    ).finally(() => setTimeout(startLottery, 15000))
}

async function processBlock(blockNumber: number) {
    const winnerBlockDelimiter = parseInt(process.env.LOTTERY) * 60 * 60 / 3
    if (blockNumber % winnerBlockDelimiter === 0) {
        console.log("Looking for a winner")
        var lottery = new LotteryModel()
        lottery.block = blockNumber
        if (participants.size > 0) {
            await viz.getBlockHeader(blockID).then(
                result => {
                    const hashCode = function (s: string): number {
                        return s.split('').reduce(function (a, b) {
                            a = ((a << 5) - a) + b.charCodeAt(0)
                            return Math.abs(a & a)
                        }, 0)
                    }
                    const code = hashCode(result['previous'] + result['witness'])
                    console.log("Random code from block info:", code)
                    const winnerCode = code % participants.size
                    const winner = Array.from(participants.keys())[winnerCode]
                    console.log("Winner", winner)
                    lottery.winner = winner
                    var prize = Array.from(participants.values()).reduce((prev, current) => prev + parseFloat(current), 0)
                    const maxParticipantPrize = parseFloat(participants.get(winner)) * participants.size
                    if (prize > maxParticipantPrize) {
                        prize = maxParticipantPrize
                    }
                    viz.pay(winner, prize, "🔮🎩✨").then(
                        _ => {
                            console.log("Successful payout to", winner, "prize", prize)
                            // TODO: send message to all participants
                            const myUserID = 38968897
                            bot.telegram.sendMessage(myUserID, 'Lottery was closed. Winner: ' + winner)
                        },
                        failure => console.log("Failure to pay", failure)
                    )
                },
                rejected => {
                    console.log("Block header rejected:", rejected)
                    return
                })
        } else {
            console.log('Lottery was closed without winner because no participants')
            // TODO: send message to all
            const myUserID = 38968897
            bot.telegram.sendMessage(myUserID, 'Lottery was closed without winner because no participants')
        }
        await lottery.save().then(
            _ => clearParticipants(),
            rejected => {
                console.log(rejected)
                return
            }
        )
    }
    await viz.getOpsInBlock(blockNumber).then(result => {
        for (const i in result) {
            const operation = result[i].op[0]
            if (operation === 'receive_award') {
                const data = result[i].op[1]
                if (data.receiver === process.env.ACCOUNT && data.memo !== '') {
                    const userID = parseInt(data.memo)
                    if (isNaN(userID)) { continue }
                    findUser(userID)
                        .then(user => {
                            const shares = parseFloat(data.shares)
                            if (participants.has(user.login)) {
                                participants.set(user.login, participants.get(user.login) + shares)
                            } else {
                                participants.set(user.login, shares.toString())
                            }
                            // console.log(participants)
                            var award = new AwardModel()
                            award.block = blockID
                            award.initiator = user.login
                            award.shares = data.shares
                            award.save().then(
                                _ => console.log("New award", data.shares, "from", data.initiator, "with memo", data.memo),
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

function clearParticipants() {
    participants = new Map()
}