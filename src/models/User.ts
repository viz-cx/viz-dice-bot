import { prop, getModelForClass, DocumentType } from '@typegoose/typegoose'

export type DiceEmoji = '🎲' | '🎯' | '🏀' | '⚽️' | '🎰' | '🎳'

export type UserState = 'waitLogin'

export class User {
  @prop({ required: true, index: true, unique: true })
  id: number

  @prop({ required: true, default: 'en' })
  language: string

  @prop({ required: false })
  state: UserState

  @prop({ required: true, enum: ['🎲', '🎯', '🏀', '⚽️', '🎰', '🎳'], default: '🎲' })
  game: DiceEmoji

  @prop({ required: true, default: 0 })
  value: number

  @prop({ required: true, default: 1 })
  series: number

  @prop({ required: false, unique: false })
  login: string

  @prop({ required: false })
  referrer: string

  @prop({ default: new Date(null) })
  payoutDate: Date

  @prop({ required: true, default: 1 })
  payouts: number

  // False once the user blocks/deletes the bot (Telegram returns 403 on send,
  // or a my_chat_member "kicked" update arrives). Broadcasts skip inactive
  // users; flips back to true the moment they interact again.
  @prop({ required: true, default: true })
  active: boolean
}

// Get User model
const UserModel = getModelForClass(User, {
  schemaOptions: { timestamps: true },
})

// Mongoose reserves `id` as a virtual getter returning `_id` as a string, so
// typegoose types every document's `id` as `string`. This model defines its own
// `id` path (the Telegram user id), which mongoose stores and returns as the
// declared `number` at runtime. UserDocument re-states that truth for the type
// checker so callers can keep treating `id` as the number it actually is.
export type UserDocument = Omit<DocumentType<User>, 'id'> & { id: number }

export async function findUser(id: number): Promise<UserDocument | null> {
  return (await UserModel.findOne({ id }).exec()) as unknown as UserDocument | null
}

export async function getOrCreateUser(id: number): Promise<UserDocument | null> {
  let user = await UserModel.findOne({ id })
  if (!user) {
    try {
      user = await new UserModel({ id }).save()
    } catch (err) {
      console.log(err)
      user = await UserModel.findOne({ id })
    }
  }
  return user as unknown as UserDocument | null
}

export async function getActiveUsers(afterDate: Date): Promise<UserDocument[]> {
  return (await UserModel.find({ updatedAt: { $gt: afterDate } })) as unknown as UserDocument[]
}

export async function getUsersCount(afterDate: Date = new Date(0)) {
  return await UserModel.countDocuments({ updatedAt: { $gt: afterDate } }).exec()
}

export async function getUsersByLang(lang: string): Promise<UserDocument[]> {
  // `$ne: false` keeps legacy documents that predate the `active` field
  // (where it is undefined) while excluding users known to have blocked the bot.
  return (await UserModel.find({
    language: { $eq: lang },
    active: { $ne: false },
  })) as unknown as UserDocument[]
}

// Flag a user (in)active. No upsert: a block from someone who never used the
// bot shouldn't create a record. Missing user → no-op.
export async function setUserActive(id: number, active: boolean): Promise<void> {
  await UserModel.updateOne({ id }, { $set: { active } }).exec()
}
