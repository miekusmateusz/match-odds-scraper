/**
 * Maps scraped bookmaker name to indexable string
 */
export const mapAvailableBookmakerName = (bookmaker: string): string => {
  const bookmakerMap: Record<string, string> = {
    'eFortuna.pl': 'eFortuna',
    'STS.pl': 'STS',
    'Betclic.pl': 'Betclic',
    BETFAN: 'BETFAN',
    'LV BET': 'LV_BET',
    'Superbet.pl': 'Superbet'
  }

  return bookmakerMap[bookmaker] || bookmaker
}

/**
 * Extracts country and league name from scraped data
 */
export function extractLeagueName(input: string): string {
  const parts = input.split(':')

  if (parts.length < 2) {
    return input
  }

  const country = parts[0].trim()
  const rest = parts[1].trim()

  const league = rest.split('-')[0].trim().replace(/\s+/g, '_')

  return country && league ? `${country}_${league}` : input
}
