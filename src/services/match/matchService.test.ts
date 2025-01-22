import Match from '../../models/match'
import {
  fetchMatches,
  getCumulatedBet,
  getLatestOdds,
  removeAllMatches,
  upsertMatches
} from './matchService'
import logger from '../../middleware/logger'
import mongoose from 'mongoose'
import { EventType } from '../../types/match'

jest.mock('../../middleware/logger', () => ({
  info: jest.fn(),
  error: jest.fn()
}))

jest.mock('../../models/match')

describe('removeAllMatches', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })
  it('should remove all matches and log the count', async () => {
    jest
      .spyOn(Match, 'deleteMany')
      .mockResolvedValue({ deletedCount: 5, acknowledged: true })

    await removeAllMatches()

    expect(Match.deleteMany).toHaveBeenCalledWith({})
    expect(logger.info).toHaveBeenCalledWith('5 past matches removed')
  })

  it('should log an error if deletion fails', async () => {
    const error = new Error('Database error')

    jest.spyOn(Match, 'deleteMany').mockRejectedValue(error)

    await removeAllMatches()

    expect(logger.error).toHaveBeenCalledWith(
      'Error removing past matches:',
      error
    )
  })
})

describe('getCumulatedBet', () => {
  it('should return 1 when there are no odds', () => {
    const odds = {}
    const result = getCumulatedBet(odds)
    expect(result).toBe(1)
  })

  it('should return the same value for a single odd', () => {
    const odds = { '1': 1.5 }
    const result = getCumulatedBet(odds)
    expect(result).toBe(1.5)
  })

  it('should correctly calculate the cumulated product for multiple odds', () => {
    const odds = { '1': 1.5, '2': 2, '3': 3 }
    const result = getCumulatedBet(odds)
    expect(result).toBe(9)
  })

  it('should return 1 if all odds are 1', () => {
    const odds = { '1': 1, '2': 1, '3': 1 }
    const result = getCumulatedBet(odds)
    expect(result).toBe(1)
  })

  it('should return 0 if any odd is 0', () => {
    const odds = { '1': 1.5, '2': 0, '3': 3 }
    const result = getCumulatedBet(odds)
    expect(result).toBe(0)
  })
})

describe('upsertMatches', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should upsert matches successfully', async () => {
    const matches = [
      {
        startTime: '2023-01-01T12:00:00Z',
        host: 'Team A',
        guest: 'Team B',
        league: 'Premier League',
        bookmakers: {
          bookmaker1: [1.5, 3.2, 2.8]
        }
      }
    ]

    const mockBulkWrite = jest.spyOn(Match, 'bulkWrite').mockResolvedValue({
      ok: 1,
      insertedCount: 5
    } as unknown as mongoose.mongo.BulkWriteResult)

    await upsertMatches(matches)

    expect(mockBulkWrite).toHaveBeenCalled()
    expect(logger.info).toHaveBeenCalledWith(
      'Updating database finished successfully.'
    )
  })

  it('should log an error if upserting fails', async () => {
    const matches = [
      {
        startTime: '2023-01-01T12:00:00Z',
        host: 'Team A',
        guest: 'Team B',
        league: 'Premier League',
        bookmakers: {
          bookmaker1: [1.5, 3.2, 2.8]
        }
      }
    ]

    const error = new Error('Database error')
    jest.spyOn(Match, 'bulkWrite').mockRejectedValue(error)

    await upsertMatches(matches)

    expect(logger.error).toHaveBeenCalledWith('Error upserting matches:', error)
  })
})

describe('fetchMatches', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })
  it('should fetch matches within today', async () => {
    const now = new Date()
    const endOfToday = new Date()
    endOfToday.setHours(23, 59, 59, 999)

    const league = 'Premier League'
    const bookmaker = 'bookmaker1'

    const mockFind = jest.spyOn(Match, 'find').mockResolvedValue([
      {
        _id: 'match1',
        startTime: now,
        host: 'Team A',
        guest: 'Team B',
        league: 'Premier League',
        bookmakers: {
          bookmaker1: [1.5, 3.2, 2.8]
        }
      }
    ])

    const result = await fetchMatches({ league, bookmaker })

    expect.objectContaining({
      league
    }),
      expect.objectContaining({
        _id: 1,
        startTime: 1,
        host: 1,
        guest: 1,
        league: 1,
        __v: 1,
        'bookmakers.bookmaker1': 1
      })

    expect(result).toHaveLength(1)
  })

  it('should fetch matches without a league filter', async () => {
    const mockFind = jest.spyOn(Match, 'find').mockResolvedValue([])

    const result = await fetchMatches({})

    expect(mockFind).toHaveBeenCalled()
    expect(result).toEqual([])
  })
})

describe('getLatestOdds', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })
  it('should retrieve the latest odds for the specified matches', async () => {
    const matchQuery = [
      { matchId: 'match1', bookmaker: 'bookmaker1', eventType: EventType.Home }
    ]

    const mockFind = jest.spyOn(Match, 'find').mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([
        {
          _id: 'match1',
          bookmakers: {
            bookmaker1: [
              {
                timestamp: new Date('2023-01-01T12:00:00Z'),
                odds: [1.5, 3.2, 2.8]
              },
              {
                timestamp: new Date('2023-01-01T13:00:00Z'),
                odds: [1.6, 3.1, 2.7]
              }
            ]
          }
        }
      ])
    } as unknown as any)

    const result = await getLatestOdds(matchQuery)

    expect(mockFind).toHaveBeenCalledWith({ _id: { $in: ['match1'] } })
    expect(result).toEqual({ match1: 1.6 })
  })

  it('should throw an error if a match is not found', async () => {
    const matchQuery = [
      { matchId: 'match1', bookmaker: 'bookmaker1', eventType: EventType.Home }
    ]

    jest.spyOn(Match, 'find').mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([])
    } as unknown as any)

    await expect(getLatestOdds(matchQuery)).rejects.toThrow(
      'Match with given Id not found'
    )
  })

  it('should throw an error for invalid bookmaker or event type', async () => {
    const matchQuery = [
      { matchId: 'match1', bookmaker: 'unknown', eventType: EventType.Home }
    ]

    jest.spyOn(Match, 'find').mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([
        {
          _id: 'match1',
          bookmakers: {}
        }
      ])
    } as unknown as any)

    await expect(getLatestOdds(matchQuery)).rejects.toThrow(
      'Bookmaker unknown not found for match match1'
    )
  })
})
