import { describe, expect, it } from 'vitest'
import { matchInput, pointInput, summarize, type Point } from './model'
const point: Point = {
  matchId: 'match-1',
  x: 0.5,
  y: 0.3,
  shotType: 'forehand',
  winner: 'player',
  outcome: 'winner',
}
describe('match input and deterministic statistics', () => {
  it('validates names, coordinates, enum values and unexpected fields', () => {
    expect(matchInput.safeParse({ player: ' ', opponent: 'B' }).success).toBe(
      false,
    )
    expect(pointInput.safeParse({ ...point, x: 1.1 }).success).toBe(false)
    expect(pointInput.safeParse({ ...point, shotType: 'smash' }).success).toBe(
      false,
    )
    expect(
      pointInput.safeParse({ ...point, createdBy: 'someone-else' }).success,
    ).toBe(false)
  })
  it('counts both players and outcomes without inventing statistics', () => {
    expect(summarize([])).toMatchObject({
      total: 0,
      won: 0,
      lost: 0,
      winRate: 0,
    })
    expect(
      summarize([
        point,
        {
          ...point,
          winner: 'opponent',
          outcome: 'unforced error',
          shotType: 'backhand',
        },
        { ...point, outcome: 'forced error' },
      ]),
    ).toMatchObject({
      total: 3,
      won: 2,
      lost: 1,
      winRate: 67,
      winners: 1,
      errors: 1,
      shots: [
        { type: 'forehand', count: 2 },
        { type: 'backhand', count: 1 },
        { type: 'serve', count: 0 },
        { type: 'volley', count: 0 },
      ],
    })
  })
})
