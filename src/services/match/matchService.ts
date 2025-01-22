import logger from '../../middleware/logger'
import Match, { MatchDTO } from '../../models/match'
import { HttpError } from '../../types/common'
import { CaluclateBetDto, EventType } from '../../types/match'

/**
 * Removes all past matches from the database.
 *
 * This function deletes all match records from the database.
 *
 * @returns {Promise<void>}
 * */
export const removeAllMatches = async (): Promise<void> => {
  try {
    const result = await Match.deleteMany({})
    logger.info(`${result.deletedCount} past matches removed`)
  } catch (error) {
    logger.error('Error removing past matches:', error)
  }
}

/**
 * Retrieves the latest recorded odds for a given set of matches.
 *
 * This function takes an array of match queries, each containing a `matchId`, a selected `bookmaker`,
 * and an `eventType` (such as "Home", "Draw", or "Guest"). It then looks up the specified matches in the database
 * and retrieves the latest odds for each match from the selected bookmaker. The odds are sorted by timestamp,
 * and the most recent odds are returned for the specified event type.
 *
 * The function returns an object where the keys are the match IDs, and the values are the latest odds for the
 * corresponding match, based on the event type requested (home, draw, or guest).
 *
 * If any match is not found or if any other issue arises (e.g., invalid bookmaker or event type), an error is thrown.
 *
 * @param {CaluclateBetDto[]} matchQuery - The array of match queries, each containing a `matchId`, `bookmaker`,
 *                                          and `eventType` to fetch the latest odds for.
 *
 * @returns {Promise<Record<string, number>>} - A promise that resolves to an object where the keys are the match IDs
 *                                              and the values are the latest odds for the specified event type.
 *
 * @throws {Error} - Throws an error if any match is not found, if the bookmaker is missing, or if an invalid event type
 *                   is specified.
 *
 */

export const getLatestOdds = async (
  matchQuery: CaluclateBetDto[]
): Promise<Record<string, number>> => {
  // Find matches by specified ids
  const matchIds = matchQuery.map((matchInfo) => matchInfo.matchId)
  const matches = await Match.find({ _id: { $in: matchIds } })
    .select('_id bookmakers')
    .lean()
    .exec()

  if (!matches || matches?.length !== matchQuery.length) {
    if (matchQuery.length === 1) {
      throw new HttpError('Match with given Id not found', 404)
    } else {
      throw new HttpError('One of the matches with given Id not found', 404)
    }
  }

  const oddsByMatch: Record<string, number> = {}

  for (const match of matches) {
    const selectedMatchQuery = matchQuery.find(
      (q) => q.matchId === match._id.toString()
    )

    if (!selectedMatchQuery) {
      throw new Error('Internal server Error')
    }

    const { bookmaker: selectedBookMaker, eventType: selectedEventType } =
      selectedMatchQuery

    const bookMakersOdds = match.bookmakers[selectedBookMaker]

    if (!bookMakersOdds) {
      throw new HttpError(
        `Bookmaker ${selectedBookMaker} not found for match ${match._id}`,
        404
      )
    }

    // Sort the odds by timestamp to get the latest odds
    bookMakersOdds.sort((a: { timestamp: Date }, b: { timestamp: Date }) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    })

    const latestOdds = bookMakersOdds[0].odds

    const eventTypeIndexMap = {
      [EventType.Home]: 0,
      [EventType.Draw]: 1,
      [EventType.Guest]: 2
    }

    const eventIndex = eventTypeIndexMap[selectedEventType]

    if (eventIndex === undefined || eventIndex === null) {
      throw new HttpError('Invalid event type', 400)
    }

    // Map the odds for the match
    oddsByMatch[match._id.toString()] = latestOdds[eventIndex]
  }

  return oddsByMatch
}

