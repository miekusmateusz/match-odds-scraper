import mongoose from 'mongoose'
import config from './config'
import logger from '../middleware/logger'

const connectDB = async (): Promise<void> => {
  try {
    const dbUri = config.mongoUri
    await mongoose.connect(dbUri)
    logger.info('MongoDB connected successfully')
  } catch (error) {
    logger.error('Error connecting to MongoDB:', error)
    process.exit(1)
  }
}

export default connectDB
