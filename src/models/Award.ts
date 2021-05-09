import { prop, getModelForClass, DocumentType } from '@typegoose/typegoose'

export class Award {
    @prop({ required: true, index: true })
    block: number

    @prop({ required: true })
    initiator: string

    @prop({ required: true })
    shares: number
}

export const AwardModel = getModelForClass(Award, {
    schemaOptions: { timestamps: false },
})

export async function getAwardSum(initiator: string, afterBlock: number): Promise<DocumentType<Object>> {
    return await AwardModel.aggregate([
        { $match: { initiator: initiator, block: { $gte: afterBlock } } },
        { $group: { _id: null, sum: { $sum: "$shares" } } }
    ]).exec()
}

export async function removeAllAwards(): Promise<boolean> {
    return (await AwardModel.deleteMany({})).ok == 1
}

export async function isParticipated(login: string, fromBlock: number): Promise<Boolean> {
    return await AwardModel.countDocuments({ initiator: login, block: { $gte: fromBlock } }).exec() > 0
}

export async function getLatestAward(): Promise<DocumentType<Award>> {
    const count = await AwardModel.countDocuments().exec()
    if (count === 0) {
        var l = new AwardModel()
        l.block = 1
        l.initiator = ''
        l.shares = 0
        return l
    }
    return await AwardModel.findOne().sort({ block: -1 })
}
