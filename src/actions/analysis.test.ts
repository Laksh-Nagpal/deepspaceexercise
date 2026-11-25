import { expect, it } from 'vitest'
import { evidenceFor, validateAdvice } from './analysis'
import { hitter, pointVersion, type Point } from '../features/matches/model'
import { canRead } from 'deepspace/worker'
import { pointsSchema } from '../schemas/matches-schema'
const p: Point = {
  matchId: 'm',
  shotType: 'backhand',
  x: 0.4,
  y: 0.3,
  winner: 'opponent',
  outcome: 'unforced error',
  shotBy: 'player',
}
it('computes player-specific evidence and supports legacy attribution', () => {
  expect(evidenceFor([p]).find((e) => e.id === 'backhand-errors')?.value).toBe(
    '1',
  )
  expect(hitter({ ...p, shotBy: undefined })).toBe('player')
  expect(pointVersion([{ recordId: 'p', updatedAt: 'v' }])).not.toBe(
    pointVersion([]),
  )
})
it('rejects fabricated references and numeric claims from model output', () => {
  const valid = {
    recommendations: [
      {
        title: 'Build margin',
        action: 'Try a higher target when stretched.',
        evidenceIds: ['errors'],
      },
      {
        title: 'Practice under pressure',
        action: 'Test a controlled backhand target.',
        evidenceIds: ['backhand-errors'],
      },
    ],
  }
  expect(validateAdvice(valid, evidenceFor([p]))).toEqual(valid)
  expect(() =>
    validateAdvice(
      {
        recommendations: valid.recommendations.map((r) => ({
          ...r,
          evidenceIds: ['fake'],
        })),
      },
      evidenceFor([p]),
    ),
  ).toThrow()
  expect(() =>
    validateAdvice(
      {
        recommendations: valid.recommendations.map((r) => ({
          ...r,
          action: 'You lost 99 points.',
        })),
      },
      evidenceFor([p]),
    ),
  ).toThrow()
})
it('revoked coaches cannot read even their own contributed points', () => {
  const record = {
    recordId: 'p',
    createdBy: 'coach',
    data: { ownerId: 'owner', matchId: 'match' },
  }
  expect(
    canRead(pointsSchema, 'member', record, 'coach', {
      isTeamMember: () => true,
    }),
  ).toBe(true)
  expect(
    canRead(pointsSchema, 'member', record, 'coach', {
      isTeamMember: () => false,
    }),
  ).toBe(false)
  expect(
    canRead(pointsSchema, 'member', record, 'owner', {
      isTeamMember: () => false,
    }),
  ).toBe(true)
})
