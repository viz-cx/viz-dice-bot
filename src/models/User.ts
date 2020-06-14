import { prop, getModelForClass } from '@typegoose/typegoose'
import { DiceEmoji } from 'telegraf/typings/telegram-types'

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

  @prop({ required: true, enum: ['🎲', '🎯', '🏀'], default: '🎲' })
  game: DiceEmoji

  @prop({ required: true, default: 0 })
  value: number

  @prop({ required: true, default: 1 })
  series: number

  @prop({ required: false, unique: true })
  login: string

  @prop({ required: false, unique: false })
  postingKey: string
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
