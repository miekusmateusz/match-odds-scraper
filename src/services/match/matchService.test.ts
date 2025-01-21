import { getCumulatedBet, removeAllMatches } from './matchService'

import logger from '../../middleware/logger'
import Match from '../../models/match'

jest.mock('../../middleware/logger')
jest.mock('../../models/match')

describe('removeAllMatches', () => {
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
