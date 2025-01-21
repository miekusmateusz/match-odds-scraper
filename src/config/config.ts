import dotenv from 'dotenv'

dotenv.config()

const config = {
  scrapeWebsiteUrl: process.env.SCRAPER_URL || 'https://www.flashscore.com',
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/bookmaker',
  port: parseInt(process.env.PORT || '5000', 10)
}

export default config
