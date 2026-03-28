import * as mongoose from 'mongoose'

// Connect to mongoose
void mongoose.connect(process.env.MONGO)

// Export models
export * from './User'
export * from './Lottery'
