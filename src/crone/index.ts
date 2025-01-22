import cron from 'node-cron'

import { FlashscoreScraperService } from '../services/playwrightScraper'
import logger from '../middleware/logger'
import { removeAllMatches } from '../services/match/matchService'

const scraperService = new FlashscoreScraperService()

// scraperService.scrapeMatchCroneJob()

// Schedule the cron scraping job to run every 30 minutes
cron.schedule('*/30 * * * *', async () => {
  logger.info(`Running scheduled scraping task...`)
  try {
    await scraperService.scrapeMatchCroneJob()
  } catch (error) {
    logger.error('Error occurred during the scraping task:', error)
  }
})

// Clearing the state of database at the end of the day (23:59)
cron.schedule('59 59 23 * * *', async () => {
  logger.info('Clearing the state of database at the end of the day')
  await removeAllMatches()
  await scraperService.scrapeMatchCroneJob()
})

// Job to run at the beginning of the day (00:01:00)
cron.schedule('1 0 0 * * *', async () => {
  await scraperService.scrapeMatchCroneJob()
})
