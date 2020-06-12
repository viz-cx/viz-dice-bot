// Dependencies
import { prop, getModelForClass } from '@typegoose/typegoose'
import { DiceEmoji } from 'telegraf/typings/telegram-types'

export class User {
  @prop({ required: true, index: true, unique: true })
  id: number

  @prop({ required: true, default: 'en' })
  language: string

  @prop({ required: true, enum: ['🎲', '🎯', '🏀'], default: '🎲'})
  game: DiceEmoji
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
