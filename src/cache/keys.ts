import { BetType, CaluclateBetDto } from '../types/match'

export const generateGetMatchesKey = (
  league?: string,
  bookmaker?: string
): string => {
  return `matches_${league || 'all'}_${bookmaker || 'all'}`
}

export const generateCalculateBetKey = (
  matches: CaluclateBetDto[],
  betType: BetType
): string => {
  const sortedMatches = matches.sort((a, b) =>
    a.matchId.localeCompare(b.matchId)
  )

  const betKey = sortedMatches
    .map((bet) => `${bet.matchId}_${bet.bookmaker}_${bet.eventType}`)
    .join('_')

  return `${betType}_${betKey}`
}
