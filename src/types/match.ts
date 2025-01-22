export type OddEntry = {
  timestamp: Date
  odds: string[]
}

export enum BetType {
  SINGLE = 'single',
  AKO = 'ako'
}

export enum EventType {
  Home = 'home',
  Draw = 'draw',
  Guest = 'guest'
}
export type MatchBetType = {
  matchId: string
  bookmaker: string
  eventType: EventType
}

// CalculateBet types
export type CaluclateBetDto = MatchBetType

export type CalculateBetQueryType = {
  betType?: BetType
  matches?: string
}
export type CalculateBetMappedQueryType = {
  betType?: BetType
  matches?: MatchBetType[]
}
