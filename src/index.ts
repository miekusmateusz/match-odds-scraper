import dotenv from 'dotenv'
import express from 'express'
import connectDB from './config/database'
import './crone/index'
import logger from './middleware/logger'
import routes from './routes'

dotenv.config() // Load environment variables from .env

// Initialize the Express app
const app = express()

app.use((req, res, next) => {
  logger.info(`Incoming request: ${req.method} ${req.url}`)
  next()
})

app.use(express.json())

app.use('/api', routes)

const startServer = async (): Promise<void> => {
  try {
    await connectDB()
    const PORT = process.env.PORT
    app.listen(PORT, () => {
      logger.info(`Server running on http://localhost:${PORT}`)
    })
  } catch (error) {
    logger.error('Failed to start server:', error)
  }
}

startServer()
