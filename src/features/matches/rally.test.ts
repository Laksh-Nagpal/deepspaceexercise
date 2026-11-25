import { expect, it } from 'vitest'
import {
  pointInput,
  rallyError,
  rallyStats,
  playerSummary,
  shotsOf,
  type Point,
  type Shot,
} from './model'
const rally: Shot[] = [
  { shotType: 'serve', shotBy: 'player', x: 0.6, y: 0.3 },
  { shotType: 'backhand', shotBy: 'opponent', x: 0.4, y: 0.7 },
  { shotType: 'forehand', shotBy: 'player', x: 0.3, y: 0.2 },
]
const point: Point = {
  ...rally[2],
  matchId: 'match',
  winner: 'player',
  outcome: 'winner',
  rally,
}
it('counts one point for multiple shots and includes buildup in the shot distribution', () => {
  expect(rallyError(point)).toBeNull()
  expect(playerSummary([point])).toMatchObject({
    total: 1,
    won: 1,
    playerWinners: 1,
    playerShots: [
      { type: 'forehand', count: 1 },
      { type: 'backhand', count: 0 },
      { type: 'serve', count: 1 },
      { type: 'volley', count: 0 },
    ],
  })
  expect(rallyStats([point])).toMatchObject({
    recorded: 1,
    totalShots: 3,
    average: 3,
    setupRight: 1,
  })
})
it('rejects invalid ordering, terminal mismatch, empty rallies and excessive rallies', () => {
  expect(
    rallyError({
      ...point,
      rally: [rally[0], { ...rally[1], shotBy: 'player' }, rally[2]],
    }),
  ).toContain('alternate')
  expect(
    rallyError({
      ...point,
      rally: [rally[0], { ...rally[1], shotType: 'serve' }, rally[2]],
    }),
  ).toContain('serve')
  expect(rallyError({ ...point, x: 0.9 })).toContain('match the last shot')
  expect(pointInput.safeParse({ ...point, rally: [] }).success).toBe(false)
  expect(
    pointInput.safeParse({
      ...point,
      rally: Array.from({ length: 101 }, () => rally[0]),
    }).success,
  ).toBe(false)
})
it('does not invent legacy rally lengths or setup locations', () => {
  const legacy = { ...point, rally: undefined }
  expect(shotsOf(legacy)).toHaveLength(1)
  expect(rallyStats([legacy])).toMatchObject({
    recorded: 0,
    legacy: 1,
    average: null,
    totalShots: 1,
    setupLeft: 0,
    setupRight: 0,
  })
  expect(rallyStats([legacy, point])).toMatchObject({
    recorded: 1,
    legacy: 1,
    average: 3,
    totalShots: 4,
  })
})
