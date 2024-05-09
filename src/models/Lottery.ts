import { prop, getModelForClass, DocumentType } from '@typegoose/typegoose'

export type LotteryType = 'fish' | 'dolphin' | 'whale'

export class Lottery {
    @prop({ required: true })
    block: number

    @prop({ required: true, enum: ['fish', 'dolphin', 'whale'] })
    type: LotteryType

    @prop({ required: false })
    winner: string

    @prop({ required: true, default: 0 })
    amount: number
}

export const LotteryModel = getModelForClass(Lottery, {
    schemaOptions: { timestamps: true },
})

export async function getLatestLottery(): Promise<DocumentType<Lottery>> {
    const count = await LotteryModel.countDocuments().exec()
    if (count === 0) {
        const l = new LotteryModel()
        l.block = 0
        l.winner = ''
        l.type = 'fish'
        l.amount = 0
        return l
    }
    return await LotteryModel.findOne().sort({ block: -1 })
}

export async function getTopLuckers(sortBy = "count") {
    return await LotteryModel.aggregate([
        {
            $group: {
                _id: { "name": "$winner" },
                winner: { "$first": "$winner" },
                count: { "$sum": 1 },
                sum: { "$sum": "$amount" }
            }
        },
        { $sort: { [sortBy]: -1 } },
        { $limit: 10 }
    ]).exec()
}

export async function getAllPayoutsSum(): Promise<number> {
    const result = await LotteryModel.aggregate([
        { $match: { amount: { $gt: 0 } } },
        { $group: { _id: null, sum: { $sum: "$amount" } } }
    ]).exec()
    if (result.length === 0) {
        return 0
    }
    return parseFloat(result[0]["sum"])
}