/**
 * Inserts or updates match records in the database with associated bookmaker odds.
 *
 * This function processes an array of match objects, where each match contains details such as `startTime`, `host`, 
 * `guest`, `league`, and `bookmakers`. It uses a bulk upsert operation to efficiently add new matches or update existing 
 * ones in the database. If a match with the same `startTime`, `host`, `guest`, and `league` already exists, it updates 
 * the record by appending the latest odds for each specified bookmaker. Otherwise, it creates a new record.
 *
 * The odds for each bookmaker are stored with a timestamp to maintain a history of changes. This allows tracking the 
 * evolution of odds over time.
 *
 * If the operation succeeds, a log entry is created indicating success. If an error occurs during the upsert process, 
 * an error is logged with details.
 *
 * @param {MatchDTO[]} matches - An array of match objects, each containing:
 *   - `startTime`: The start time of the match.
 *   - `host`: The name of the host team.
 *   - `guest`: The name of the guest team.
 *   - `league`: The league in which the match is played.
 *   - `bookmakers`: An object where keys are bookmaker names, and values are odds for the match.
 *
 * @returns {Promise<void>} - A promise that resolves when the bulk upsert operation completes.
 
**/

export const upsertMatches = async (matches: MatchDTO[]): Promise<void> => {
  const now = new Date()

  try {
    const bulkOps: any[] = []

    for (const match of matches) {
      const { startTime, host, guest, league, bookmakers } = match

      // Prepare the match object for upsert
      const matchData = {
        startTime,
        host,
        guest,
        league
      }

      const updateDoc = {
        $setOnInsert: matchData, // Ensure match is only inserted if not found
        $push: {} as Record<string, any> // Dynamically build $push object for bookmakers
      }

      if (bookmakers) {
        // Prepare bookmakers for the $push update
        for (const [bookmaker, odds] of Object.entries(bookmakers)) {
          updateDoc.$push[`bookmakers.${bookmaker}`] = {
            timestamp: now,
            odds
          }
        }
      }

      // Add the upsert operation to bulkOps
      bulkOps.push({
        updateOne: {
          filter: matchData,
          update: updateDoc,
          upsert: true
        }
      })
    }

    // Execute bulk write operation
    if (bulkOps.length > 0) {
      await Match.bulkWrite(bulkOps)
    }

    logger.info('Updating database finished successfully.')
  } catch (error) {
    logger.error('Error upserting matches:', error)
  }
}

/**
 * Fetches upcoming matches for the day from the database, optionally filtered by league and bookmaker.
 *
 * This function queries the Match collection for matches that have a start time between the current time
 * and the end of the day (23:59:59.999). It can be filtered by a specific league and bookmaker.
 *
 * @param {string} [league] - The league to filter matches by (optional).
 * @param {string} [bookmaker] - The bookmaker to filter the odds by (optional).
 *
 * @returns {Promise<Array>} - A promise that resolves to an array of match documents from the database.
 *
 * - The `startTime` is checked to ensure the match is happening today.
 * - If a `league` is provided, it will be added to the query to further filter the matches.
 * - If a `bookmaker` is provided, only odds for that specific bookmaker will be returned. If not, odds for all bookmakers will be included.
 *
 * Projection is used to limit the fields returned from the database. If bookmaker is present in the params, it will return odds only for the specified bookmaker
 *
 */
export const fetchMatches = async ({
  league,
  bookmaker
}: {
  league?: string
  bookmaker?: string
}) => {
  const now = new Date()
  const endOfToday = new Date()
  endOfToday.setHours(23, 59, 59, 999)

  const query: Record<string, any> = {
    startTime: { $gte: now, $lt: endOfToday }
  }

  if (league) query.league = league

  const projection: Record<string, 1 | 0> = {
    _id: 1,
    startTime: 1,
    host: 1,
    guest: 1,
    league: 1,
    __v: 1
  }

  if (bookmaker) {
    projection[`bookmakers.${bookmaker}`] = 1 // Include only the specific bookmaker
  } else {
    projection['bookmakers'] = 1
  }

  return Match.find(query, projection)
}

/**
 * Computes the cumulative value of a bet by multiplying the provided odds.
 **/
export const getCumulatedBet = (odds: Record<string, number>): number => {
  return Object.values(odds).reduce((product, value) => product * value, 1)
}
