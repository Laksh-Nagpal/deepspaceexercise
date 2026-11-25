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
export const shotInput = z
  .object({
    shotType: z.enum(shotTypes),
    shotBy: z.enum(['player', 'opponent']),
    x: z.number().finite().min(0).max(1),
    y: z.number().finite().min(0).max(1),
  })
  .strict()
export type Shot = z.infer<typeof shotInput>
export const ANALYSIS_VERSION = 'rally-v2'
export const pointInput = z
  .object({
    matchId: z.string().min(1).max(100),
    shotType: z.enum(shotTypes),
    winner: z.enum(['player', 'opponent']),
    shotBy: z.enum(['player', 'opponent']).optional(),
    requestId: z.string().uuid().optional(),
    outcome: z.enum(outcomes),
    rally: z.array(shotInput).min(1).max(100).optional(),
    x: z.number().finite().min(0).max(1),
    y: z.number().finite().min(0).max(1),
  })
  .strict()
export type Match = z.infer<typeof matchInput> & {
  teamId?: string
  status?: 'completed' | 'tracking'
}
export type Point = z.infer<typeof pointInput>

/** One row = one completed point, irrespective of the number of recorded shots. */
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
      count: points.flatMap(shotsOf).filter((p) => p.shotType === type).length,
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
  const allOwnShots = points
    .flatMap(shotsOf)
    .filter((s) => s.shotBy === 'player')
  return {
    ...summarize(points),
    playerWinners: own.filter((p) => p.outcome === 'winner').length,
    playerErrors: own.filter((p) => p.outcome === 'unforced error').length,
    playerShots: shotTypes.map((type) => ({
      type,
      count: allOwnShots.filter((p) => p.shotType === type).length,
    })),
  }
}

export function pointVersion(
  records: { recordId: string; updatedAt: string }[],
) {
  return (
    ANALYSIS_VERSION +
    ':' +
    records
      .map((r) => `${r.recordId}:${r.updatedAt}`)
      .sort()
      .join('|')
  )
}

/** Old records retain a single known finishing shot; their missing buildup is never invented. */
export function shotsOf(p: Point): Shot[] {
  return Array.isArray(p.rally) && p.rally.length
    ? p.rally
    : [{ shotBy: hitter(p), shotType: p.shotType, x: p.x, y: p.y }]
}
export function rallyStats(points: Point[]) {
  const recorded = points.filter(
    (p) => Array.isArray(p.rally) && p.rally.length > 0,
  )
  const long = recorded.filter((p) => p.rally!.length >= 5)
  const setups = recorded
    .filter(
      (p) =>
        p.winner === 'player' && p.outcome === 'winner' && p.rally!.length >= 3,
    )
    .map((p) =>
      p
        .rally!.slice(0, -1)
        .filter((s) => s.shotBy === 'player')
        .at(-1),
    )
    .filter((s): s is Shot => !!s)
  return {
    recorded: recorded.length,
    legacy: points.length - recorded.length,
    totalShots: points.flatMap(shotsOf).length,
    average: recorded.length
      ? Number(
          (
            recorded.reduce((sum, p) => sum + p.rally!.length, 0) /
            recorded.length
          ).toFixed(1),
        )
      : null,
    longTotal: long.length,
    longWon: long.filter((p) => p.winner === 'player').length,
    setupLeft: setups.filter((s) => s.x < 0.5).length,
    setupRight: setups.filter((s) => s.x >= 0.5).length,
  }
}
/** Metadata duplicates the terminal shot for compatibility, so enforce exact agreement. */
export function rallyError(p: Point): string | null {
  if (!p.rally?.length) return null
  for (let i = 1; i < p.rally.length; i++) {
    if (p.rally[i].shotBy === p.rally[i - 1].shotBy)
      return 'Rally hitters must alternate. Undo the last shot to correct the sequence.'
    if (p.rally[i].shotType === 'serve')
      return 'A serve can only start a rally. Record only the serve that starts play.'
  }
  const last = p.rally.at(-1)!
  return last.shotBy !== hitter(p) ||
    last.shotType !== p.shotType ||
    last.x !== p.x ||
    last.y !== p.y
    ? 'The finishing-shot fields must match the last shot of the rally.'
    : null
}
