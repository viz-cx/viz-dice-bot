import { prop, getModelForClass, DocumentType } from '@typegoose/typegoose'

export class Award {
    @prop({ required: true, index: true })
    block: number

    @prop({ required: true })
    initiator: string

    @prop({ required: true, default: 0 })
    userID: number

    @prop({ required: true })
    shares: number
}

export const AwardModel = getModelForClass(Award, {
    schemaOptions: { timestamps: false },
})

export async function getAwardsSum(userID: number, afterBlock: number): Promise<number> {
    const result = await AwardModel.aggregate([
        { $match: { userID: userID, block: { $gt: afterBlock } } },
        { $group: { _id: null, sum: { $sum: "$shares" } } }
    ]).exec()
    if (result.length === 0) {
        return 0
    }
    return parseFloat(result[0]["sum"])
}

export async function getAllAwardsSum(): Promise<number> {
    const result = await AwardModel.aggregate([
        { $group: { _id: null, sum: { $sum: "$shares" } } }
    ]).exec()
    if (result.length === 0) {
        return 0
    }
    return parseFloat(result[0]["sum"])
}

export async function getAllAwards(afterBlock: number): Promise<DocumentType<Award>[]> {
    return await AwardModel.find({ block: { $gt: afterBlock } })
}

export async function getAllAwardsByUserID(userID: number, afterBlock: number): Promise<DocumentType<Award>[]> {
    return await AwardModel.find({ userID: userID, block: { $gt: afterBlock } })
}

export async function participantsCount(afterBlock: number, userID: number): Promise<number> {
    return (await getWorthyLotteryParticipantIDs(afterBlock, userID)).length
}

export async function isParticipated(userID: number, afterBlock: number): Promise<Boolean> {
    const worthyUserIDs = await participantsCount(afterBlock, userID)
    return worthyUserIDs > 0
}

export async function getLatestAward(): Promise<DocumentType<Award>> {
    const count = await AwardModel.countDocuments().exec()
    if (count === 0) {
        var l = new AwardModel()
        l.block = 1
        l.initiator = 'id'
        l.shares = 0
        return l
    }
    return await AwardModel.findOne().sort({ block: -1 })
}

export async function getWorthyLotteryParticipantIDs(afterBlock: number, userID: number = null): Promise<number[]> {
    let currentAwards: DocumentType<Award>[]
    if (!userID) {
        currentAwards = await getAllAwards(afterBlock)
    } else {
        currentAwards = await getAllAwardsByUserID(userID, afterBlock)
    }
    let sumByUser = {}
    currentAwards.forEach(function (a) {
        if (sumByUser.hasOwnProperty(a.userID)) {
            sumByUser[a.userID] = sumByUser[a.userID] + a.shares
        } else {
            sumByUser[a.userID] = a.shares
        }
    })
    let worthyUserIDs = []
    const worthyBet = parseInt(process.env.LOTTERY_WORTHY_BET)
    for (var userIDStr in sumByUser) {
        let shares = sumByUser[userIDStr]
        let userID = parseInt(userIDStr)
        if (shares >= worthyBet) {
            worthyUserIDs.push(userID)
        }
    }
    return worthyUserIDs
}
