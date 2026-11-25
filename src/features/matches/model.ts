import { z } from 'zod'

export const shotTypes = ['forehand', 'backhand', 'serve', 'volley'] as const
export const outcomes = ['winner', 'forced error', 'unforced error'] as const
export const matchInput = z
  .object({
    player: z.string().trim().min(1, 'Enter your player name.').max(80),
    opponent: z.string().trim().min(1, 'Enter your opponent’s name.').max(80),
    details: z.string().trim().max(500).default(''),
  })
  .strict()
export const pointInput = z
  .object({
    matchId: z.string().min(1).max(100),
    shotType: z.enum(shotTypes),
    winner: z.enum(['player', 'opponent']),
    shotBy: z.enum(['player', 'opponent']).optional(),
    requestId: z.string().uuid().optional(),
    outcome: z.enum(outcomes),
    x: z.number().finite().min(0).max(1),
    y: z.number().finite().min(0).max(1),
  })
  .strict()
export type Match = z.infer<typeof matchInput> & {
  teamId?: string
  status?: 'completed' | 'tracking'
}
export type Point = z.infer<typeof pointInput>

/** One row = one point's finishing shot. These are counts, never AI estimates. */
export function summarize(points: Point[]) {
  const won = points.filter((p) => p.winner === 'player').length
  return {
    total: points.length,
    won,
    lost: points.length - won,
    winRate: points.length ? Math.round((won / points.length) * 100) : 0,
    winners: points.filter((p) => p.outcome === 'winner').length,
    errors: points.filter((p) => p.outcome === 'unforced error').length,
    shots: shotTypes.map((type) => ({
      type,
      count: points.filter((p) => p.shotType === type).length,
    })),
  }
}

/** Legacy finishing shots have an unambiguous attribution from the recorded outcome. */
export function hitter(p: Point): 'player' | 'opponent' {
  return (
    p.shotBy ??
    (p.outcome === 'winner'
      ? p.winner
      : p.winner === 'player'
        ? 'opponent'
        : 'player')
  )
}
export function playerSummary(points: Point[]) {
  const own = points.filter((p) => hitter(p) === 'player')
  return {
    ...summarize(points),
    playerWinners: own.filter((p) => p.outcome === 'winner').length,
    playerErrors: own.filter((p) => p.outcome === 'unforced error').length,
    playerShots: shotTypes.map((type) => ({
      type,
      count: own.filter((p) => p.shotType === type).length,
    })),
  }
}

export function pointVersion(
  records: { recordId: string; updatedAt: string }[],
) {
  return records
    .map((r) => `${r.recordId}:${r.updatedAt}`)
    .sort()
    .join('|')
}
