import * as mongoose from 'mongoose'

// Connect to mongoose
mongoose.connect(process.env.MONGO)

// Export models
export * from './User'
export * from './Lottery'
