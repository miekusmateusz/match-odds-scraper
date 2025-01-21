import mongoose from 'mongoose'

interface IOddsHistory {
  timestamp: Date
  odds: number[]
}

interface IMatch extends Document {
  startTime: string
  host: string
  guest: string
  league: string
  bookmakers: Record<string, IOddsHistory[]>
}

const matchSchema = new mongoose.Schema({
  startTime: { type: String, required: true },
  host: { type: String, required: true },
  guest: { type: String, required: true },
  league: { type: String, required: true },
  bookmakers: {
    type: Map,
    of: [
      {
        timestamp: { type: Date, required: true },
        odds: { type: [Number], required: true }
      }
    ]
  }
})

const Match = mongoose.model<IMatch>('Match', matchSchema)

export default Match
