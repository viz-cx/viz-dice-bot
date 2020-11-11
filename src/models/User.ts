import { prop, getModelForClass } from '@typegoose/typegoose'
import { DiceEmoji } from 'telegraf/typings/telegram-types'
import { AES, enc } from 'crypto-js'

export type UserState =
  'empty'
  | 'waitLogin'
  | 'waitPostingKey'

export class User {
  @prop({ required: true, index: true, unique: true })
  id: number

  @prop({ required: true, default: 'en' })
  language: string

  @prop({ required: true, default: 'empty' })
  state: UserState

  @prop({ required: true, enum: ['🎲', '🎯', '🏀', '⚽️', '🎰'], default: '🎲' })
  game: DiceEmoji

  @prop({ required: true, default: 0 })
  value: number

  @prop({ required: true, default: 1 })
  series: number

  @prop({ required: false, unique: false })
  login: string

  @prop({
    required: false, unique: false,
    // encryption in case of leaking database
    set: (val: string) => (!val || val.length == 0) ? '' : AES.encrypt(val, process.env.SECRET).toString(),
    get: (val: string) => (!val || val.length == 0) ? '' : AES.decrypt(val, process.env.SECRET).toString(enc.Utf8)
  })
  postingKey: string

  @prop({ required: false })
  referrer: string
}

// Get User model
const UserModel = getModelForClass(User, {
  schemaOptions: { timestamps: true },
})

// Get or create user
export async function findUser(id: number) {
  let user = await UserModel.findOne({ id })
  if (!user) {
    try {
      user = await new UserModel({ id }).save()
    } catch (err) {
      console.log(err)
      user = await UserModel.findOne({ id })
    }
  }
  return user
}

export async function getActiveUsers(afterDate: Date) {
  return await UserModel.find({ updatedAt: { $gte: afterDate } })
}
