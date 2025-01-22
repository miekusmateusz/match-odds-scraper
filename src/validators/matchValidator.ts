import Joi from 'joi'
import { HttpError } from '../types/common'
import {
  BetType,
  CalculateBetMappedQueryType,
  CalculateBetQueryType,
  EventType
} from '../types/match'

export const validateGetMatchesQuery = (query: any) => {
  const schema = Joi.object({
    league: Joi.string().optional(),
    bookmaker: Joi.string().optional()
  })

  return schema.validate(query)
}

const calculateBetQuerySchema = Joi.object<
  Required<CalculateBetMappedQueryType>
>({
  betType: Joi.string().valid(BetType.SINGLE, BetType.AKO).required().messages({
    'any.required': 'Bet type is required',
    'string.valid': "Bet type must be either 'single' or 'ako'"
  }),

  matches: Joi.array()
    .when('betType', {
      is: BetType.AKO,
      then: Joi.array()
        .items(
          Joi.object({
            matchId: Joi.string().required(),
            eventType: Joi.valid(
              EventType.Home,
              EventType.Draw,
              EventType.Guest
            ).required(),
            bookmaker: Joi.string().required()
          })
        )
        .min(2)
        .required()
        .custom((value, helpers) => {
          const matchIds = value.map(
            (item: { matchId: string }) => item.matchId
          )
          const uniqueMatchIds = new Set(matchIds)
          if (uniqueMatchIds.size !== matchIds.length) {
            return helpers.message({
              custom: 'Match IDs must be unique for AKO bets'
            })
          }
          return value
        })
    })
    .when('betType', {
      is: BetType.SINGLE,
      then: Joi.array()
        .items(
          Joi.object({
            matchId: Joi.string().required(),
            eventType: Joi.valid(
              EventType.Home,
              EventType.Draw,
              EventType.Guest
            ).required(),
            bookmaker: Joi.string().required()
          })
        )
        .length(1)
        .required()
    })
    .required()
})

export const validateCalculateBetQuery = (
  query: CalculateBetQueryType
): Joi.ValidationResult<Required<CalculateBetMappedQueryType>> => {
  const { betType, matches } = query

  let mappedQuery: CalculateBetMappedQueryType = { betType: betType }

  if (matches) {
    try {
      const matchesArray = JSON.parse(decodeURIComponent(matches))
      if (!Array.isArray(matchesArray)) {
        throw Error
      }
      mappedQuery = { ...mappedQuery, matches: matchesArray }
    } catch {
      throw new HttpError('Matches parameter should be of an array type', 400)
    }
  }

  return calculateBetQuerySchema.validate(mappedQuery)
}
