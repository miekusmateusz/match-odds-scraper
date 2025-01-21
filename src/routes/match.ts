import express, { Request, Response } from 'express'
import Match from '../models/match'
import {
  fetchMatches,
  getCumulatedBet,
  getLatestOdds,
  removeAllMatches
} from '../services/match/matchService'
import {
  validateCalculateBetQuery,
  validateGetMatchesQuery
} from '../validators/matchValidator'
import { getFromCache, setToCache } from '../cache'
import { generateCalculateBetKey, generateGetMatchesKey } from '../cache/keys'
import logger from '../middleware/logger'

const router = express.Router()

/**
 * GET /api/matches
 * Fetches today's pending matches along with their odds history, optionally filtered by league and bookmaker.
 *
 * This route allows clients to fetch a list of matches scheduled for today that are yet to start, with the option to
 * filter by a specific league and bookmaker. If a valid cache exists for the requested parameters (league and bookmaker),
 * the cached data is returned to avoid redundant database queries. Otherwise, the matches are fetched from the database
 * and the data is cached for future requests.
 *
 * Query Parameters:
 * - `league` (optional): Filters the matches by the specified league.
 * - `bookmaker` (optional): Filters the odds by a specific bookmaker.
 *
 * @returns {Object} - A JSON response with a `data` field containing the list of matches and their odds history.
 *
 * @throws {Error} - Throws a `400` error if the query parameters are invalid, a `500` error if there is a server issue,
 *                   or an error fetching matches from the database.
 *
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // Validation
    const { error, value: validatedQuery } = validateGetMatchesQuery(req.query)
    if (error) {
      res.status(400).json({ success: false, message: error.message })
      return
    }

    // Cache
    const { league, bookmaker } = validatedQuery
    const cacheKey = generateGetMatchesKey(league, bookmaker)
    const cachedData = getFromCache(cacheKey)

    if (cachedData) {
      logger.info('Returning cached matches data')
      res.status(200).json({ data: cachedData })
      return
    }

    // Fetching data
    const result = await fetchMatches(validatedQuery)
    setToCache(cacheKey, result)

    res.status(200).json({ data: result })
  } catch (error) {
    logger.error('Error fetching matches:', error)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

/**
 * GET /api/matches/all
 * Fetch the today's pending matches with the history of odds.
 * Query Parameters:
 * - league (optional): Filter matches by league.
 * - bookmaker (optional): Filter odds by a specific bookmaker.
 */

router.get('/all', async (req: Request, res: Response) => {
  try {
    const result = await Match.find()
    res.status(200).json({ data: result })
  } catch (error) {
    console.error('Error fetching matches:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

/**
 * GET /api/calculate-bet
 * Calculates the potential return of a bet based on selected matches and bookmakers.
 *
 * This route allows clients to calculate the potential return of a bet, either as a "single" or "ako" (accumulator) bet.
 * For a "single" bet, the calculation is based on a single match, while for an "ako" bet, the calculation considers multiple
 * matches, and the cumulative odds for all selected matches are returned.
 *
 * Query Parameters:
 * - `betType` (required): Specifies the type of bet. Valid values are:
 *   - "single": A bet on a single match. You must specify:
 *     - `matches` (required): A stringified list containing exactly one object, which includes:
 *       - `matchId` (required): The unique ID of the match.
 *       - `eventType` (required): The type of event (e.g., "home", "draw", or "guest").
 *       - `bookmaker` (required): The bookmaker for the bet.
 *   - "ako" (accumulator): A bet on multiple matches. You must specify:
 *     - `matches` (required): A stringified list of match objects (at least two objects), where each object contains:
 *       - `matchId` (required): The unique ID of the match.
 *       - `eventType` (required): The type of event (e.g., "home", "draw", or "guest").
 *       - `bookmaker` (required): The bookmaker for the bet.
 *
 * @returns {Object} - A JSON response with a `bet` field containing the total potential odds for the selected matches.
 *
 * @throws {Error} - Throws a `400` error if the query parameters are invalid, a `500` error if there is a server issue,
 *                   or an error fetching odds and calculating the bet.
 *
 */
router.get('/calculate-bet', async (req: Request, res: Response) => {
  try {
    // Validation
    const { error, value: validatedQuery } = validateCalculateBetQuery(
      req.query
    )
    if (error) {
      res.status(400).json({ message: error.message })
      return
    }

    const { matches, betType } = validatedQuery

    // Cache
    const cacheKey = generateCalculateBetKey(matches, betType)
    const cachedData = getFromCache(cacheKey)

    if (cachedData) {
      logger.info('Returning cached bet calculation data')
      res.status(200).json({ bet: cachedData })
      return
    }

    // Fetching
    const odds = await getLatestOdds(matches)
    const bet = getCumulatedBet(odds)

    setToCache(cacheKey, bet)
    res.status(200).json({ bet })
  } catch (error) {
    logger.error('Error calculating bet:', error)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

export default router
