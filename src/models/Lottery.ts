import { prop, getModelForClass, DocumentType } from '@typegoose/typegoose'

export class Lottery {
    @prop({ required: true, index: true, unique: true })
    block: number

    @prop({ required: false })
    winner: string
}

export const LotteryModel = getModelForClass(Lottery, {
    schemaOptions: { timestamps: true },
})

export async function getLatestLottery(): Promise<DocumentType<Lottery>> {
    const count = await LotteryModel.countDocuments().exec()
    if (count === 0) {
        var l = new LotteryModel()
        l.block = 0
        l.winner = ''
        return l
    }
    return await LotteryModel.findOne().sort({ block: -1 })
}
