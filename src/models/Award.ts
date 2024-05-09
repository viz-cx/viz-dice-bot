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

export async function getLatestAward(): Promise<DocumentType<Award>> {
    const count = await AwardModel.countDocuments().exec()
    if (count === 0) {
        let l = new AwardModel()
        l.block = 1
        l.initiator = 'id'
        l.shares = 0
        return l
    }
    return await AwardModel.findOne().sort({ block: -1 })
}
