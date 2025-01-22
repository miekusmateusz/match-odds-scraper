import { mapAvailableBookmakerName, extractLeagueName } from './scraperHelper'

describe('scraperHelper', () => {
  describe('mapAvailableBookmakerName', () => {
    it('should map bookmaker names to their indexed strings', () => {
      expect(mapAvailableBookmakerName('eFortuna.pl')).toBe('eFortuna')
      expect(mapAvailableBookmakerName('STS.pl')).toBe('STS')
      expect(mapAvailableBookmakerName('Betclic.pl')).toBe('Betclic')
      expect(mapAvailableBookmakerName('BETFAN')).toBe('BETFAN')
      expect(mapAvailableBookmakerName('LV BET')).toBe('LV_BET')
      expect(mapAvailableBookmakerName('Superbet.pl')).toBe('Superbet')
    })

    it('should return the same name if not mapped', () => {
      expect(mapAvailableBookmakerName('x')).toBe('x')
    })
  })

  describe('extractLeagueName', () => {
    it('should correctly extract country and league name', () => {
      expect(extractLeagueName('England: Premier League - 2023')).toBe(
        'England_Premier_League'
      )
      expect(extractLeagueName('Spain: La Liga - 2023')).toBe('Spain_La_Liga')
      expect(extractLeagueName('Germany: Bundesliga')).toBe(
        'Germany_Bundesliga'
      )
    })

    it('should return the input if no colon is found', () => {
      expect(extractLeagueName('NoColonInput')).toBe('NoColonInput')
    })

    it('should handle cases with only country and league', () => {
      expect(extractLeagueName('Italy: Serie A')).toBe('Italy_Serie_A')
    })
  })
})
