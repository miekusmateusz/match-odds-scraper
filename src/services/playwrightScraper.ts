import { Browser, chromium, Page } from 'playwright'
import {
  extractLeagueName,
  mapAvailableBookmakerName
} from '../utils/scraperHelper'
import logger from '../middleware/logger'
import config from '../config/config'
import { upsertMatches } from './match/matchService'
import { MatchDTO } from '../models/match'

export class FlashscoreScraperService {
  private baseUrl: string
  private browser: Browser | null = null

  constructor() {
    this.baseUrl = config.scrapeWebsiteUrl
  }

  /**
   * Initialize the browser.
   */
  private async initBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await chromium.launch({ headless: true })
    }
    return this.browser
  }

  /**
   * Close the browser.
   */
  public async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }

  /**
   * Maps scrapped string date to Date format
   */
  private mapDate(scrappedDate: string | null) {
    if (scrappedDate) {
      const [day, month, yearAndTime] = scrappedDate.split('.')
      const [year, time] = yearAndTime.split(' ')

      return new Date(`${year}-${month}-${day}T${time}:00`)
    }
    return null
  }

  /**
   * Extract match data from a given match URL.
   */
  private async scrapeMatchData(
    page: Page,
    matchUrl: string
  ): Promise<MatchDTO | null> {
    await page.goto(matchUrl, { waitUntil: 'domcontentloaded' })

    await page.waitForSelector('.duelParticipant__startTime', {
      timeout: 15000
    })

    const startTimeText = await page
      .locator('.duelParticipant__startTime')
      .textContent()

    const startTime = this.mapDate(startTimeText)

    const hostName = await page
      .locator('.duelParticipant__home .participant__participantNameWrapper')
      .textContent()
    const guestName = await page
      .locator('.duelParticipant__away .participant__participantNameWrapper')
      .textContent()

    const leagueName = await page
      .locator('.tournamentHeader__country')
      .textContent()

    const oddsButton = await page.locator('button', { hasText: 'Odds' })
    const bookmakers: Record<string, string[]> = {}

    const isOddsButtonVisible = await oddsButton.isVisible()

    const tableWrapperClass = isOddsButtonVisible
      ? '.oddsTab__tableWrapper'
      : '.oddsRowContent'

    const rowClass = isOddsButtonVisible
      ? '.oddsTab__tableWrapper .ui-table__row'
      : '.oddsRowContent .odds'

    const bookMakerClass = isOddsButtonVisible
      ? '.oddsCell__bookmaker a'
      : '.bookmaker a'

    const oddsClass = isOddsButtonVisible
      ? '.oddsCell__odd span'
      : '.cellWrapper .oddsValueInner'

    // If there is oddsButton available scrape multiple odds from Odds tab
    if (isOddsButtonVisible) {
      await oddsButton.click()
    }

    await page.waitForSelector(tableWrapperClass, { timeout: 15000 })

    const rows = page.locator(rowClass)

    const rowCount = await rows.count()
    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i)

      const bookmakerName = await row
        .locator(bookMakerClass)
        .getAttribute('title')

      const oddsElements = row.locator(oddsClass)
      const oddsCount = await oddsElements.count()

      const oddsValues: string[] = []

      for (let j = 0; j < oddsCount; j++) {
        const oddValue = await oddsElements.nth(j).textContent()
        if (oddValue) oddsValues.push(oddValue.trim())
      }

      if (oddsValues.length === 0) break

      if (bookmakerName) {
        const mappedBookmakerName = mapAvailableBookmakerName(bookmakerName)
        bookmakers[mappedBookmakerName] = oddsValues
      }
    }

    if (Object.keys(bookmakers).length === 0) return null

    return {
      startTime,
      host: hostName?.trim() || null,
      guest: guestName?.trim() || null,
      league: leagueName?.trim() ? extractLeagueName(leagueName?.trim()) : null,
      bookmakers
    }
  }

  /**
   * Scrape scheduled match links from website.
   */
  public async scrapeMatches(matchLinks: string[]): Promise<MatchDTO[]> {
    logger.info(`Scraping matches data for: ${matchLinks.length} links`)

    const browser = await this.initBrowser()
    const page: Page = await browser.newPage()

    const results: any[] = []
    try {
      for (const matchLink of matchLinks) {
        try {
          const matchData = await this.scrapeMatchData(page, matchLink)
          if (matchData) results.push(matchData)
        } catch (error) {
          logger.error(`Error scraping match URL ${matchLink}:`, error)
        }
      }
    } catch (error) {
      logger.error('Error during match scraping:', error)
    } finally {
      await page.close()
      await this.closeBrowser()
    }

    logger.info('Scraping matches completed successfully.')
    return results
  }

  /**
   * Scrape scheduled match links from given website.
   */
  public async getScheduledLinks(): Promise<string[]> {
    const browser = await this.initBrowser()
    const page: Page = await browser.newPage()

    // function obtaining hrefs of matches
    const getHrefsOfMatches = async () => {
      const matchLinks: string[] = []

      const matchDivs = await page.locator('.event__match')
      const matchCount = await matchDivs.count()

      for (let j = 0; j < matchCount; j++) {
        const matchDiv = matchDivs.nth(j)

        const href = await matchDiv.locator('a[href]').getAttribute('href')

        if (href) {
          matchLinks.push(href)
        }
      }
      return matchLinks
    }

    try {
      logger.info(`Starting scraping matches links`)

      await page.goto(this.baseUrl, { waitUntil: 'domcontentloaded' })

      await page.waitForSelector('.filters__tab', { timeout: 15000 })

      // Find and click Scheduled tab to see pending matches
      const scheduledTab = await page
        .locator('.filters__tab', { hasText: 'Scheduled' })
        .first()
      if (await scheduledTab.isVisible()) {
        await scheduledTab.click()
      } else {
        throw new Error('Scheduled tab not found.')
      }
      await page.waitForTimeout(3000)

      // Obtain first batch of links
      const firstBatchMatchLinks = await getHrefsOfMatches()

      // Click all header buttons to hide already clicked ones and open unclicked ones
      const headerButtons = await page.locator(
        'button[data-testid="wcl-accordionButton"]'
      )

      const buttonCount = await headerButtons.count()

      for (let i = 0; i < buttonCount; i++) {
        const header = headerButtons.nth(i)

        await header.click()
        await page.waitForTimeout(100)
      }
      await page.waitForTimeout(500)

      // Obtain second batch of links
      const secondBatchMatchLinks = await getHrefsOfMatches()

      logger.info(
        `Found ${firstBatchMatchLinks.length + secondBatchMatchLinks.length} links".`
      )

      return [...firstBatchMatchLinks, ...secondBatchMatchLinks]
    } catch (error) {
      logger.error('Error while scraping:', error)
      return []
    } finally {
      await page.close()
      await this.closeBrowser()
    }
  }

  /**
   * Perform scraping of matches and saving them to the database
   */
  public async scrapeMatchCroneJob(): Promise<void> {
    logger.info('Scraping crone job started.')

    const links = await this.getScheduledLinks()
    const results = await this.scrapeMatches(links)
    await this.closeBrowser()

    if (results.length) {
      logger.info(`Updating database with ${results.length} entries started.`)
      await upsertMatches(results)
    } else {
      logger.info('No relevant match data found.')
    }
  }
}
