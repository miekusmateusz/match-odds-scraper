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

export type CaluclateBetDto = {
  matchId: string
  bookmaker: string
  eventType: EventType
}
