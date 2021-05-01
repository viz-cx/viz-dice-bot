import { prop, getModelForClass, DocumentType } from '@typegoose/typegoose'

export class Award {
    @prop({ required: true, index: true })
    block: number

    @prop({ required: true })
    initiator: string

    @prop({ required: true })
    shares: string
}

export const AwardModel = getModelForClass(Award, {
    schemaOptions: { timestamps: false },
})

export async function isParticipated(login: string, fromBlock: number): Promise<Boolean> {
    return await AwardModel.countDocuments({ initiator: login, block: { $gte: fromBlock} }).exec() > 0
}
